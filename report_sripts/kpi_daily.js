// =============== KPI_Daily ===============
// Строим ежедневные KPI по менеджерам на основе листов Calls и Deals

// =============== KPI_Daily ===============
// Строим ежедневные KPI по менеджерам на основе листов Calls и Deals

function rebuildKpiDaily() {
  Logger.log('rebuildKpiDaily: start');

  // FIX: Быстрый lookup Set активных sales-менеджеров из Managers
  var activeManagersSet = getActiveManagersSet();
  Logger.log('Active managers count: ' + Object.keys(activeManagersSet).length);

  var ssCalls   = getSheet(CFG.SHEETS.CALLS);
  var ssDeals   = getSheet(CFG.SHEETS.DEALS);
  var ssDaily   = getSheet(CFG.SHEETS.KPI_DAILY);

  // Шапка KPI_Daily
  var headers = [
    'date',
    'manager_id',
    'manager_name',
    'calls_total',
    'calls_30s_plus',
    'calls_reward_raw',
    'kp_sent_count',
    'kp_reward_raw',
    'high_margin_deals_count',
    'high_margin_reward_raw',
    'margin_rub_total',
    'margin_bonus_raw',
    'shift_flag'
  ];
  ssDaily.clearContents();
  ssDaily.getRange(1, 1, 1, headers.length).setValues([headers]);
  ssDaily.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  ssDaily.setFrozenRows(1);

  // ===== Параметры мотивации, привязанные к регламенту =====
  var CALL_REWARD_PER_30S      = KPI_CALL_RATE;                  // 5 ₽ за звонок ≥30 сек
  var HIGH_MARGIN_THRESHOLD    = KPI_HIGH_MARGIN_THRESHOLD;      // 0.35
  var HIGH_MARGIN_DEAL_REWARD  = KPI_HIGH_MARGIN_BONUS_PER_DEAL; // 1000 ₽

  // ===== 1. Агрегация по дням/менеджерам =====
  var dailyMap = {}; // key: managerId|yyyy-mm-dd → объект показателей

  function getDailyKey(managerId, d) {
    return managerId + '|' + formatDateKey(d);
  }

  function ensureDaily(managerId, dateObj) {
    var key = getDailyKey(managerId, dateObj);
    if (!dailyMap[key]) {
      // FIX: Берём имя из Managers вместо 'Менеджер X'
      var managerName = activeManagersSet[managerId] || ('Менеджер ' + managerId);
      dailyMap[key] = {
        date: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        manager_id: managerId,
        manager_name: managerName,
        calls_total: 0,
        calls_30s_plus: 0,
        calls_reward_raw: 0,
        kp_sent_count: 0,
        kp_reward_raw: 0,
        high_margin_deals_count: 0,
        high_margin_reward_raw: 0,
        margin_rub_total: 0,
        margin_bonus_raw: 0,
        shift_flag: 0
      };
    }
    return dailyMap[key];
  }

  // --- 1.1. Читаем звонки (лист Calls) ---
  var callsData = ssCalls.getDataRange().getValues();
  if (callsData.length > 1) {
    var ch = callsData[0];
    var idx = {};
    for (var i = 0; i < ch.length; i++) {
      idx[String(ch[i]).toLowerCase()] = i;
    }

    for (var r = 1; r < callsData.length; r++) {
      var row = callsData[r];

      var managerId = Number(row[idx['portal_user_id']] || 0);
      if (!managerId) continue;
      
      // FIX: Пропускаем менеджеров, которых нет в активных sales
      if (!activeManagersSet[managerId]) continue;

      var callStart = row[idx['call_start']];
      if (!(callStart instanceof Date)) continue;

      var duration = Number(row[idx['call_duration_sec']] || 0);
      var status   = String(row[idx['call_status']] || '');

      var dRec = ensureDaily(managerId, callStart);
      dRec.calls_total += 1;

      if (duration >= 30 && status === 'Успешный звонок') {
        dRec.calls_30s_plus += 1;
      }
    }
  }

  // После цикла по звонкам считаем вознаграждение за звонки и смены
  Object.keys(dailyMap).forEach(function (key) {
    var d = dailyMap[key];
    d.calls_reward_raw = d.calls_30s_plus * CALL_REWARD_PER_30S;
    if (d.calls_total > 0) {
      d.shift_flag = 1; // смена, если был хотя бы один звонок
    }
  });

  // --- helper: шкала премии от маржи (в долях, 0.3 = 30%) ---
  function calcMarginBonusPercent(marginPct) {
    if (marginPct <= 0) return 0;

    if (marginPct < 0.25) {
      return 0.02; // 2%
    }
    if (marginPct < 0.30) {
      // 25–30%: 5–7%
      return 0.05 + (marginPct - 0.25) * (0.07 - 0.05) / (0.30 - 0.25);
    }
    if (marginPct < 0.40) {
      // 30–40%: 7–10%
      return 0.07 + (marginPct - 0.30) * (0.10 - 0.07) / (0.40 - 0.30);
    }
    if (marginPct < 0.45) {
      // 40–45%: 10–12%
      return 0.10 + (marginPct - 0.40) * (0.12 - 0.10) / (0.45 - 0.40);
    }
    return 0.12; // >45%: 12%
  }

  // ===== 2. Агрегация маржи, премии от маржи и КП из Deals =====

  var dealsData = ssDeals.getDataRange().getValues();
  if (dealsData.length > 1) {
    var dh = dealsData[0];
    var di = {};
    for (var j = 0; j < dh.length; j++) {
      di[String(dh[j]).toLowerCase()] = j;
    }

    for (var r2 = 1; r2 < dealsData.length; r2++) {
      var row2 = dealsData[r2];

      var managerId2 = Number(row2[di['assigned_by_id']] || 0);
      if (!managerId2) continue;
      
      // FIX: Пропускаем менеджеров, которых нет в активных sales
      if (!activeManagersSet[managerId2]) continue;

      var marginRub   = Number(row2[di['margin_rub']]   || 0);
      var saleAmount  = Number(row2[di['sale_amount']]  || 0);
      if (saleAmount <= 0 || marginRub <= 0) continue;

      // margin_pct в таблице как доля (0.4 = 40%)
      var marginPct = Number(row2[di['margin_pct']] || 0);

      var prepayAmount  = Number(row2[di['prepay_amount']] || 0);
      var prepayDate    = row2[di['prepay_date']];
      var finalAmount   = Number(row2[di['final_payment_amount']] || 0);
      var finalDate     = row2[di['final_payment_date']];
      var kpDate        = row2[di['kp_date']];            // отправка КП
      var kpApprovedDate = row2[di['kp_approved_date']];  // согласовано КП (может пригодиться далее)

      var premPercent = calcMarginBonusPercent(marginPct);

      // --- 2.1. KPI по КП: считаем по дате отправки КП ---
      if (kpDate && (kpDate instanceof Date)) {
        var dKp = ensureDaily(managerId2, kpDate);
        dKp.kp_sent_count += 1;
        dKp.kp_reward_raw += KPI_KP_RATE;
        dKp.shift_flag = 1; // если отправлял КП, смена точно была
      }

      // --- helper: учёт одной оплаты (аванс или финал) ---
      function applyPayment(paymentAmount, paymentDate, isFinal) {
        if (!paymentAmount || !paymentDate || !(paymentDate instanceof Date)) return;

        var payPart = paymentAmount / saleAmount; // доля оплаты
        if (payPart <= 0) return;

        var marginPart = marginRub * payPart;          // оплаченная маржа
        var bonusPart  = marginPart * premPercent;     // премия от маржи за эту оплату

        var dPay = ensureDaily(managerId2, paymentDate);
        dPay.margin_rub_total += marginPart;
        dPay.margin_bonus_raw += bonusPart;
        dPay.shift_flag = 1;

        // high margin KPI: считаем по факту полной сделки (финальная оплата)
        if (isFinal && marginPct >= HIGH_MARGIN_THRESHOLD) {
          dPay.high_margin_deals_count  += 1;
          dPay.high_margin_reward_raw   += HIGH_MARGIN_DEAL_REWARD;
        }
      }

      // 2.2. Учитываем предоплату и финальную оплату
      applyPayment(prepayAmount, prepayDate, false);
      applyPayment(finalAmount, finalDate, true);
    }
  }

  // ===== 3. Выгружаем dailyMap в KPI_Daily =====
  var keys = Object.keys(dailyMap);
  keys.sort(function (a, b) {
    var da = dailyMap[a].date.getTime();
    var db = dailyMap[b].date.getTime();
    if (da === db) return dailyMap[a].manager_id - dailyMap[b].manager_id;
    return da - db;
  });

  var out = [];
  for (var k = 0; k < keys.length; k++) {
    var drow = dailyMap[keys[k]];
    out.push([
      drow.date,
      drow.manager_id,
      drow.manager_name,
      drow.calls_total,
      drow.calls_30s_plus,
      drow.calls_reward_raw,
      drow.kp_sent_count,
      drow.kp_reward_raw,
      drow.high_margin_deals_count,
      drow.high_margin_reward_raw,
      drow.margin_rub_total,
      drow.margin_bonus_raw,
      drow.shift_flag
    ]);
  }

  if (out.length) {
    ssDaily.getRange(2, 1, out.length, headers.length).setValues(out);
  }

  Logger.log('rebuildKpiDaily: готово строк: ' + out.length);
}

// Шкала премии от маржи (marginPct в долях, 0.3 = 30%)
function calcMarginBonusPercent(marginPct) {
  if (marginPct <= 0) return 0;

  if (marginPct < 0.25) {
    return 0.02; // 2%
  }
  if (marginPct < 0.30) {
    // 25–30%: 5–7%
    return 0.05 + (marginPct - 0.25) * (0.07 - 0.05) / (0.30 - 0.25);
  }
  if (marginPct < 0.40) {
    // 30–40%: 7–10%
    return 0.07 + (marginPct - 0.30) * (0.10 - 0.07) / (0.40 - 0.30);
  }
  if (marginPct < 0.45) {
    // 40–45%: 10–12%
    return 0.10 + (marginPct - 0.40) * (0.12 - 0.10) / (0.45 - 0.40);
  }
  return 0.12; // >45%: 12%
}
