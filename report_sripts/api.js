/**
 * API.gs - Web App Entry Point
 * 
 * Handles GET requests from the React Dashboard.
 * 
 * FIX: Case-insensitive header normalization, enhanced validation for stages and deals.
 */

function doGet(e) {
  var action = e.parameter.action;
  var apiKey = e.parameter.apiKey;
  
  var validKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (apiKey !== validKey) {
    return createJsonResponse({ success: false, error: 'Unauthorized: Invalid API Key' });
  }
  
  try {
    var result;
    
    switch (action) {
      case 'deals':
        result = getDealsData(e.parameter);
        break;
      case 'managers':
        result = getManagersData();
        break;
      case 'kpi':
        result = getKpiData(e.parameter);
        break;
      case 'salary':
        result = getSalaryData(e.parameter);
        break;
      case 'sync-status':
        result = getSyncStatus();
        break;
      default:
        return createJsonResponse({ success: false, error: 'Unknown action: ' + action });
    }
    
    // Check if result contains a structured error (e.g., from validation)
    if (result && result.success === false) return createJsonResponse(result);
    
    return createJsonResponse({ success: true, data: result });
    
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Normalizes headers and builds index map (case-insensitive).
 */
function buildHeaderIndex(headerRow) {
  var idx = {};
  for (var i = 0; i < headerRow.length; i++) {
    var key = String(headerRow[i]).trim().toLowerCase(); // FIX: lower-case stabilization
    idx[key] = i;
  }
  return idx;
}

/**
 * Validates that all required headers exist in the index map.
 */
function validateColumns(sheetName, idxMap, requiredFields) {
  var missing = [];
  requiredFields.forEach(function(field) {
    if (idxMap[field.toLowerCase()] === undefined) {
      missing.push(field);
    }
  });
  
  if (missing.length > 0) {
    return {
      success: false, 
      error: 'Missing required columns in ' + sheetName + ': ' + missing.join(', ')
    };
  }
  return null;
}

/**
 * Fetches stage configuration from Config_Stages sheet.
 */
function getStageConfig() {
  var sheet = getSheet('Config_Stages');
  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var idx = buildHeaderIndex(header); // FIX: normalized headers
  
  // FIX: Validation of stage config headers
  var required = ['stage_id', 'stage_name', 'is_won', 'is_lose'];
  var validationError = validateColumns('Config_Stages', idx, required);
  if (validationError) return { __error: validationError };

  var config = {};
  for (var r = 1; r < data.length; r++) {
    var sId = String(data[r][idx.stage_id]);
    config[sId] = {
      name: String(data[r][idx.stage_name]),
      isWon: data[r][idx.is_won] === true || data[r][idx.is_won] === 'Y' || data[r][idx.is_won] === 'Да',
      isLose: data[r][idx.is_lose] === true || data[r][idx.is_lose] === 'Y' || data[r][idx.is_lose] === 'Да'
    };
  }
  return config;
}

/**
 * action=deals
 */
function getDealsData(params) {
  var sheet = getSheet(CFG.SHEETS.DEALS);
  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var idx = buildHeaderIndex(header); // FIX: lower-case normalization
  
  // FIX: Added kp_approved_date and others to requirements
  var required = [
    'deal_id', 'title', 'date_create', 'date_modify', 'stage_id', 
    'assigned_by_id', 'assigned_by_name', 'sale_amount', 'purchase_amount', 
    'margin_rub', 'margin_pct', 'source_id', 'kp_date', 'kp_approved_date',
    'payment_confirmed', 'payment_date', 'payment_percent'
  ];
  var validationError = validateColumns('Deals', idx, required);
  if (validationError) return validationError;

  var stageConfigResult = getStageConfig();
  if (stageConfigResult.__error) return stageConfigResult.__error; // FIX: Handle stage config errors
  
  var dateFrom = params.dateFrom ? new Date(params.dateFrom) : null;
  var dateTo = params.dateTo ? new Date(params.dateTo) : null;
  var managerId = params.managerId && params.managerId !== 'all' ? Number(params.managerId) : null;
  
  var deals = [];
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var createdAt = new Date(row[idx.date_create]);
    
    if (dateFrom && createdAt < dateFrom) continue;
    if (dateTo && createdAt > dateTo) continue;
    if (managerId && Number(row[idx.assigned_by_id]) !== managerId) continue;
    
    var sId = String(row[idx.stage_id]);
    var sConf = stageConfigResult[sId];
    var stageName = sConf ? sConf.name : 'UNKNOWN:' + sId;
    
    var marginPct = Number(row[idx.margin_pct] || 0);
    if (marginPct > 1) marginPct = marginPct / 100;
    
    var payRatio = Number(row[idx.payment_percent] || 0);
    if (payRatio > 1) payRatio = payRatio / 100;

    deals.push({
      deal_id: String(row[idx.deal_id]),
      deal_name: String(row[idx.title] || ''),
      manager_id: Number(row[idx.assigned_by_id] || 0),
      manager_name: String(row[idx.assigned_by_name] || ''),
      stage: stageName,
      created_at: createdAt.toISOString(),
      closed_at: (sConf && sConf.isWon && row[idx.payment_date]) ? new Date(row[idx.payment_date]).toISOString() : null,
      lost_at: (sConf && sConf.isLose && row[idx.date_modify]) ? new Date(row[idx.date_modify]).toISOString() : null,
      amount: Number(row[idx.sale_amount] || 0),
      cost: Number(row[idx.purchase_amount] || 0),
      margin_value: Number(row[idx.margin_rub] || 0),
      margin_percent: marginPct,
      source: String(row[idx.source_id] || ''),
      kp_date: row[idx.kp_date] ? new Date(row[idx.kp_date]).toISOString() : null,
      kp_approved_date: row[idx.kp_approved_date] ? new Date(row[idx.kp_approved_date]).toISOString() : null,
      payment_confirmed: row[idx.payment_confirmed] === 'Y' || row[idx.payment_confirmed] === true || row[idx.payment_confirmed] === 'Да',
      payment_date: row[idx.payment_date] ? new Date(row[idx.payment_date]).toISOString() : null,
      payment_ratio: payRatio,
      stage_durations: {}
    });
  }
  return deals;
}

/**
 * action=managers
 */
function getManagersData() {
  var sheet = getSheet('Managers');
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return [];
  }
  
  var header = data[0];
  var idx = buildHeaderIndex(header);
  
  var managers = [];
  
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var isActive = row[idx.is_active];
    
    // FIX: Robust is_active normalization (handles true/"true"/"TRUE"/"Да"/1)
    var normalized = String(isActive).trim().toLowerCase();
    var isActiveNormalized = (normalized === 'true' || normalized === 'да' || normalized === '1' || normalized === 'y' || isActive === true);
    
    if (isActiveNormalized) {
      managers.push({
        manager_id: Number(row[idx.manager_id] || 0),
        manager_name: String(row[idx.manager_name] || ''),
        avatar_color: 'bg-blue-500',
        is_active: true
      });
    }
  }
  
  return managers;
}

