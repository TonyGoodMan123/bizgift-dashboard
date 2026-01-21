// =========================
// bitrixCall
// =========================
function bitrixCall(method, params) {
  var baseUrl = CFG.BITRIX_BASE_URL.replace(/\/$/, '');
  var webhook = CFG.WEBHOOK.replace(/^\//, '').replace(/\/$/, '');
  var url = baseUrl + '/' + webhook + '/' + method;

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(params || {}),
    muteHttpExceptions: true
  };

  var maxRetries = 5;
  for (var i = 0; i < maxRetries; i++) {
    var resp = UrlFetchApp.fetch(url, options);
    var code = resp.getResponseCode();
    var body = resp.getContentText();

    if (code === 200) {
      var data = JSON.parse(body);

      if (data.error) {
        throw new Error('Bitrix API Error: ' + data.error_description + ' (' + data.error + ')');
      }
      return data;
    }

    // API-лимиты Bitrix24
    if (code === 429 || code === 503) {
      Logger.log('Bitrix throttle ' + code + '. Waiting...');
      Utilities.sleep(1500 * (i + 1));
      continue;
    }

    throw new Error('HTTP Error ' + code + ': ' + body);
  }

  throw new Error('Bitrix call failed after ' + maxRetries + ' retries: ' + method);
}



// =========================
// bitrixListAll (пагинация)
// =========================
function bitrixListAll(method, params) {
  var result = [];
  var start = 0;
  var p = params || {};
  var hasNext = true;

  while (hasNext) {
    p.start = start;

    var response = bitrixCall(method, p);

    if (response.result && Array.isArray(response.result)) {
      result = result.concat(response.result);
    }

    if (response.next !== undefined) {
      start = response.next;
      Utilities.sleep(250);
    } else {
      hasNext = false;
    }
  }

  return result;
}
