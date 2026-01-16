// Config.gs
// Configuration file for BizGift Sales Dashboard Apps Script Backend

// ===== GOOGLE SHEETS CONFIGURATION =====
const SPREADSHEET_ID = '1b0yqNheOg0lfBqFk7duE3qA6SbjtGGFdmR_6VN_8nLg';

// Sheet names
const SHEETS = {
  DEALS: 'Deals',
  CALLS: 'Calls',
  KPI: 'KPI',
  MANAGERS: 'Managers',
  STAGE_HISTORY: 'StageHistory'
};

// ===== BITRIX24 CONFIGURATION =====
const BITRIX_BASE_URL = 'https://vegapro.bitrix24.ru/rest/';
const BITRIX_WEBHOOK = '2559/tp89fy00kgiqk6jd/';
const BITRIX_API_URL = BITRIX_BASE_URL + BITRIX_WEBHOOK;

// Sales funnel configuration
const CATEGORY_ID_SALES_V3 = 19;

// ===== API KEY CONFIGURATION =====
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('API_KEY');
}

// ===== MANAGER CONFIGURATION =====
const ACTIVE_MANAGERS = [
  { manager_id: 1, manager_name: 'Алексей Смирнов', avatar_color: 'bg-blue-500', is_active: true },
  { manager_id: 2, manager_name: 'Мария Иванова', avatar_color: 'bg-emerald-500', is_active: true },
  { manager_id: 3, manager_name: 'Дмитрий Петров', avatar_color: 'bg-purple-500', is_active: true },
  { manager_id: 4, manager_name: 'Елена Соколова', avatar_color: 'bg-amber-500', is_active: true },
];

// ===== KPI CONFIGURATION =====
const KPI_CONFIG = {
  FIX_SALARY_BASE: 30000,
  NORM_WORKING_DAYS: 20,
  KPI_MAX_FLEX: 25000,
  KPI_LIMIT_PER_BLOCK: 5000,
  BONUS_PER_CALL: 5,
  BONUS_PER_OFFER: 125,
  BONUS_HIGH_MARGIN_DEAL: 1000,
  HIGH_MARGIN_THRESHOLD: 0.35,
  CONV_NEEDS_TARGET: 0.9,
  CONV_AGREED_TARGET: 0.25,
};

// ===== STAGE MAPPING =====
const STAGES = [
  'Новая заявка',
  'Потребность выявлена',
  'КП отправлено',
  'КП на рассмотрении',
  'КП согласовано',
  'Договор/Счет отправлен',
  'Договор/Счет предоплачен',
  'Сделка успешна'
];

// Bitrix24 stage IDs mapping
const BITRIX_STAGE_MAP = {
  'C19:NEW': 'Новая заявка',
  'C19:PREPARATION': 'Потребность выявлена',
  'C19:1': 'КП отправлено',
  'C19:2': 'КП на рассмотрении',
  'C19:3': 'КП согласовано',
  'C19:4': 'Договор/Счет отправлен',
  'C19:5': 'Договор/Счет предоплачен',
  'C19:WON': 'Сделка успешна',
  'C19:LOSE': 'Провал'
};

// ===== FIELD MAPPING =====
const UF_FIELDS = {
  PURCHASE_AMOUNT: 'UF_CRM_1762353679605',
  KP_LINK: 'UF_CRM_1762354173867',
  KP_DATE: 'UF_CRM_1762354348239',
  KP_APPROVED_LINK: 'UF_CRM_1762354503833',
  KP_APPROVED_DATE: 'UF_CRM_1762354566000',
  CONTRACT_FILE: 'UF_CRM_1762354687956',
  PAYMENT_CONFIRMED: 'UF_CRM_1762354925643',
  PAYMENT_DATE: 'UF_CRM_1762355001162'
};

// ===== HELPER FUNCTIONS =====
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Created new sheet: ${sheetName}`);
  }
  return sheet;
}

function logInfo(message) {
  Logger.log(`[INFO] ${new Date().toISOString()} - ${message}`);
}

function logError(message, error) {
  Logger.log(`[ERROR] ${new Date().toISOString()} - ${message}`);
  if (error) {
    Logger.log(`[ERROR] ${error.toString()}`);
    if (error.stack) Logger.log(`[ERROR] ${error.stack}`);
  }
}
