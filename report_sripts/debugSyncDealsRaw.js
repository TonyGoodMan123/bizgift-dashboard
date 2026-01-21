function debugSyncDealsRaw() {
  var since = getIsoMonthsBack(6);   // последние 6 месяцев

  var deals = bitrixListAll('crm.deal.list', {
    order: { 'ID': 'ASC' },
    filter: {
      '>DATE_MODIFY': since,
      'CATEGORY_ID': CFG.CATEGORY_ID_SALES_V3   // <--- только воронка "Продажи v3"
    },
    select: [
      'ID','TITLE','DATE_CREATE','DATE_MODIFY',
      'STAGE_ID','ASSIGNED_BY_ID','SOURCE_ID','OPPORTUNITY','TYPE_ID',
      'UF_CRM_1762353679605', // Сумма закупа
      'UF_CRM_1762354173867', // Ссылка на КП
      'UF_CRM_1762354348239', // Дата отправки КП
      'UF_CRM_1762354503833', // Ссылка на согласованное КП
      'UF_CRM_1762354566000', // Дата согласования КП
      'UF_CRM_1762354687956', // Файл счёта
      'UF_CRM_1762354925643', // Оплата подтверждена
      'UF_CRM_1762355001162'  // Дата оплаты
    ]
  });

  Logger.log('Deals loaded: ' + deals.length);

  var sh = getSheet(CFG.SHEETS.DEALS);
  if (!sh) throw new Error('Sheet Deals not found');

  sh.clear();

  var header = [
    'deal_id','title','date_create','date_modify',
    'stage_id','assigned_by_id','source_id',
    'sale_amount','deal_type',
    'purchase_amount','margin_rub','margin_pct',
    'kp_link','kp_date','kp_approved_link',
    'kp_approved_date','contract_file',
    'payment_confirmed','payment_date'
  ];
  sh.getRange(1,1,1,header.length).setValues([header]);

  var out = deals.map(function(d) {
    var sale = Number(d.OPPORTUNITY || 0);
    var purchase = Number(d['UF_CRM_1762353679605'] || 0);
    var marginRub = sale - purchase;
    var marginPct = sale > 0 ? marginRub / sale * 100 : 0;

    return [
      Number(d.ID),
      d.TITLE || '',
      parseDate(d.DATE_CREATE),
      parseDate(d.DATE_MODIFY),
      d.STAGE_ID || '',
      Number(d.ASSIGNED_BY_ID || 0),
      d.SOURCE_ID || '',
      sale,
      d.TYPE_ID || '',
      purchase,
      marginRub,
      marginPct,
      d['UF_CRM_1762354173867'] || '',
      d['UF_CRM_1762354348239'] ? parseDate(d['UF_CRM_1762354348239']) : '',
      d['UF_CRM_1762354503833'] || '',
      d['UF_CRM_1762354566000'] ? parseDate(d['UF_CRM_1762354566000']) : '',
      d['UF_CRM_1762354687956'] || '',
      d['UF_CRM_1762354925643'] || '',
      d['UF_CRM_1762355001162'] ? parseDate(d['UF_CRM_1762355001162']) : ''
    ];
  });

  if (out.length) {
    sh.getRange(2, 1, out.length, header.length).setValues(out);
  }
}
