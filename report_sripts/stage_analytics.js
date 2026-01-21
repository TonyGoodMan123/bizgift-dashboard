// =========================
// АНАЛИТИКА ЭТАПОВ ВОРОНКИ
// Строим таблицу StageAnalytics на основе StageHistory
// =========================

// Полный пересчёт таблицы StageAnalytics
function rebuildStageAnalytics() {
  var histSheet = getSheet(CFG.SHEETS.STAGE_HISTORY);
  initStageHistoryHeader();

  var data = histSheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('rebuildStageAnalytics: нет данных в StageHistory');
    return;
  }

  var header = data[0];
  var idx = buildStageHistoryIndex(header);

  // Сбор событий по каждой сделке
  var eventsByDeal = {};

  for (var r = 1; r < data.length; r++) {
    var row = data[r];

    var dealId       = row[idx.deal_id];
    var newStageId   = row[idx.new_stage_id];
    var changeDate   = row[idx.change_date];
    var assignedById = row[idx.assigned_by_id];

    if (!dealId || !newStageId || !changeDate) continue;

    if (!(changeDate instanceof Date)) {
      changeDate = new Date(changeDate);
    }

    var key = String(dealId);
    if (!eventsByDeal[key]) {
      eventsByDeal[key] = [];
    }

    eventsByDeal[key].push({
      deal_id:        dealId,
      stage_id:       newStageId,
      change_date:    changeDate,
      assigned_by_id: assignedById || 0
    });
  }

  // Накапливаем интервалы: stage_id + assigned_by_id → список длительностей (в часах)
  var durations = {};

  Object.keys(eventsByDeal).forEach(function(dealKey) {
    var events = eventsByDeal[dealKey];

    // Сортируем по времени
    events.sort(function(a, b) {
      return a.change_date - b.change_date;
    });

    for (var i = 0; i < events.length; i++) {
      var current = events[i];
      var next    = (i < events.length - 1) ? events[i + 1] : null;

      var start = current.change_date;
      var end   = next ? next.change_date : new Date(); // для последней стадии считаем до текущего момента

      var diffMs = end - start;
      if (diffMs <= 0) continue;

      var hours = diffMs / (1000 * 60 * 60);

      var stageId      = current.stage_id;
      var assignedById = current.assigned_by_id || 0;

      var key = stageId + '|' + String(assignedById);

      if (!durations[key]) {
        durations[key] = [];
      }
      durations[key].push(hours);
    }
  });

  // Готовим вывод в StageAnalytics
  var analyticsSheet = getSheet(CFG.SHEETS.STAGE_ANALYTICS);
  analyticsSheet.clearContents();
  initStageAnalyticsHeader();

  var analyticsHeader = analyticsSheet.getRange(1, 1, 1, analyticsSheet.getLastColumn()).getValues()[0];
  var hIdx = buildStageAnalyticsIndex(analyticsHeader);

  var outRows = [];

  Object.keys(durations).forEach(function(key) {
    var parts        = key.split('|');
    var stageId      = parts[0];
    var assignedById = Number(parts[1] || 0);

    var list = durations[key];
    if (!list.length) return;

    var entries = list.length;
    var total   = 0;

    list.forEach(function(h) { total += h; });

    var avg    = total / entries;
    var median = computeMedian(list);

    var row = new Array(analyticsHeader.length);
    row[hIdx.stage_id]          = stageId;
    row[hIdx.assigned_by_id]    = assignedById;
    row[hIdx.entries]           = entries;
    row[hIdx.total_time_hours]  = total;
    row[hIdx.avg_time_hours]    = avg;
    row[hIdx.median_time_hours] = median;

    outRows.push(row);
  });

  if (outRows.length > 0) {
    analyticsSheet.getRange(2, 1, outRows.length, analyticsHeader.length)
      .setValues(outRows);
  }

  Logger.log('rebuildStageAnalytics: сформировано строк: ' + outRows.length);
}

// =========================
// МЕСЯЧНЫЕ КОНВЕРСИИ ИЗ StageHistory
// =========================
//
// Возвращает объект:
//  key = 'YYYY-MM|manager_id' → {
//    month: 'YYYY-MM',
//    manager_id: number,
//    need_total: number,
//    need_to_kp_success: number,
//    kp_total: number,
//    kp_to_approved_success: number
//  }
//
// Используем дальше в KPI_Monthly.

