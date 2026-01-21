/**
 * Логирует в Журнал всех активных пользователей Битрикс:
 * строками: ID | Имя | Фамилия
 */
function logBitrixManagers() {
  var rawUsers = bitrixListAll('user.get', {
    FILTER: { 'ACTIVE': 'Y' },
    SELECT: ['ID', 'NAME', 'LAST_NAME']
  });

  rawUsers.forEach(function(u) {
    var id = Number(u.ID);
    var name = (u.NAME || '').trim();
    var lastName = (u.LAST_NAME || '').trim();

    Logger.log(id + ' | ' + name + ' ' + lastName);
  });
}
