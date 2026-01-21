function installTriggers() {
  // Сносим старые триггеры, чтобы не копились
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'runHourlySync' || fn === 'runDailySync') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Hourly trigger для синхронизации данных
  ScriptApp.newTrigger('runHourlySync')
    .timeBased()
    .everyHours(1)
    .create();
  
  // Daily trigger для синхронизации менеджеров (в 2 часа ночи)
  ScriptApp.newTrigger('runDailySync')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();

  Logger.log('Триггеры установлены: runHourlySync (каждый час) и runDailySync (раз в сутки в 02:00)');
}


// Эта функция вызывается триггером каждый час
function runHourlySync() {
  var now = new Date();

  // ВАЖНО: в настройках проекта укажи часовой пояс "Europe/Moscow"
  var hour = now.getHours(); // локальный час проекта

  // Работаем только с 09:00 до 19:59 включительно
  if (hour < 9 || hour > 19) {
    Logger.log('runHourlySync: вне рабочего окна, час=' + hour + ', выходим.');
    return;
  }

  Logger.log('runHourlySync: рабочее окно, час=' + hour + '. Запускаем синки.');

  // Инкрементальный синк сделок и звонков
  try {
    syncDealsIncremental();
  } catch (e) {
    Logger.log('runHourlySync: ошибка в syncDealsIncremental: ' + e);
  }

  try {
    syncCallsIncremental();
  } catch (e) {
    Logger.log('runHourlySync: ошибка в syncCallsIncremental: ' + e);
  }

  // Пересчёт KPI после синхронизации
  try {
    rebuildKpiDaily();
  } catch (e) {
    Logger.log('runHourlySync: ошибка в rebuildKpiDaily: ' + e);
  }
  
  try {
    rebuildKpiMonthly();
  } catch (e) {
    Logger.log('runHourlySync: ошибка в rebuildKpiMonthly: ' + e);
  }
}

// Эта функция вызывается триггером раз в сутки
function runDailySync() {
  Logger.log('runDailySync: запуск синхронизации менеджеров');
  
  try {
    syncManagers();
  } catch (e) {
    Logger.log('runDailySync: ошибка в syncManagers: ' + e);
  }
}
