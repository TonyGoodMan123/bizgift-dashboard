function onOpen() {
  var ui = SpreadsheetApp.getUi();
  
  ui.createMenu('BizGift BI')
    
    // ---- СДЕЛКИ ----
    .addItem('Обновить сделки — ПОЛНЫЙ синк', 'syncDealsFull')
    .addItem('Обновить сделки — ИНКРЕМЕНТАЛЬНЫЙ синк', 'syncDealsIncremental')

    .addSeparator()

    // ---- ЗВОНКИ ----
    .addItem('Обновить звонки — ПОЛНЫЙ синк', 'syncCallsFull')
    .addItem('Обновить звонки — ИНКРЕМЕНТАЛЬНЫЙ синк', 'syncCallsIncremental')

    .addSeparator()
    
    // ---- МЕНЕДЖЕРЫ ----
    .addItem('👥 Синхронизировать менеджеров', 'syncManagers')
    .addItem('🔄 Сбросить кэш отделов', 'resetDeptCache')

    .addSeparator()

    // ---- ИСТОРИЯ СТАДИЙ ----
    .addItem('Обновить историю стадий', 'syncStageHistory')

    .addSeparator()

    // ---- KPI / АНАЛИТИКА ----
    .addItem('📊 Пересчитать KPI Daily', 'rebuildKpiDaily')
    .addItem('📊 Пересчитать KPI Monthly', 'rebuildKpiMonthly')

    .addSeparator()

    // ---- СЛУЖЕБНОЕ ----
    .addItem('Установить триггеры Cron', 'installTriggers')

    .addToUi();
}