/**
 * action=kpi
 */
function getKpiData(params) {
  var sheet = getSheet(CFG.SHEETS.KPI_DAILY);
  var data = sheet.getDataRange().getValues();
  var header = data[0];
  var idx = buildHeaderIndex(header); // FIX: lower-case normalization
  
  // FIX: Column Validation
  var required = ['date', 'manager_id', 'manager_name', 'calls_30s_plus', 'kp_sent_count'];
  var validationError = validateColumns('KPI_Daily', idx, required);
  if (validationError) return validationError;

  var dateFrom = params.dateFrom ? new Date(params.dateFrom) : null;
  var dateTo = params.dateTo ? new Date(params.dateTo) : null;
  var managerId = params.managerId && params.managerId !== 'all' ? Number(params.managerId) : null;
  
  var kpiMap = {};
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var rowDate = new Date(row[idx.date]);
    
    if (dateFrom && rowDate < dateFrom) continue;
    if (dateTo && rowDate > dateTo) continue;
    
    var mId = Number(row[idx.manager_id]);
    if (managerId && mId !== managerId) continue;
    
    if (!kpiMap[mId]) {
      kpiMap[mId] = {
        manager_id: mId,
        manager_name: String(row[idx.manager_name] || ''),
        calls_30_sec_count: 0,
        offers_sent_count: 0,
        needs_count: 0,
        offers_agreed_count: 0
      };
    }
    
    kpiMap[mId].calls_30_sec_count += Number(row[idx.calls_30s_plus] || 0);
    kpiMap[mId].offers_sent_count += Number(row[idx.kp_sent_count] || 0);
  }
  return Object.keys(kpiMap).map(function(key) { return kpiMap[key]; });
}

