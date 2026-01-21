function debugDealUF() {
  var dealId = 25417; // <-- сюда подставь ID сделки, где точно заполнены оплаты
  var res = bitrixCall('crm.deal.get', { id: dealId });

  var d = res.result;
  var out = {};

  Object.keys(d).forEach(function(key) {
    if (key.indexOf('UF_CRM_') === 0 && d[key]) {
      out[key] = d[key];
    }
  });

  Logger.log(JSON.stringify(out, null, 2));
}
