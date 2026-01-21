// === KPI CONFIG (из регламента мотивации) ===

// Фикс за полный месяц (пока без привязки к сменам)
var KPI_FIXED_BASE = 30000;

// Флекс по звонкам
var KPI_CALL_RATE = 5; // ₽ за завершённый звонок ≥ 30 сек

// Флекс по КП
var KPI_KP_RATE = 125; // ₽ за отправленное КП

// Флекс по сделкам с маржей ≥ 35%
var KPI_HIGH_MARGIN_THRESHOLD = 0.35;       // 35%
var KPI_HIGH_MARGIN_BONUS_PER_DEAL = 1000;  // ₽ за сделку

// Лимиты по подпоказателям флекса
var KPI_CALLS_CAP  = 5000;
var KPI_KP_CAP     = 5000;
var KPI_HIGHM_CAP  = 5000;

// Общий лимит флекса
var KPI_FLEX_TOTAL_CAP = 25000;

// Конверсионные бонусы
var KPI_CONV_NEED_TO_KP_THRESHOLD      = 0.90; // 90%
var KPI_CONV_NEED_TO_KP_BONUS          = 5000; // ₽
var KPI_CONV_KP_TO_APPROVED_THRESHOLD  = 0.25; // 25%
var KPI_CONV_KP_TO_APPROVED_BONUS      = 5000; // ₽

// Маппинг стадий для расчёта конверсии «Потребность → КП»
// Сюда ты сам подставишь реальные STAGE_ID из воронки.
// Например: ['C19:NEW_DEMAND'] и т.п.
var STAGE_DEMAND_IDS = (CFG && CFG.STAGE_DEMAND_IDS) ? CFG.STAGE_DEMAND_IDS : [];

// helper: дата → yyyy-MM-dd
function formatDateKey(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// helper: дата → yyyy-MM
function formatMonthKey(date) {
  if (!(date instanceof Date)) date = new Date(date);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM');
}
