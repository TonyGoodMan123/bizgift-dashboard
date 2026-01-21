/**
 * Логирует только стадии воронки сделок CATEGORY_ID = 19 (C19:...)
 */
function debugListStagesCategory19_clean() {
  // тянем все статусы (как ты уже делал)
  var all = bitrixListAll('crm.status.list', {
    filter: {},          // фильтр можно оставить пустым
    order: { SORT: 'ASC' }
  });

  Logger.log('Всего статусов в аккаунте: ' + all.length);

  // оставляем только те, что относятся к воронке 19 (STATUS_ID начинается с "C19:")
  var stages19 = all.filter(function (s) {
    return String(s.STATUS_ID).indexOf('C19:') === 0;
  }).sort(function (a, b) {
    return (a.SORT || 0) - (b.SORT || 0);
  });

  Logger.log('Стадии воронки продаж v3 (CATEGORY_ID=19): ' + stages19.length);
  stages19.forEach(function (s) {
    Logger.log(
      Utilities.formatString(
        'stage_id: %s | name: %s | sort: %s',
        s.STATUS_ID,
        s.NAME,
        s.SORT
      )
    );
  });
}
