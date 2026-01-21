/**
 * sync_managers.js - Синхронизация менеджеров из Bitrix24
 * 
 * Автоматическое обновление списка менеджеров из подразделения "Отдел продаж BIZGIFT™"
 * + все дочерние подразделения (рекурсивно)
 */

// Кэш для department IDs (сутки)
var DEPT_CACHE_KEY = 'cachedSalesDeptIds';
var DEPT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа в миллисекундах

function syncManagers() {
  Logger.log('syncManagers: start');
  
  // 1. Получить ID отдела продаж (с кэшем)
  var salesDeptIds = getCachedSalesDeptIds();
  
  // 2. Получить активных пользователей этих отделов
  var salesManagers = getSalesManagersFromBitrix(salesDeptIds);
  
  Logger.log('syncManagers: found ' + salesManagers.length + ' managers');
  
  // 3. Обновить лист Managers
  updateManagersSheet(salesManagers);
  
  Logger.log('syncManagers: complete');
}

/**
 * Получить ID отдела продаж + дочерние (с кэшем)
 */
function getCachedSalesDeptIds() {
  var props = PropertiesService.getScriptProperties();
  var cached = props.getProperty(DEPT_CACHE_KEY);
  
  if (cached) {
    var data = JSON.parse(cached);
    var age = new Date().getTime() - data.timestamp;
    
    if (age < DEPT_CACHE_TTL) {
      Logger.log('Using cached department IDs: ' + data.ids.join(', '));
      return data.ids;
    }
  }
  
  // Кэш устарел или отсутствует — запрашиваем заново
  Logger.log('Fetching department IDs from Bitrix24...');
  
  var allDepts = bitrixListAll('department.get', {});
  Logger.log('Total departments: ' + allDepts.length);
  
  // Найти родительский отдел "Отдел продаж BIZGIFT™"
  var salesDept = allDepts.find(function(d) { 
    return d.NAME === 'Отдел продаж BIZGIFT™'; 
  });
  
  if (!salesDept) {
    throw new Error('Department "Отдел продаж BIZGIFT™" not found!');
  }
  
  var salesDeptId = Number(salesDept.ID);
  Logger.log('Found sales department ID: ' + salesDeptId);
  
  // Рекурсивно собрать все дочерние отделы
  var allSalesIds = getChildDepts(salesDeptId, allDepts);
  Logger.log('Sales department hierarchy: ' + allSalesIds.join(', '));
  
  // Сохранить в кэш
  props.setProperty(DEPT_CACHE_KEY, JSON.stringify({
    ids: allSalesIds,
    timestamp: new Date().getTime()
  }));
  
  return allSalesIds;
}

/**
 * Рекурсивно собрать ID дочерних отделов
 */
function getChildDepts(parentId, allDepts) {
  var result = [parentId];
  
  allDepts.forEach(function(d) {
    if (Number(d.PARENT) === parentId) {
      var childIds = getChildDepts(Number(d.ID), allDepts);
      result = result.concat(childIds);
    }
  });
  
  return result;
}

/**
 * Получить менеджеров из Bitrix24
 */
function getSalesManagersFromBitrix(salesDeptIds) {
  // Получаем всех активных пользователей (минимальный select)
  var allUsers = bitrixListAll('user.get', {
    filter: { ACTIVE: true },
    select: ['ID', 'NAME', 'LAST_NAME', 'UF_DEPARTMENT']
  });
  
  Logger.log('Total active users in Bitrix24: ' + allUsers.length);
  
  // Фильтруем по пересечению UF_DEPARTMENT с salesDeptIds
  var managers = [];
  
  allUsers.forEach(function(u) {
    var userDepts = u.UF_DEPARTMENT || [];
    if (!Array.isArray(userDepts)) {
      userDepts = [userDepts];
    }
    
    // Проверка пересечения массивов
    var isSalesManager = userDepts.some(function(dId) {
      return salesDeptIds.indexOf(Number(dId)) !== -1;
    });
    
    if (isSalesManager) {
      managers.push({
        manager_id: Number(u.ID),
        manager_name: (u.NAME + ' ' + u.LAST_NAME).trim(),
        is_active: true,
        department_ids: userDepts.map(Number).join(','),
        last_updated: new Date()
      });
    }
  });
  
  return managers;
}

/**
 * Обновить лист Managers (upsert)
 */
function updateManagersSheet(managers) {
  var sh = getSheet('Managers');
  initManagersHeader();
  
  var data = sh.getDataRange().getValues();
  var header = data[0];
  
  // Индекс колонок
  var idx = {};
  for (var i = 0; i < header.length; i++) {
    idx[String(header[i]).toLowerCase()] = i;
  }
  
  // Карта существующих менеджеров
  var existingMap = {};
  for (var r = 1; r < data.length; r++) {
    var id = Number(data[r][idx.manager_id]);
    if (id) {
      existingMap[id] = r + 1; // row number (1-indexed)
    }
  }
  
  var rowsToAppend = [];
  
  // Обновляем существующих или добавляем новых
  managers.forEach(function(m) {
    var row = [
      m.manager_id,
      m.manager_name,
      m.is_active,
      m.department_ids,
      m.last_updated
    ];
    
    var existingRow = existingMap[m.manager_id];
    if (existingRow) {
      // Обновить существующую строку
      sh.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      // Новый менеджер
      rowsToAppend.push(row);
    }
  });
  
  // Массово добавить новых
  if (rowsToAppend.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
      .setValues(rowsToAppend);
  }
  
  // Деактивировать тех, кого нет в новом списке (опционально)
  var activeIds = managers.map(function(m) { return m.manager_id; });
  
  for (var r = 1; r < data.length; r++) {
    var id = Number(data[r][idx.manager_id]);
    if (id && activeIds.indexOf(id) === -1) {
      // Менеджер больше не в списке активных — пометить is_active=false
      sh.getRange(r + 1, idx.is_active + 1).setValue(false);
    }
  }
  
  Logger.log('updateManagersSheet: updated/added ' + managers.length + ' managers');
}

/**
 * Manual cache reset (use if department structure changes)
 */
function resetDeptCache() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty(DEPT_CACHE_KEY);
  Logger.log('Department cache cleared successfully');
}
