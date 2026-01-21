function debugCallsSample() {
  // Берём звонки "как есть", без фильтров, первые по умолчанию
  var resp = bitrixCall('voximplant.statistic.get', {});

  Logger.log('Raw response: ' + JSON.stringify(resp, null, 2));

  if (resp.result && resp.result.length) {
    Logger.log('First call item: ' + JSON.stringify(resp.result[0], null, 2));
  } else {
    Logger.log('No calls returned');
  }
}