function buildMonthlyConversionFromStageHistory() {
  var histSheet = getSheet(CFG.SHEETS.STAGE_HISTORY);
  initStageHistoryHeader();

  var data = histSheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('buildMonthlyConversionFromStageHistory: нет данных в StageHistory');
    return {};
  }

  var header = data[0];
  var idx = buildStageHistoryIndex(header);

  // Важно: берём идентификаторы стадий из CFG.SALES_STAGES_V3
  var ST_NEED        = CFG.SALES_STAGES_V3.NEED_IDENTIFIED; // C19:PREPARATION
  var ST_KP_SENT     = CFG.SALES_STAGES_V3.KP_SENT;         // C19:UC_SYFOHE
  var ST_KP_APPROVED = CFG.SALES_STAGES_V3.KP_APPROVED;     // C19:EXECUTING

  // События по сделкам
  var eventsByDeal = {};

  for (var r = 1; r < data.length; r++) {
    var row = data[r];

    var dealId       = row[idx.deal_id];
    var stageId      = row[idx.new_stage_id];
    var changeDate   = row[idx.change_date];
    var assignedById = row[idx.assigned_by_id] || 0;

    if (!dealId || !stageId || !changeDate) continue;

    if (!(changeDate instanceof Date)) {
      changeDate = new Date(changeDate);
    }

    var dKey = String(dealId);
    if (!eventsByDeal[dKey]) {
      eventsByDeal[dKey] = [];
    }

    eventsByDeal[dKey].push({
      stage_id:       stageId,
      change_date:    changeDate,
      assigned_by_id: assignedById
    });
  }

  // Агрегат по менеджеру и месяцу
  var convMap = {}; // key = 'YYYY-MM|manager_id' → агрегат

  function getMonthStr(date) {
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    return y + '-' + m;
  }

  function ensureConvRec(monthStr, managerId) {
    var key = monthStr + '|' + String(managerId);
    if (!convMap[key]) {
      convMap[key] = {
        month:                   monthStr,
        manager_id:              managerId,
        need_total:              0,
        need_to_kp_success:      0,
        kp_total:                0,
        kp_to_approved_success:  0
      };
    }
    return convMap[key];
  }

  // По каждой сделке ищем первые входы в ключевые стадии
  Object.keys(eventsByDeal).forEach(function(dKey) {
    var events = eventsByDeal[dKey];
    if (!events || !events.length) return;

    events.sort(function(a, b) {
      return a.change_date - b.change_date;
    });

    var firstNeed       = null; // {date, manager_id}
    var firstKpSent     = null;
    var firstKpApproved = null;

    for (var i = 0; i < events.length; i++) {
      var ev = events[i];

      if (!firstNeed && ev.stage_id === ST_NEED) {
        firstNeed = {
          date:       ev.change_date,
          manager_id: ev.assigned_by_id || 0
        };
      }

      if (!firstKpSent && ev.stage_id === ST_KP_SENT) {
        firstKpSent = {
          date:       ev.change_date,
          manager_id: ev.assigned_by_id || 0
        };
      }

      if (!firstKpApproved && ev.stage_id === ST_KP_APPROVED) {
        firstKpApproved = {
          date:       ev.change_date,
          manager_id: ev.assigned_by_id || 0
        };
      }
    }

    // 1) Конверсия "Потребность → КП отправлено"
    if (firstNeed) {
      var month1 = getMonthStr(firstNeed.date);
      var mgr1   = firstNeed.manager_id;

      var rec1 = ensureConvRec(month1, mgr1);
      rec1.need_total++;

      if (firstKpSent && firstKpSent.date >= firstNeed.date) {
        rec1.need_to_kp_success++;
      }
    }

    // 2) Конверсия "КП отправлено → КП согласовано"
    if (firstKpSent) {
      var month2 = getMonthStr(firstKpSent.date);
      var mgr2   = firstKpSent.manager_id;

      var rec2 = ensureConvRec(month2, mgr2);
      rec2.kp_total++;

      if (firstKpApproved && firstKpApproved.date >= firstKpSent.date) {
        rec2.kp_to_approved_success++;
      }
    }
  });

  Logger.log('buildMonthlyConversionFromStageHistory: сформировано ключей: ' + Object.keys(convMap).length);
  return convMap;
}

// ------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ -------

function buildStageHistoryIndex(header) {
  var map = {};
  for (var i = 0; i < header.length; i++) {
    var h = String(header[i]).toLowerCase().trim();
    map[h] = i;
  }
  return map;
}

function buildStageAnalyticsIndex(header) {
  var map = {};
  for (var i = 0; i < header.length; i++) {
    var h = String(header[i]).toLowerCase().trim();
    map[h] = i;
  }
  return map;
}

function computeMedian(arr) {
  if (!arr || !arr.length) return 0;
  var a   = arr.slice().sort(function(x, y) { return x - y; });
  var n   = a.length;
  var mid = Math.floor(n / 2);
  if (n % 2 === 1) {
    return a[mid];
  } else {
    return (a[mid - 1] + a[mid]) / 2;
  }
}
