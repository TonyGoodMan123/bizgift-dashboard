var CFG = {
  BITRIX_BASE_URL: 'https://vegapro.bitrix24.ru/rest/',
  WEBHOOK: '2559/9og798ya8c9zhyqs/',           

  // Воронка "Продажи v3"
  CATEGORY_ID_SALES_V3: 19,

  // ID таблицы
  SHEET_ID: '1KINLgTKsa_iHxW1VCMoMnF9t_B2yqudOqxs6Ng3vJ3M',

  // Листы отчётности
  SHEETS: {
    DEALS: 'Deals',
    CALLS: 'Calls',
    STAGE_HISTORY: 'StageHistory',
    STAGE_ANALYTICS: 'StageAnalytics',
    KPI_DAILY: 'KPI_Daily',
    KPI_MONTHLY: 'KPI_Monthly'
  },

  // Скриптовые проперти — «курсоры» инкрементальной синхронизации
  PROPS: {
    LAST_SYNC_DEALS: 'lastSyncDeals',
    LAST_SYNC_CALLS: 'lastSyncCalls'
  },

  // Действующие менеджеры отдела продаж (PORTAL_USER_ID)
  SALES_MANAGER_IDS: [5, 2317],

  // Человеческие имена менеджеров
  MANAGERS: {
    5:    { name: 'Антон Маркелов',  role: 'ГД' },
    2317: { name: 'Иван Ионов',      role: 'МОП' },
    2559: { name: 'Антон Федотов',   role: 'РОП' }
  },

  // Маппинг: ID стадии в Bitrix → номер этапа для сортировки в отчётах
  STAGE_INDEX: {
    'C19:NEW': 1,
    'C19:PREPARATION': 2,
    'C19:UC_SYFOHE': 3,
    'C19:PREPAYMENT_INVOIC': 4,
    'C19:EXECUTING': 5,
    'C19:FINAL_INVOICE': 6,
    'C19:WON': 10,
    'C19:LOSE': 99
  },

  // Названия этапов воронки (для конверсий KPI)
  SALES_STAGES_V3: {
    NEW:             'C19:NEW',              // Новый лид
    NEED_IDENTIFIED: 'C19:PREPARATION',      // Потребность выявлена
    KP_SENT:         'C19:UC_SYFOHE',        // КП отправлено
    KP_REVIEW:       'C19:PREPAYMENT_INVOIC',// КП на рассмотрении
    KP_APPROVED:     'C19:EXECUTING',        // КП согласовано
    CONTRACT_SENT:   'C19:UC_TMV2CM',        // Договор/Счёт отправлен
    CONTRACT_PAID:   'C19:FINAL_INVOICE',    // Договор/Счёт оплачен
    WON:             'C19:WON',              // Сделка успешна
    LOSE:            'C19:LOSE'              // Провал
  },

  SYNC: {
    MONTHS_BACK: 6 // глубина первичной загрузки для сделок и звонков
  }
};

// ================== ХЕЛПЕРЫ ==================

function getSheet(name) {
  var ss = SpreadsheetApp.openById(CFG.SHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getProps() {
  return PropertiesService.getScriptProperties();
}

function setLastSync(key, iso) {
  getProps().setProperty(key, iso);
}

function getLastSync(key, def) {
  return getProps().getProperty(key) || def;
}

function getIsoMonthsBack(monthsBack) {
  var d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString();
}

function parseDate(str) {
  if (!str) return '';
  return new Date(str);
}

function parseNumberSafe(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  var str = String(value).trim();
  if (str === '') return 0;

  // Если формат "500000|RUB" — берём только число до |
  if (str.indexOf('|') !== -1) {
    str = str.split('|')[0];
  }

  // Убираем пробелы-разделители тысяч и заменяем запятую на точку
  str = str.replace(/\s+/g, '').replace(',', '.');

  var num = Number(str);
  if (isNaN(num)) {
    Logger.log('parseNumberSafe: cannot parse: ' + value);
    return 0;
  }
  return num;
}
