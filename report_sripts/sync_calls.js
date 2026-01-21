// =========================
// СИНХРОНИЗАЦИЯ ЗВОНКОВ
// Источник: voximplant.statistic.get
// =========================

function syncCallsFull() {
  var since = getIsoMonthsBack(CFG.SYNC.MONTHS_BACK);
  Logger.log('Starting CALLS FULL sync since: ' + since);
  syncCallsSince(since);
}

function syncCallsIncremental() {
  var defaultSince = getIsoMonthsBack(CFG.SYNC.MONTHS_BACK);
  var since = getLastSync(CFG.PROPS.LAST_SYNC_CALLS, defaultSince);
  Logger.log('Starting CALLS INCREMENTAL sync since: ' + since);
  syncCallsSince(since);
}

function syncCallsSince(sinceIso) {
  // FIX: Вариант B - грузим ВСЕ звонки, фильтрация в KPI по Managers
  var params = {
    FILTER: {
      '>CALL_START_DATE': sinceIso
    },
    SORT: 'CALL_START_DATE',
    ORDER: 'ASC'
  };

  var calls = bitrixListAll('voximplant.statistic.get', params);
  Logger.log('Calls loaded: ' + calls.length);

  if (!calls || !calls.length) {
    return;
  }

  var sh = getSheet(CFG.SHEETS.CALLS);
  initCallsHeader();

  var data = sh.getDataRange().getValues();
  var header = data[0];
  var idx = buildCallsIndex(header);

  // карта существующих записей: call_id → строка
  var idToRow = {};
  for (var r = 1; r < data.length; r++) {
    var id = data[r][idx.call_id];
    if (id) {
      idToRow[id] = r + 1; // +1, потому что getRange 1-индексный
    }
  }

  var rowsToAppend = [];
  var maxStartTs = new Date(sinceIso).getTime(); // FIX: Use timestamp for comparison

  calls.forEach(function(c) {
    var startIso = c.CALL_START_DATE;

    // FIX: Compare dates properly via timestamp
    if (startIso) {
      var callTs = new Date(startIso).getTime();
      if (callTs > maxStartTs) {
        maxStartTs = callTs;
      }
    }

    var callTypeCode = Number(c.CALL_TYPE || 0);
    var callTypeText = mapCallType(callTypeCode);
    var callStatusText = mapCallStatus(c.CALL_FAILED_CODE);

    var row = new Array(header.length);

    row[idx.call_id]          = Number(c.ID);
    row[idx.portal_user_id]   = Number(c.PORTAL_USER_ID || 0);
    row[idx.portal_number]    = c.PORTAL_NUMBER || '';
    row[idx.phone_number]     = c.PHONE_NUMBER || '';
    row[idx.call_category]    = c.CALL_CATEGORY || '';
    row[idx.call_type_code]   = callTypeCode;
    row[idx.call_type]        = callTypeText;
    row[idx.call_duration_sec]= Number(c.CALL_DURATION || 0);
    row[idx.call_start]       = c.CALL_START_DATE ? parseDate(c.CALL_START_DATE) : '';

    row[idx.call_failed_code] = c.CALL_FAILED_CODE || '';
    row[idx.call_status]      = callStatusText;

    row[idx.crm_entity_type]  = c.CRM_ENTITY_TYPE || '';
    row[idx.crm_entity_id]    = Number(c.CRM_ENTITY_ID || 0);
    row[idx.crm_activity_id]  = Number(c.CRM_ACTIVITY_ID || 0);

    row[idx.cost]             = parseNumberSafe(c.COST);
    row[idx.cost_currency]    = c.COST_CURRENCY || '';
    row[idx.call_vote]        = Number(c.CALL_VOTE || 0);

    row[idx.record_url]       = c.CALL_RECORD_URL || '';
    row[idx.record_file_id]   = c.RECORD_FILE_ID || '';
    row[idx.comment]          = c.COMMENT || '';

    var existingRow = idToRow[Number(c.ID)];

    if (existingRow) {
      sh.getRange(existingRow, 1, 1, header.length).setValues([row]);
    } else {
      rowsToAppend.push(row);
    }
  });

  if (rowsToAppend.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, rowsToAppend.length, header.length)
      .setValues(rowsToAppend);
  }

  // FIX: Save lastSync as max + 1 second to avoid re-fetching the same tail
  var nextSyncTs = maxStartTs + 1000; // +1 second
  var nextSyncIso = new Date(nextSyncTs).toISOString();
  setLastSync(CFG.PROPS.LAST_SYNC_CALLS, nextSyncIso);
  Logger.log('Calls sync finished. New LastSync: ' + nextSyncIso);
}


// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ЗВОНКОВ ----------

function buildCallsIndex(header) {
  var map = {};
  for (var i = 0; i < header.length; i++) {
    var h = String(header[i]).toLowerCase().trim();
    map[h] = i;
  }
  return map;
}

// Расшифровка типа звонка по CALL_TYPE (по документации Bitrix24) [Вывод]
function mapCallType(code) {
  switch (code) {
    case 1: return 'Исходящий';
    case 2: return 'Входящий';
    case 3: return 'Входящий с перенаправлением';
    case 4: return 'Обратный звонок';
    default: return 'Неизвестный';
  }
}

// Человеческий статус по CALL_FAILED_CODE [Вывод]
function mapCallStatus(code) {
  if (!code) return 'Не определён';

  switch (String(code)) {
    case '200': return 'Успешный звонок';
    case '304': return 'Пропущенный звонок';
    case '603': return 'Отклонено';
    case '486': return 'Занято';
    case '404': return 'Неверный номер';
    case '480': return 'Временно недоступен';
    case '402': return 'Недостаточно средств';
    case '503': return 'Направление недоступно';
    default:    return 'Не определён';
  }
}
