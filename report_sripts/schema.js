// schema.gs — описание структуры листов Deals / Calls / StageHistory / StageAnalytics / KPI_Daily / KPI_Monthly

// -------- DEALS --------

var DEALS_HEADERS = [
  'deal_id',
  'title',
  'date_create',
  'date_modify',
  'stage_id',
  'stage_idx',
  'assigned_by_id',
  'assigned_by_name',
  'source_id',
  'deal_type',
  'sale_amount',
  'purchase_amount',
  'margin_rub',
  'margin_pct',
  'kp_link',
  'kp_date',
  'kp_approved_link',
  'kp_approved_date',
  'contract_file',
  'payment_confirmed',
  'payment_date',
  'prepay_amount',
  'prepay_date',
  'final_payment_amount',
  'final_payment_date',
  'total_paid_amount',
  'payment_percent'
];

function initDealsHeader() {
  var sheet = getSheet(CFG.SHEETS.DEALS);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, DEALS_HEADERS.length).setValues([DEALS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, DEALS_HEADERS.length).setFontWeight('bold');
    return;
  }

  var currentHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var needRewrite = false;

  if (currentHeader.length !== DEALS_HEADERS.length) {
    needRewrite = true;
  } else {
    for (var i = 0; i < DEALS_HEADERS.length; i++) {
      if (String(currentHeader[i]).trim() !== DEALS_HEADERS[i]) {
        needRewrite = true;
        break;
      }
    }
  }

  if (needRewrite) {
    sheet.getRange(1, 1, 1, DEALS_HEADERS.length).setValues([DEALS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, DEALS_HEADERS.length).setFontWeight('bold');
  }
}


// -------- CALLS --------

var CALLS_HEADERS = [
  'call_id',
  'portal_user_id',
  'portal_number',
  'phone_number',
  'call_category',
  'call_type_code',
  'call_type',
  'call_duration_sec',
  'call_start',
  'call_failed_code',
  'call_status',
  'crm_entity_type',
  'crm_entity_id',
  'crm_activity_id',
  'cost',
  'cost_currency',
  'call_vote',
  'record_url',
  'record_file_id',
  'comment'
];

function initCallsHeader() {
  var sheet = getSheet(CFG.SHEETS.CALLS);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, CALLS_HEADERS.length).setValues([CALLS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, CALLS_HEADERS.length).setFontWeight('bold');
    return;
  }

  var currentHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var needRewrite = false;

  if (currentHeader.length !== CALLS_HEADERS.length) {
    needRewrite = true;
  } else {
    for (var i = 0; i < CALLS_HEADERS.length; i++) {
      if (String(currentHeader[i]).trim() !== CALLS_HEADERS[i]) {
        needRewrite = true;
        break;
      }
    }
  }

  if (needRewrite) {
    sheet.getRange(1, 1, 1, CALLS_HEADERS.length).setValues([CALLS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, CALLS_HEADERS.length).setFontWeight('bold');
  }
}


// -------- STAGE HISTORY --------

var STAGE_HISTORY_HEADERS = [
  'deal_id',
  'old_stage_id',
  'new_stage_id',
  'change_date',
  'assigned_by_id'
];

function initStageHistoryHeader() {
  var sheet = getSheet(CFG.SHEETS.STAGE_HISTORY);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, STAGE_HISTORY_HEADERS.length).setValues([STAGE_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, STAGE_HISTORY_HEADERS.length).setFontWeight('bold');
    return;
  }

  var currentHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var needRewrite = false;

  if (currentHeader.length !== STAGE_HISTORY_HEADERS.length) {
    needRewrite = true;
  } else {
    for (var i = 0; i < STAGE_HISTORY_HEADERS.length; i++) {
      if (String(currentHeader[i]).trim() !== STAGE_HISTORY_HEADERS[i]) {
        needRewrite = true;
        break;
      }
    }
  }

  if (needRewrite) {
    sheet.getRange(1, 1, 1, STAGE_HISTORY_HEADERS.length).setValues([STAGE_HISTORY_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, STAGE_HISTORY_HEADERS.length).setFontWeight('bold');
  }
}


// -------- STAGE ANALYTICS (бывший STAGE_KPI) --------

var STAGE_ANALYTICS_HEADERS = [
  'stage_id',
  'assigned_by_id',
  'entries',
  'total_time_hours',
  'avg_time_hours',
  'median_time_hours'
];

