var CFG = {
  BITRIX_BASE_URL: 'https://vegapro.bitrix24.ru/rest/',
  WEBHOOK: '2559/9og798ya8c9zhyqs/',

  // Воронка "Продажи v3"
  CATEGORY_ID_SALES_V3: 19,

  // ID таблицы
  SHEET_ID: '1b0yqNheOg0lfBqFk7duE3qA6SbjtGGFdmR_6VN_8nLg',

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

  // DEPRECATED: Действующие менеджеры отдела продаж (PORTAL_USER_ID)
  // Variant B: источник истины - лист Managers
  SALES_MANAGER_IDS: [5, 2317],

  // DEPRECATED: Человеческие имена менеджеров
  // Variant B: источник истины - лист Managers
  MANAGERS: {
    5:    { name: 'Антон Маркелов',  role: 'РОП' },
    2317: { name: 'Иван Ионов',      role: 'МОП' },
    2559: { name: 'Антон Федотов',   role: 'Тех/Разработка' }
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
    'C19:NEW': 'Потребность',
    'C19:PREPARATION': 'Потребность выявлена',
    'C19:UC_SYFOHE': 'КП отправлено',
    'C19:PREPAYMENT_INVOIC': 'КП на рассмотрении',
    'C19:EXECUTING': 'КП согласовано',
    'C19:FINAL_INVOICE': 'Договор/Счёт оплачен',
    'C19:WON': 'Деньги на счету',
    'C19:LOSE': 'Отказ'
  }
};

// ==================== ТАРИФЫ ДЛЯ KPI ====================

// Фиксированный тариф (руб.)
var KPI_FIXED_BASE = 30000;

// Целевая вилка звонков
var KPI_CALL_MIN = 250;
var KPI_CALL_MAX = 300;
var KPI_CALL_CAP = 5000;   // макс. награда (₽)
var KPI_CALL_RATE = 5;     // ₽ за звонок ≥30 сек

// Целевая вилка КП
var KPI_KP_MIN = 20;
var KPI_KP_MAX = 25;
var KPI_KP_CAP = 5000;     // макс. вознаграждение (₽)
var KPI_KP_RATE = 125;     // ₽ за отправленное КП

// Высокомаржинальный лимит
var KPI_HIGH_MARGIN_THRESHOLD = 0.35;
var KPI_HIGH_MARGIN_BONUS_PER_DEAL = 1000;  // ₽ (фикс)
var KPI_HIGH_MARGIN_CAP = 5000;

// Целевая конверсия
var CONVERSION_NEED_TO_KP_TARGET = 0.90;
var CONVERSION_NEED_TO_KP_BONUS = 5000;
var CONVERSION_NEED_TO_KP_CAP = 5000;

var CONVERSION_KP_TO_APPROVED_TARGET = 0.25;
var CONVERSION_KP_TO_APPROVED_BONUS = 5000;
var CONVERSION_KP_TO_APPROVED_CAP = 5000;

// Флекс-премия (суммарная): кап и награды
var KPI_FLEX_CAP = 30000;

// Премия от маржинальности (в долях, например 0.10 = 10%)
function getMarginBonusPercent(marginPct) {
  if (marginPct >= 0.50) return 0.45;
  if (marginPct >= 0.45) return 0.40;
  if (marginPct >= 0.40) return 0.35;
  if (marginPct >= 0.35) return 0.30;
  if (marginPct >= 0.30) return 0.25;
  if (marginPct >= 0.25) return 0.20;
  if (marginPct >= 0.20) return 0.15;
  if (marginPct >= 0.15) return 0.10;
  if (marginPct >= 0.10) return 0.05;
  return 0;
}