/**
 * action=sync-status
 */
function getSyncStatus() {
  var props = PropertiesService.getScriptProperties();
  return {
    last_sync_deals: props.getProperty(CFG.PROPS.LAST_SYNC_DEALS),
    last_sync_calls: props.getProperty(CFG.PROPS.LAST_SYNC_CALLS)
  };
}

/**
 * Helper: normalize month value to YYYY-MM format
 */
function normalizeMonth(value) {
  if (!value) return '';
  
  // If it's a Date object
  if (value instanceof Date) {
    var y = value.getFullYear();
    var m = ('0' + (value.getMonth() + 1)).slice(-2);
    return y + '-' + m;
  }
  
  // If it's a string
  var str = String(value).trim();
  
  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Try to parse as date string (e.g., "2026-01-01")
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 7); // Extract YYYY-MM
  }
  
  // Fallback: return as-is
  return str;
}

/**
 * action=salary
 * Итоговая зарплата из KPI_Monthly (read-only)
 * Параметры: managerId, month (YYYY-MM)
 */
function getSalaryData(params) {
  var managerId = params.managerId ? Number(params.managerId) : null;
  var month = params.month; // YYYY-MM
  
  if (!managerId || !month) {
    return { success: false, error: 'managerId and month are required' };
  }
  
  var sheet = getSheet(CFG.SHEETS.KPI_MONTHLY);
  var data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: false, error: 'KPI_Monthly sheet is empty' };
  }
  
  var header = data[0];
  var idx = buildHeaderIndex(header);
  
  // FIX: Validate required columns
  var required = ['month', 'manager_id', 'manager_name', 'salary_total', 'flex_kpi_capped_total', 'margin_bonus_raw', 'fixed_base'];
  var validationError = validateColumns('KPI_Monthly', idx, required);
  if (validationError) return validationError;
  
  // Normalize requested month to YYYY-MM
  var normalizedMonth = normalizeMonth(month);
  
  // Найти строку для указанного менеджера и месяца
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var rowManagerId = Number(row[idx.manager_id] || 0);
    var rowMonth = normalizeMonth(row[idx.month]); // FIX: Normalize before comparison
    
    if (rowManagerId === managerId && rowMonth === normalizedMonth) {
      return {
        manager_id: managerId,
        manager_name: String(row[idx.manager_name] || ''),
        month: month,
        shifts_count: Number(row[idx.shifts_count] || 0),
        calls_total: Number(row[idx.calls_total] || 0),
        calls_30s_plus: Number(row[idx.calls_30s_plus] || 0),
        kp_sent_count: Number(row[idx.kp_sent_count] || 0),
        high_margin_deals_count: Number(row[idx.high_margin_deals_count] || 0),
        margin_rub_total: Number(row[idx.margin_rub_total] || 0),
        margin_bonus_raw: Number(row[idx.margin_bonus_raw] || 0),
        flex_kpi_raw_total: Number(row[idx.flex_kpi_raw_total] || 0),
        flex_kpi_capped_total: Number(row[idx.flex_kpi_capped_total] || 0),
        fixed_base: Number(row[idx.fixed_base] || 0),
        salary_without_margin: Number(row[idx.salary_without_margin] || 0),
        salary_total: Number(row[idx.salary_total] || 0)
      };
    }
  }
  
  return { success: false, error: 'No data found for manager ' + managerId + ' in month ' + month };
}
