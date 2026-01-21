// =========================
// СИНХРОНИЗАЦИЯ СДЕЛОК (Deals)
// =========================

// Полная синхронизация (с указанной глубиной месяцев назад)
function syncDealsFull() {
  var since = getIsoMonthsBack(CFG.SYNC.MONTHS_BACK);
  Logger.log('Starting FULL deals sync since: ' + since);
  syncDealsSince(since);
}

// Инкрементальная синхронизация (с момента последнего успешного запуска)
function syncDealsIncremental() {
  var defaultSince = getIsoMonthsBack(CFG.SYNC.MONTHS_BACK);
  var since = getLastSync(CFG.PROPS.LAST_SYNC_DEALS, defaultSince);
  Logger.log('Starting INCREMENTAL deals sync since: ' + since);
  syncDealsSince(since);
}

// Базовая функция синка
function syncDealsSince(sinceIso) {
  // 1. Грузим сделки из Битрикс
  var deals = bitrixListAll('crm.deal.list', {
    order: { 'DATE_MODIFY': 'ASC' },
    filter: {
      '>DATE_MODIFY': sinceIso,
      'CATEGORY_ID': CFG.CATEGORY_ID_SALES_V3
    },
    select: [
      'ID',
      'TITLE',
      'DATE_CREATE',
      'DATE_MODIFY',
      'STAGE_ID',
      'ASSIGNED_BY_ID',
      'SOURCE_ID',
      'OPPORTUNITY',
      'TYPE_ID',

      // Финансы и документы
      'UF_CRM_1762353679605', // Сумма закупа
      'UF_CRM_1762354173867', // Ссылка на КП
      'UF_CRM_1762354348239', // Дата отправки КП
      'UF_CRM_1762354503833', // Ссылка на согласованное КП
      'UF_CRM_1762354566000', // Дата согласования КП
      'UF_CRM_1762354687956', // Файл счёта
      'UF_CRM_1762354925643', // Оплата подтверждена (флажок/строка)
      'UF_CRM_1762355001162', // Дата оплаты / предоплаты
      'UF_CRM_1762850638363', // Сумма предоплаты (200000|RUB)
      'UF_CRM_1762850702350', // Дата финальной оплаты
      'UF_CRM_1762850867007'  // Сумма финальной оплаты (300000|RUB)
    ]
  });

  Logger.log('Deals found: ' + deals.length);
  if (deals.length === 0) return;

  // 2. Готовим лист Deals
  var sh = getSheet(CFG.SHEETS.DEALS);
  initDealsHeader(); // гарантируем правильную шапку

  var data = sh.getDataRange().getValues();
  var header = data[0];
  var idx = buildDealsIndex(header);

  // Карта существующих ID (deal_id → номер строки)
  var idToRow = {};
  for (var r = 1; r < data.length; r++) {
    var id = data[r][idx.deal_id];
    if (id) {
      idToRow[id] = r + 1; // номера строк в Sheets с 1
    }
  }

  var rowsToAppend = [];
  var maxDateModify = sinceIso;

  // 3. Обрабатываем каждую сделку
  deals.forEach(function (d) {
    if (d.DATE_MODIFY > maxDateModify) {
      maxDateModify = d.DATE_MODIFY;
    }

    // Базовые суммы
    var sale = parseNumberSafe(d.OPPORTUNITY);
    var purchase = parseMoneyUF(d['UF_CRM_1762353679605']);
    var marginRub = sale - purchase;
    var marginPct = (sale !== 0) ? (marginRub / sale) : 0;

    // Новые поля по оплатам
    var prepayAmount = parseMoneyUF(d['UF_CRM_1762850638363']); // 200000|RUB → 200000
    var finalPaymentAmount = parseMoneyUF(d['UF_CRM_1762850867007']); // 300000|RUB → 300000
    var totalPaidAmount = prepayAmount + finalPaymentAmount;

    // Даты оплат
    var prepayDate = d['UF_CRM_1762355001162']
      ? parseDate(d['UF_CRM_1762355001162'])
      : '';
    var finalPaymentDate = d['UF_CRM_1762850702350']
      ? parseDate(d['UF_CRM_1762850702350'])
      : '';

    // Доля оплаты от суммы продажи (0…1)
    var paymentPercent = 0;
    if (sale > 0 && totalPaidAmount > 0) {
      paymentPercent = totalPaidAmount / sale;
      if (paymentPercent > 1) paymentPercent = 1;
    }

    // 4. Собираем строку по шапке
    var row = new Array(header.length);

    row[idx.deal_id] = Number(d.ID);
    row[idx.title] = d.TITLE || '';
    row[idx.date_create] = parseDate(d.DATE_CREATE);
    row[idx.date_modify] = parseDate(d.DATE_MODIFY);
    row[idx.stage_id] = d.STAGE_ID || '';
    row[idx.stage_idx] = CFG.STAGE_INDEX[d.STAGE_ID] || '';
    row[idx.assigned_by_id] = Number(d.ASSIGNED_BY_ID || 0);
    row[idx.assigned_by_name] = ''; // можно позже заполнить справочником пользователей
    row[idx.source_id] = d.SOURCE_ID || '';
    row[idx.deal_type] = d.TYPE_ID || '';

    row[idx.sale_amount] = sale;
    row[idx.purchase_amount] = purchase;
    row[idx.margin_rub] = marginRub;
    row[idx.margin_pct] = marginPct;

    row[idx.kp_link] = d['UF_CRM_1762354173867'] || '';
    row[idx.kp_date] = d['UF_CRM_1762354348239']
      ? parseDate(d['UF_CRM_1762354348239'])
      : '';
    row[idx.kp_approved_link] = d['UF_CRM_1762354503833'] || '';
    row[idx.kp_approved_date] = d['UF_CRM_1762354566000']
      ? parseDate(d['UF_CRM_1762354566000'])
      : '';
    row[idx.contract_file] = d['UF_CRM_1762354687956'] || '';
    row[idx.payment_confirmed] = d['UF_CRM_1762354925643'] || '';
    row[idx.payment_date] = d['UF_CRM_1762355001162']
      ? parseDate(d['UF_CRM_1762355001162'])
      : '';

    // Новые поля:
    row[idx.prepay_amount] = prepayAmount;
    row[idx.prepay_date] = prepayDate;
    row[idx.final_payment_amount] = finalPaymentAmount;
    row[idx.final_payment_date] = finalPaymentDate;
    row[idx.total_paid_amount] = totalPaidAmount;
    row[idx.payment_percent] = paymentPercent;

    var existingRow = idToRow[Number(d.ID)];
    if (existingRow) {
      // Обновляем существующую строку
      sh.getRange(existingRow, 1, 1, header.length).setValues([row]);
    } else {
      // Новая сделка
      rowsToAppend.push(row);
    }
  });

  // 5. Массово добавляем новые сделки
  if (rowsToAppend.length > 0) {
    sh.getRange(sh.getLastRow() + 1, 1, rowsToAppend.length, header.length)
      .setValues(rowsToAppend);
  }

  // 6. Сохраняем курсор последнего обновления
  setLastSync(CFG.PROPS.LAST_SYNC_DEALS, maxDateModify);
  Logger.log('Deals sync finished. New LastSync: ' + maxDateModify);
}

// Проверка шапки (для обратной совместимости)
function ensureHeaders(sheet) {
  initDealsHeader();
}

// Построение индекса по названиям колонок
function buildDealsIndex(header) {
  var map = {};
  for (var i = 0; i < header.length; i++) {
    var h = String(header[i]).toLowerCase().trim();
    map[h] = i;
  }
  return map;
}

// Безопасный парсинг чисел (включая строки с пробелами и запятыми)
function parseNumberSafe(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  var str = String(value).trim();
  if (str === '') return 0;

  // Убираем пробелы-разделители тысяч и заменяем запятую на точку
  str = str.replace(/\s+/g, '').replace(',', '.');

  var num = Number(str);
  if (isNaN(num)) {
    Logger.log('parseNumberSafe: cannot parse: ' + value);
    return 0;
  }
  return num;
}

// Парсинг UF-денежных полей вида "200000|RUB"
function parseMoneyUF(value) {
  if (!value) return 0;

  if (typeof value === 'number') {
    return value;
  }

  var str = String(value).trim();
  if (str === '') return 0;

  // Формат типа "200000|RUB" — берём часть до "|"
  var parts = str.split('|');
  return parseNumberSafe(parts[0]);
}
