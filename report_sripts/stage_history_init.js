// Одноразовая инициализация истории стадий на основе текущего листа Deals
// Вызываетcя вручную один раз: rebuildStageHistoryFromDeals()

function rebuildStageHistoryFromDeals() {
  var dealsSheet = getSheet(CFG.SHEETS.DEALS);
  var historySheet = getSheet(CFG.SHEETS.STAGE_HISTORY);

  // Гарантируем шапку для StageHistory
  initStageHistoryHeader();

  var dealsData = dealsSheet.getDataRange().getValues();
  if (dealsData.length < 2) {
    Logger.log('rebuildStageHistoryFromDeals: нет данных в Deals');
    return;
  }

  var header = dealsData[0];
  var idx = buildDealsIndex(header);

  var historyData = historySheet.getDataRange().getValues();
  var historyHeader = historyData[0];
  var hIdx = buildStageHistoryIndex(historyHeader);

  var rowsToAppend = [];

  for (var r = 1; r < dealsData.length; r++) {
    var row = dealsData[r];

    var dealId = row[idx.deal_id];
    var stageId = row[idx.stage_id];
    var assignedById = row[idx.assigned_by_id];
    var dateModify = row[idx.date_modify] || row[idx.date_create];

    if (!dealId || !stageId) continue;

    var outRow = new Array(historyHeader.length);
    outRow[hIdx.deal_id]       = dealId;
    outRow[hIdx.old_stage_id]  = '';
    outRow[hIdx.new_stage_id]  = stageId;
    outRow[hIdx.change_date]   = dateModify instanceof Date ? dateModify : (dateModify ? new Date(dateModify) : new Date());
    outRow[hIdx.assigned_by_id]= assignedById || 0;

    rowsToAppend.push(outRow);
  }

  if (rowsToAppend.length > 0) {
    historySheet.getRange(historySheet.getLastRow() + 1, 1, rowsToAppend.length, historyHeader.length)
      .setValues(rowsToAppend);
  }

  Logger.log('rebuildStageHistoryFromDeals: создано записей: ' + rowsToAppend.length);
}