function initStageAnalyticsHeader() {
  var sheet = getSheet(CFG.SHEETS.STAGE_ANALYTICS);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0 || lastCol === 0) {
    sheet.getRange(1, 1, 1, STAGE_ANALYTICS_HEADERS.length).setValues([STAGE_ANALYTICS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, STAGE_ANALYTICS_HEADERS.length).setFontWeight('bold');
    return;
  }

  var currentHeader = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var needRewrite = false;

  if (currentHeader.length !== STAGE_ANALYTICS_HEADERS.length) {
    needRewrite = true;
  } else {
    for (var i = 0; i < STAGE_ANALYTICS_HEADERS.length; i++) {
      if (String(currentHeader[i]).trim() !== STAGE_ANALYTICS_HEADERS[i]) {
        needRewrite = true;
        break;
      }
    }
  }

  if (needRewrite) {
    sheet.getRange(1, 1, 1, STAGE_ANALYTICS_HEADERS.length).setValues([STAGE_ANALYTICS_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, STAGE_ANALYTICS_HEADERS.length).setFontWeight('bold');
  }
}

// ===== MANAGERS SHEET =====
var MANAGERS_HEADERS = [
  'manager_id',      // Bitrix user ID
  'manager_name',    // NAME + LAST_NAME
  'is_active',       // true/false
  'department_ids',  // UF_DEPARTMENT joined by ","
  'last_updated'     // timestamp последней синхронизации
];

function initManagersHeader() {
  var sh = getSheet('Managers');
  var lastRow = sh.getLastRow();
  
  if (lastRow === 0 || sh.getRange(1, 1).getValue() !== 'manager_id') {
    sh.clearContents();
    sh.getRange(1, 1, 1, MANAGERS_HEADERS.length).setValues([MANAGERS_HEADERS]);
    sh.getRange(1, 1, 1, MANAGERS_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

// ===== DEALS SHEET =====
var DEALS_HEADERS = [
  'deal_id',
  'title',
  'date_create',
  'date_modify',
  'stage_id',
  'stage_idx',
  'assigned_by_id',
  'assigned_by_name',
  'source_id',
  'deal_type',
  'sale_amount',
  'purchase_amount',
  'margin_rub',
  'margin_pct',
  'kp_link',
  'kp_date',
  'kp_approved_link',
  'kp_approved_date',
  'contract_file',
  'payment_confirmed',
  'payment_date',
  'prepay_amount',
  'prepay_date',
  'final_payment_amount',
  'final_payment_date',
  'total_paid_amount',
  'payment_percent'
];

function initDealsHeader() {
  var sh = getSheet(CFG.SHEETS.DEALS);
  var lastRow = sh.getLastRow();
  
  if (lastRow === 0 || sh.getRange(1, 1).getValue() !== 'deal_id') {
    sh.clearContents();
    sh.getRange(1, 1, 1, DEALS_HEADERS.length).setValues([DEALS_HEADERS]);
    sh.getRange(1, 1, 1, DEALS_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

// ===== CALLS SHEET =====
var CALLS_HEADERS = [
  'call_id',
  'portal_user_id',
  'portal_number',
  'phone_number',
  'call_category',
  'call_type_code',
  'call_type',
  'call_duration_sec',
  'call_start',
  'call_failed_code',
  'call_status',
  'crm_entity_type',
  'crm_entity_id',
  'crm_activity_id',
  'cost',
  'cost_currency',
  'call_vote',
  'record_url',
  'record_file_id',
  'comment'
];

function initCallsHeader() {
  var sh = getSheet(CFG.SHEETS.CALLS);
  var lastRow = sh.getLastRow();
  
  if (lastRow === 0 || sh.getRange(1, 1).getValue() !== 'call_id') {
    sh.clearContents();
    sh.getRange(1, 1, 1, CALLS_HEADERS.length).setValues([CALLS_HEADERS]);
    sh.getRange(1, 1, 1, CALLS_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}

// ===== STAGE HISTORY SHEET =====
var STAGE_HISTORY_HEADERS = [
  'deal_id',
  'stage_id',
  'stage_name',
  'date_time',
  'assigned_by_id'
];

function initStageHistoryHeader() {
  var sh = getSheet(CFG.SHEETS.STAGE_HISTORY);
  var lastRow = sh.getLastRow();
  
  if (lastRow === 0 || sh.getRange(1, 1).getValue() !== 'deal_id') {
    sh.clearContents();
    sh.getRange(1, 1, 1, STAGE_HISTORY_HEADERS.length).setValues([STAGE_HISTORY_HEADERS]);
    sh.getRange(1, 1, 1, STAGE_HISTORY_HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
}