/**
 * managers_utils.js - Утилиты для работы с листом Managers
 */

/**
 * Получить Set активных sales-менеджеров
 * @return {Object} Map: manager_id -> manager_name
 */
function getActiveManagersSet() {
  var sh = getSheet('Managers');
  var data = sh.getDataRange().getValues();
  
  if (data.length <= 1) {
    Logger.log('WARNING: Managers sheet is empty!');
    return {};
  }
  
  var header = data[0];
  var idx = {};
  for (var i = 0; i < header.length; i++) {
    idx[String(header[i]).toLowerCase()] = i;
  }
  
  var result = {};
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var isActive = row[idx.is_active];
    
    // Проверка: is_active = true (boolean) или "Да" (string, deprecated)
    if (isActive === true || isActive === 'Да' || isActive === 'TRUE') {
      var id = Number(row[idx.manager_id]);
      var name = String(row[idx.manager_name] || '');
      
      if (id && name) {
        result[id] = name;
      }
    }
  }
  
  return result;
}

/**
 * Получить список активных manager_id (массив)
 */
function getActiveManagerIds() {
  var activeSet = getActiveManagersSet();
  return Object.keys(activeSet).map(Number);
}
