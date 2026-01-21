// =============== KPI_Monthly ===============
// Агрегация KPI_Daily по месяцам и расчёт итоговой ЗП
// + учёт конверсий из StageHistory:
//
// 1) "Потребность → КП отправлено"  (target ≥ 90%)  → 5 000 ₽
// 2) "КП отправлено → КП согласовано" (target ≥ 25%) → 5 000 ₽
//
// Обе премии входят в общий лимит KPI-флекса 25 000 ₽.

function rebuildKpiMonthly() {
  Logger.log('rebuildKpiMonthly: start');

  var ssDaily   = getSheet(CFG.SHEETS.KPI_DAILY);
  var ssMonthly = getSheet(CFG.SHEETS.KPI_MONTHLY);

  // Собираем конверсии по месяцам и менеджерам из StageHistory
  var convMap = buildMonthlyConversionFromStageHistory(); // key: 'YYYY-MM|manager_id'

  // Пороговые значения и премии по конверсиям
  var CONV_NEED_TO_KP_TARGET         = 0.90;  // 90%
  var CONV_KP_TO_APPROVED_TARGET     = 0.25;  // 25%
  var CONV_NEED_TO_KP_BONUS          = 5000;  // фикс за достижение порога
  var CONV_KP_TO_APPROVED_BONUS      = 5000;  // фикс за достижение порога
  var CONV_NEED_TO_KP_CAP            = 5000;  // максимум по показателю
  var CONV_KP_TO_APPROVED_CAP        = 5000;  // максимум по показателю

  // Шапка KPI_Monthly
  var headers = [
    'month',
    'manager_id',
    'manager_name',
    'shifts_count',
    'calls_total',
    'calls_30s_plus',
    'calls_reward_raw',
    'calls_reward_capped',
    'kp_sent_count',
    'kp_reward_raw',
    'kp_reward_capped',
    'high_margin_deals_count',
    'high_margin_reward_raw',
    'high_margin_reward_capped',

    // Блок конверсий
    'need_total',
    'need_to_kp_success',
    'need_to_kp_conversion',           // в долях (0..1)
    'kp_total',
    'kp_to_approved_success',
    'kp_to_approved_conversion',       // в долях (0..1)

    // Премии за конверсии
    'conv_need_to_kp_reward_raw',
    'conv_need_to_kp_reward_capped',
    'conv_kp_to_approved_reward_raw',
    'conv_kp_to_approved_reward_capped',

    // Итоговый флекс KPI
    'flex_kpi_raw_total',
    'flex_kpi_capped_total',

    // Маржа и итоговая ЗП
    'margin_rub_total',
    'margin_bonus_raw',
    'fixed_base',
    'salary_without_margin',
    'salary_total'
  ];

  ssMonthly.clearContents();
  ssMonthly.getRange(1, 1, 1, headers.length).setValues([headers]);
  ssMonthly.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  ssMonthly.setFrozenRows(1);

  var data = ssDaily.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('rebuildKpiMonthly: нет данных в KPI_Daily');
    return;
  }

  var h = data[0];
  var idx = {};
  for (var i = 0; i < h.length; i++) {
    idx[String(h[i]).toLowerCase()] = i;
  }

  // Лимиты и параметры мотивации
  var FIXED_BASE        = 30000; // фикс за месяц (пока единый)
  var CALLS_CAP         = 5000;  // максимум по звонкам
  var KP_CAP            = 5000;  // максимум по КП
  var HIGH_MARGIN_CAP   = 5000;  // максимум по сделкам с маржей >=35%
  var FLEX_CAP          = 25000; // общий лимит флекса (звонки+КП+конверсии+high_margin)

  var monthlyMap = {}; // key: managerId|YYYY-MM → агрегат

  function getMonthKey(managerId, d) {
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    return managerId + '|' + (y + '-' + m);
  }

  // Агрегация KPI_Daily → по месяцам
  for (var r = 1; r < data.length; r++) {
    var row  = data[r];
    var date = row[idx['date']];
    if (!(date instanceof Date)) continue;

    var managerId = Number(row[idx['manager_id']] || 0);
    if (!managerId) continue;

    var key = getMonthKey(managerId, date);
    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        monthStr:               null,
        manager_id:             managerId,
        manager_name:           row[idx['manager_name']] || ('Менеджер ' + managerId),
        shifts_count:           0,
        calls_total:            0,
        calls_30s_plus:         0,
        calls_reward_raw:       0,
        kp_sent_count:          0,
        kp_reward_raw:          0,
        high_margin_deals_count:0,
        high_margin_reward_raw: 0,
        margin_rub_total:       0,
        margin_bonus_raw:       0
      };
      var y = date.getFullYear();
      var m = ('0' + (date.getMonth() + 1)).slice(-2);
      monthlyMap[key].monthStr = y + '-' + m;
    }

    var agg = monthlyMap[key];

    var shiftFlag = Number(row[idx['shift_flag']] || 0);
    if (shiftFlag) agg.shifts_count += 1;

    agg.calls_total            += Number(row[idx['calls_total']] || 0);
    agg.calls_30s_plus         += Number(row[idx['calls_30s_plus']] || 0);
    agg.calls_reward_raw       += Number(row[idx['calls_reward_raw']] || 0);

    agg.kp_sent_count          += Number(row[idx['kp_sent_count']] || 0);
    agg.kp_reward_raw          += Number(row[idx['kp_reward_raw']] || 0);

    agg.high_margin_deals_count += Number(row[idx['high_margin_deals_count']] || 0);
    agg.high_margin_reward_raw  += Number(row[idx['high_margin_reward_raw']] || 0);

    agg.margin_rub_total       += Number(row[idx['margin_rub_total']] || 0);
    agg.margin_bonus_raw       += Number(row[idx['margin_bonus_raw']] || 0);
  }

  var out  = [];
  var keys = Object.keys(monthlyMap);
  keys.sort();

  keys.forEach(function (key) {
    var m = monthlyMap[key];

    // --- 1. Ограничения по подпоказателям флекса (звонки, КП, high_margin) ---
    var callsRewardCapped      = Math.min(m.calls_reward_raw, CALLS_CAP);
    var kpRewardCapped         = Math.min(m.kp_reward_raw,   KP_CAP);
    var highMarginRewardCapped = Math.min(m.high_margin_reward_raw, HIGH_MARGIN_CAP);

    // --- 2. Достаём конверсии для данного менеджера и месяца ---
    var convKey = m.monthStr + '|' + String(m.manager_id);
    var convRec = convMap && convMap[convKey] ? convMap[convKey] : {
      month:                  m.monthStr,
      manager_id:             m.manager_id,
      need_total:             0,
      need_to_kp_success:     0,
      kp_total:               0,
      kp_to_approved_success: 0
    };

    var needTotal         = convRec.need_total || 0;
    var needToKpSuccess   = convRec.need_to_kp_success || 0;
    var kpTotal           = convRec.kp_total || 0;
    var kpToApprovedSucc  = convRec.kp_to_approved_success || 0;

    var needToKpConv      = needTotal > 0 ? (needToKpSuccess / needTotal) : 0;
    var kpToApprovedConv  = kpTotal > 0 ? (kpToApprovedSucc / kpTotal) : 0;

    // --- 3. Премии за конверсии ---
    var convNeedToKpRewardRaw =
      (needToKpConv >= CONV_NEED_TO_KP_TARGET && needTotal > 0) ? CONV_NEED_TO_KP_BONUS : 0;

    var convKpToApprovedRewardRaw =
      (kpToApprovedConv >= CONV_KP_TO_APPROVED_TARGET && kpTotal > 0) ? CONV_KP_TO_APPROVED_BONUS : 0;

    var convNeedToKpRewardCapped =
      Math.min(convNeedToKpRewardRaw, CONV_NEED_TO_KP_CAP);

    var convKpToApprovedRewardCapped =
      Math.min(convKpToApprovedRewardRaw, CONV_KP_TO_APPROVED_CAP);

    // --- 4. Итоговый флекс KPI ---
    var flexRaw = (
      m.calls_reward_raw +
      m.kp_reward_raw +
      m.high_margin_reward_raw +
      convNeedToKpRewardRaw +
      convKpToApprovedRewardRaw
    );

    var flexCapByItems = (
      callsRewardCapped +
      kpRewardCapped +
      highMarginRewardCapped +
      convNeedToKpRewardCapped +
      convKpToApprovedRewardCapped
    );

    var flexCapped = Math.min(flexCapByItems, FLEX_CAP);

    // --- 5. Итоговая ЗП ---
    var fixedBase          = FIXED_BASE;
    var salaryWithoutMargin= fixedBase + flexCapped;
    var salaryTotal        = salaryWithoutMargin + m.margin_bonus_raw;

    out.push([
      m.monthStr,
      m.manager_id,
      m.manager_name,
      m.shifts_count,
      m.calls_total,
      m.calls_30s_plus,
      m.calls_reward_raw,
      callsRewardCapped,
      m.kp_sent_count,
      m.kp_reward_raw,
      kpRewardCapped,
      m.high_margin_deals_count,
      m.high_margin_reward_raw,
      highMarginRewardCapped,

      // конверсии
      needTotal,
      needToKpSuccess,
      needToKpConv,
      kpTotal,
      kpToApprovedSucc,
      kpToApprovedConv,

      // премии за конверсии
      convNeedToKpRewardRaw,
      convNeedToKpRewardCapped,
      convKpToApprovedRewardRaw,
      convKpToApprovedRewardCapped,

      // итоговый флекс
      flexRaw,
      flexCapped,

      // маржа и ЗП
      m.margin_rub_total,
      m.margin_bonus_raw,
      fixedBase,
      salaryWithoutMargin,
      salaryTotal
    ]);
  });

  if (out.length) {
    ssMonthly.getRange(2, 1, out.length, headers.length).setValues(out);
  }

  Logger.log('rebuildKpiMonthly: готово строк: ' + out.length);
}
