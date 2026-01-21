function testBitrixProfile() {
  var url = CFG.BITRIX_BASE_URL + CFG.WEBHOOK + 'profile';
  var resp = UrlFetchApp.fetch(url);
  Logger.log(resp.getResponseCode());
  Logger.log(resp.getContentText());
}

function testBitrixDeals() {
  var url = CFG.BITRIX_BASE_URL + CFG.WEBHOOK +
    'crm.deal.list.json?select[0]=ID&select[1]=TITLE&start=0';
  var resp = UrlFetchApp.fetch(url);
  Logger.log(resp.getResponseCode());
  Logger.log(resp.getContentText());
}
