/**
 * sync_stagehistory.gs
 *
 * Листы:
 *  - StageHistory_Raw
 *  - StageHistory_Daily
 *
 * Script Properties:
 *  - BITRIX_WEBHOOK_BASE = https://<portal>.bitrix24.ru/rest/<user>/<token>
 */

const SH_RAW = 'StageHistory_Raw';
const SH_DAILY = 'StageHistory_Daily';
const SH_PROP_LASTSYNC = 'LASTSYNC_STAGEHISTORY';

// ВКЛ/ВЫКЛ дотягивание ответственного через crm.deal.get / crm.lead.get
const SH_ENRICH_ASSIGNED_FALLBACK = true;

// -------------------- PUBLIC --------------------

function stagehistory_setupSheets() {
  ensureSheet_(SH_RAW, [
    'id',
    'entityTypeId',     // 1=lead, 2=deal
    'ownerId',
    'createdTime',
    'movedById',
    'responsibleId',
    'stageIdFrom',
    'stageIdTo'
  ]);

  ensureSheet_(SH_DAILY, [
    'date',
    'managerId',        // responsibleId (или movedById если responsibleId пуст)
    'entityTypeId',
    'stage_changes'
  ]);

  Logger.log('✅ stagehistory_setupSheets done');
}

/** debug: тянем 1 страницу и печатаем 1 элемент */
function stagehistory_debug_pullOne() {
  const sinceIso = toIso_(new Date(Date.now() - 7 * 24 * 3600 * 1000));

  const params = {
    'entityTypeId': 2,
    'filter[>=CREATED_TIME]': sinceIso,
    'order[ID]': 'DESC',
    'start': 0
  };

  const json = bxCallForm_('crm.stagehistory.list', params);
  const result = json.result || {};
  const items = result.items || [];

  Logger.log(`=== stagehistory_debug_pullOne since ${sinceIso} ===`);
  Logger.log(`items length: ${items.length}`);

  if (!items.length) {
    Logger.log('⚠️ No items returned');
    return;
  }

  Logger.log('=== SAMPLE ITEM (keys) ===');
  Logger.log(Object.keys(items[0]));

  Logger.log('=== SAMPLE ITEM (json) ===');
  Logger.log(JSON.stringify(items[0], null, 2));
}

/** принудительно синк за 7 дней */
function stagehistory_syncAll_force7d() {
  const props = PropertiesService.getScriptProperties();
  const sinceIso = toIso_(new Date(Date.now() - 7 * 24 * 3600 * 1000));

  Logger.log(`=== stagehistory_syncAll_force7d since ${sinceIso} ===`);

  const assignedCache = {};

  const all = []
    .concat(stagehistory_pull_(1, sinceIso, assignedCache)) // lead
    .concat(stagehistory_pull_(2, sinceIso, assignedCache)); // deal

  if (!all.length) {
    Logger.log('ℹ️ No stagehistory rows');
    return;
  }

  const maxTs = stagehistory_writeRaw_(all);
  props.setProperty(SH_PROP_LASTSYNC, new Date(maxTs + 1000).toISOString());
  Logger.log(`✅ ${SH_PROP_LASTSYNC} set to ${props.getProperty(SH_PROP_LASTSYNC)}`);
}

/** пересборка daily за 7 дней (полная очистка daily) */
function stagehistory_rebuildDaily_force7d() {
  const sinceIso = toIso_(new Date(Date.now() - 7 * 24 * 3600 * 1000));
  Logger.log(`=== stagehistory_rebuildDaily_force7d since ${sinceIso} ===`);
  stagehistory_rebuildDailyFromRaw_full_(sinceIso);
}

/**
 * Сброс raw (оставляет заголовки) + пересинк 7 дней + rebuild daily.
 * Используй 1 раз при старте/починке.
 */
function stagehistory_resetRaw_and_resync_force7d() {
  const raw = SpreadsheetApp.getActive().getSheetByName(SH_RAW);
  if (!raw) throw new Error(`Sheet not found: ${SH_RAW}`);

  const lastRow = raw.getLastRow();
  if (lastRow > 1) {
    raw.getRange(2, 1, lastRow - 1, raw.getLastColumn()).clearContent();
  }
  Logger.log(`🧹 Cleared ${SH_RAW} rows (kept headers)`);

  stagehistory_syncAll_force7d();
  stagehistory_rebuildDaily_force7d();
}

/**
 * Инкрементальный sync по SH_PROP_LASTSYNC.
 * Это основная функция для триггера.
 */
function stagehistory_syncAll() {
  const props = PropertiesService.getScriptProperties();

  const last = props.getProperty(SH_PROP_LASTSYNC);
  const sinceDate = last ? new Date(last) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const sinceIso = toIso_(sinceDate);

  Logger.log(`=== stagehistory_syncAll since ${sinceIso} (prop=${last || 'empty'}) ===`);

  const assignedCache = {};

  const all = []
    .concat(stagehistory_pull_(1, sinceIso, assignedCache))
    .concat(stagehistory_pull_(2, sinceIso, assignedCache));

  if (!all.length) {
    Logger.log('ℹ️ No stagehistory rows. Skipping write and keeping LASTSYNC unchanged.');
    return;
  }

  const maxTs = stagehistory_writeRaw_(all);

  // Двигаем lastsync только по факту полученных данных
  props.setProperty(SH_PROP_LASTSYNC, new Date(maxTs + 1000).toISOString());
  Logger.log(`✅ ${SH_PROP_LASTSYNC} set to ${props.getProperty(SH_PROP_LASTSYNC)}`);
}

/**
 * Частичная пересборка daily: пересчитывает только период (date >= since),
 * удаляя из daily старые строки за этот период и записывая новые.
 * Это основная функция для триггера.
 */
function stagehistory_rebuildDaily_sinceProp() {
  const props = PropertiesService.getScriptProperties();
  const last = props.getProperty(SH_PROP_LASTSYNC);

  // daily витрина = последние 90 дней
const sinceDate = new Date(Date.now() - 90 * 24 * 3600 * 1000);

  const sinceIso = toIso_(sinceDate);

  Logger.log(`=== stagehistory_rebuildDaily_sinceProp since ${sinceIso} ===`);
  stagehistory_rebuildDailyFromRaw_partial_(sinceIso);
}

// -------------------- INTERNAL: pull + pagination --------------------

function stagehistory_pull_(entityTypeId, sinceIso, assignedCache) {
  const out = [];
  let start = 0;
  let guard = 0;

  while (true) {
    guard++;
    if (guard > 500) throw new Error('Pagination guard triggered (>500 pages)');

    const params = {
      'entityTypeId': entityTypeId,
      'filter[>=CREATED_TIME]': sinceIso,
      'order[ID]': 'ASC',
      'start': start
    };

    const json = bxCallForm_('crm.stagehistory.list', params);
    const result = json.result || {};
    const items = result.items || [];

    out.push(...items);

    const next = result.next;
    if (next === undefined || next === null || next === 0) break;
    start = next;
  }

  Logger.log(`✅ Pulled ${out.length} stagehistory rows entityTypeId=${entityTypeId}`);

  let enriched = 0;
  let stillNoResponsible = 0;

  const mapped = out.map(it => {
    const movedBy =
      it.MOVED_BY_ID || it.MOVED_BY || it.CREATED_BY_ID || it.CREATED_BY || it.AUTHOR_ID || it.USER_ID || '';

    let responsible =
      it.RESPONSIBLE_ID || it.ASSIGNED_BY_ID || it.ASSIGNED_BY || it.RESPONSIBLE || '';

    const ownerId = String(it.OWNER_ID || it.OWNERID || '');
    const fromStage = it.STAGE_ID_FROM || it.STAGE_FROM || it.STAGE_ID || '';
    const toStage = it.STAGE_ID_TO || it.STAGE_TO || it.STAGE_ID || '';

    if (SH_ENRICH_ASSIGNED_ASSIGNED_OFF_(responsible, ownerId)) {
      const assigned = getAssignedForEntityCached_(entityTypeId, ownerId, assignedCache);
      if (assigned) {
        responsible = assigned;
        enriched++;
      } else {
        stillNoResponsible++;
      }
    } else if (!responsible && ownerId) {
      stillNoResponsible++;
    }

    return {
      id: String(it.ID || ''),
      entityTypeId: String(entityTypeId),
      ownerId: ownerId,
      createdTime: String(it.CREATED_TIME || it.DATE_CREATE || it.CREATED || ''),
      movedById: String(movedBy || ''),
      responsibleId: String(responsible || ''),
      stageIdFrom: String(fromStage || ''),
      stageIdTo: String(toStage || '')
    };
  });

  Logger.log(`ℹ️ entityTypeId=${entityTypeId} enrichedResponsible=${enriched}, stillNoResponsible=${stillNoResponsible}`);

  return mapped;
}

function SH_ENRICH_ASSIGNED_ASSIGNED_OFF_(responsible, ownerId) {
  if (!SH_ENRICH_ASSIGNED_FALLBACK) return false;
  if (responsible) return false;
  if (!ownerId) return false;
  return true;
}

// -------------------- INTERNAL: enrich responsible via deal.get / lead.get --------------------

function getAssignedForEntityCached_(entityTypeId, ownerId, cache) {
  const key = `${String(entityTypeId)}:${String(ownerId)}`;
  if (!ownerId) return '';

  if (cache[key] !== undefined) return cache[key];

  try {
    let assigned = '';

    if (String(entityTypeId) === '2') {
      const res = bxCallForm_('crm.deal.get', { id: String(ownerId) });
      assigned = res?.result?.ASSIGNED_BY_ID ? String(res.result.ASSIGNED_BY_ID) : '';
    } else if (String(entityTypeId) === '1') {
      const res = bxCallForm_('crm.lead.get', { id: String(ownerId) });
      assigned = res?.result?.ASSIGNED_BY_ID ? String(res.result.ASSIGNED_BY_ID) : '';
    }

    cache[key] = assigned || '';
    return cache[key];
  } catch (e) {
    cache[key] = '';
    Logger.log(`⚠️ getAssignedForEntityCached_ failed entityTypeId=${entityTypeId} ownerId=${ownerId}: ${e.message}`);
    return '';
  }
}

// -------------------- INTERNAL: write raw --------------------

function stagehistory_writeRaw_(rows) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SH_RAW);
  if (!sh) throw new Error(`Sheet not found: ${SH_RAW}`);

  const lastRow = sh.getLastRow();
  const existingIds = new Set();

  if (lastRow >= 2) {
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    ids.forEach(v => { if (v) existingIds.add(String(v)); });
  }

  const out = [];
  let maxTs = 0;

  for (const r of rows) {
    if (!r.id || existingIds.has(r.id)) continue;

    out.push([
      r.id,
      r.entityTypeId,
      r.ownerId,
      r.createdTime,
      r.movedById,
      r.responsibleId,
      r.stageIdFrom,
      r.stageIdTo
    ]);

    const ts = safeParseTs_(r.createdTime);
    if (ts) maxTs = Math.max(maxTs, ts);
  }

  if (out.length) {
    sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
  }

  Logger.log(`✅ stagehistory_writeRaw_: appended=${out.length}, skippedDuplicates=${rows.length - out.length}`);
  if (!maxTs) maxTs = Date.now();
  return maxTs;
}

// -------------------- INTERNAL: rebuild daily (full) --------------------

function stagehistory_rebuildDailyFromRaw_full_(sinceIso) {
  const raw = SpreadsheetApp.getActive().getSheetByName(SH_RAW);
  const daily = SpreadsheetApp.getActive().getSheetByName(SH_DAILY);
  if (!raw || !daily) throw new Error('Missing StageHistory sheets. Run stagehistory_setupSheets first.');

  const sinceTs = safeParseTs_(sinceIso);
  const values = raw.getDataRange().getValues();
  if (values.length < 2) {
    Logger.log('ℹ️ StageHistory_Raw is empty');
    return;
  }

  const header = values[0].map(h => String(h || '').trim());
  const col = {};
  header.forEach((h, i) => col[h] = i);

  ['createdTime', 'entityTypeId', 'movedById', 'responsibleId'].forEach(r => {
    if (col[r] === undefined) throw new Error(`StageHistory_Raw missing column: ${r}`);
  });

  let parsed = 0, skippedNoDate = 0, skippedNoManager = 0;
  const map = new Map(); // key=date|manager|entityTypeId

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const created = row[col.createdTime];
    const ts = safeParseTs_(created);

    if (!ts) { skippedNoDate++; continue; }
    if (ts < sinceTs) continue;

    const date = new Date(ts).toISOString().slice(0, 10);

    const responsibleId = String(row[col.responsibleId] || '').trim();
    const movedById = String(row[col.movedById] || '').trim();
    const managerId = responsibleId || movedById;

    if (!managerId) { skippedNoManager++; continue; }

    const entityTypeId = String(row[col.entityTypeId] || '').trim();
    const key = `${date}|${managerId}|${entityTypeId}`;
    map.set(key, (map.get(key) || 0) + 1);
    parsed++;
  }

  daily.clearContents();
  daily.getRange(1, 1, 1, 4).setValues([['date','managerId','entityTypeId','stage_changes']]);
  daily.setFrozenRows(1);

  const out = Array.from(map.entries())
    .map(([k, v]) => {
      const [date, managerId, entityTypeId] = k.split('|');
      return [date, managerId, entityTypeId, v];
    })
    .sort((a, b) => (a[0] === b[0] ? String(a[1]).localeCompare(String(b[1])) : String(a[0]).localeCompare(String(b[0]))));

  if (out.length) daily.getRange(2, 1, out.length, 4).setValues(out);

  Logger.log(`✅ StageHistory_Daily rebuilt rows=${out.length}`);
  Logger.log(`ℹ️ parsedRows=${parsed}, skippedNoDate=${skippedNoDate}, skippedNoManager=${skippedNoManager}`);
}

// -------------------- INTERNAL: rebuild daily (partial) --------------------

function stagehistory_rebuildDailyFromRaw_partial_(sinceIso) {
  const raw = SpreadsheetApp.getActive().getSheetByName(SH_RAW);
  const daily = SpreadsheetApp.getActive().getSheetByName(SH_DAILY);
  if (!raw || !daily) throw new Error('Missing StageHistory sheets. Run stagehistory_setupSheets first.');

  const sinceTs = safeParseTs_(sinceIso);
  const sinceDateStr = new Date(sinceTs).toISOString().slice(0, 10);

  const values = raw.getDataRange().getValues();
  if (values.length < 2) {
    Logger.log('ℹ️ StageHistory_Raw is empty');
    return;
  }

  const header = values[0].map(h => String(h || '').trim());
  const col = {};
  header.forEach((h, i) => col[h] = i);

  ['createdTime', 'entityTypeId', 'movedById', 'responsibleId'].forEach(r => {
    if (col[r] === undefined) throw new Error(`StageHistory_Raw missing column: ${r}`);
  });

  let parsed = 0, skippedNoDate = 0, skippedNoManager = 0;
  const map = new Map();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const created = row[col.createdTime];
    const ts = safeParseTs_(created);

    if (!ts) { skippedNoDate++; continue; }
    if (ts < sinceTs) continue;

    const date = new Date(ts).toISOString().slice(0, 10);

    const responsibleId = String(row[col.responsibleId] || '').trim();
    const movedById = String(row[col.movedById] || '').trim();
    const managerId = responsibleId || movedById;

    if (!managerId) { skippedNoManager++; continue; }

    const entityTypeId = String(row[col.entityTypeId] || '').trim();
    const key = `${date}|${managerId}|${entityTypeId}`;
    map.set(key, (map.get(key) || 0) + 1);
    parsed++;
  }

  // header в daily
  if (daily.getLastRow() === 0) {
    daily.getRange(1, 1, 1, 4).setValues([['date','managerId','entityTypeId','stage_changes']]);
    daily.setFrozenRows(1);
  } else {
    const head = daily.getRange(1, 1, 1, 4).getValues()[0];
    if (String(head[0] || '').trim() !== 'date') {
      daily.clearContents();
      daily.getRange(1, 1, 1, 4).setValues([['date','managerId','entityTypeId','stage_changes']]);
      daily.setFrozenRows(1);
    }
  }

  // читаем существующий daily, оставляем только даты < sinceDateStr
  const dailyValues = daily.getDataRange().getValues();
  const keep = [];
  for (let i = 1; i < dailyValues.length; i++) {
    const d = String(dailyValues[i][0] || '').trim();
    if (!d) continue;
    if (d < sinceDateStr) keep.push(dailyValues[i]);
  }

  const add = Array.from(map.entries()).map(([k, v]) => {
    const [date, managerId, entityTypeId] = k.split('|');
    return [date, managerId, entityTypeId, v];
  });

  const out = keep.concat(add).sort((a, b) => (a[0] === b[0] ? String(a[1]).localeCompare(String(b[1])) : String(a[0]).localeCompare(String(b[0]))));

  // очищаем содержимое ниже заголовка и пишем out
  if (daily.getLastRow() > 1) {
    daily.getRange(2, 1, daily.getLastRow() - 1, 4).clearContent();
  }
  if (out.length) {
    daily.getRange(2, 1, out.length, 4).setValues(out);
  }

  Logger.log(`✅ StageHistory_Daily partial rebuilt addRows=${add.length}, totalNow=${out.length}`);
  Logger.log(`ℹ️ parsedRows=${parsed}, skippedNoDate=${skippedNoDate}, skippedNoManager=${skippedNoManager}, sinceDate=${sinceDateStr}`);
}

// -------------------- BITRIX CALL (FORM / FLAT) --------------------

function bxCallForm_(method, flatParams) {
  const props = PropertiesService.getScriptProperties();
  const baseRaw = props.getProperty('BITRIX_WEBHOOK_BASE');
  if (!baseRaw) throw new Error('Missing Script Property BITRIX_WEBHOOK_BASE');

  const base = String(baseRaw).trim().replace(/\/$/, '');
  const url = base + '/' + method + '.json';

  const options = {
    method: 'post',
    payload: flatParams || {},
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch(url, options);
  const code = resp.getResponseCode();
  const text = resp.getContentText();

  if (code >= 400) throw new Error(`Bitrix HTTP ${code}: ${text}`);

  const json = JSON.parse(text);
  if (json.error) throw new Error(`Bitrix error: ${json.error} ${json.error_description || ''}`);
  return json;
}

// -------------------- UTILS --------------------

function ensureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  const existing = sh.getLastRow()
    ? sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0]
    : [];

  const needInit = !existing.length || String(existing[0] || '').trim() !== String(headers[0] || '').trim();
  if (needInit) {
    sh.clearContents();
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  }
}

function toIso_(d) {
  return new Date(d).toISOString();
}

function safeParseTs_(v) {
  if (!v) return 0;
  if (v instanceof Date) return v.getTime();
  const s = String(v).trim();
  const ts = Date.parse(s);
  return isNaN(ts) ? 0 : ts;
}
/**
 * stagehistory_auto.gs
 *
 * Триггеры:
 * - каждые 15 минут
 * - исполняется только Пн–Пт 09:00–19:00 по Москве
 *
 * Что делает тик:
 * 1) stagehistory_syncAll()          — инкремент raw по LASTSYNC_STAGEHISTORY
 * 2) stagehistory_rebuildDaily_sinceProp() — пересборка daily за последние 90 дней
 */

const SH_TZ = 'Europe/Moscow';
const SH_TICK_FN = 'stagehistory_tick';
const SH_SETUP_FN = 'stagehistory_setupAuto';

// --------------- PUBLIC ---------------

/**
 * Запусти 1 раз вручную:
 * - создаст листы (если надо)
 * - и создаст триггер каждые 15 минут
 */
function stagehistory_setupAuto() {
  // листы
  stagehistory_setupSheets();

  // init LASTSYNC если пусто
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(SH_PROP_LASTSYNC)) {
    const sinceIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    props.setProperty(SH_PROP_LASTSYNC, sinceIso);
    Logger.log(`✅ init ${SH_PROP_LASTSYNC}=${sinceIso}`);
  }

  // пересоздать только НАШИ триггеры
  stagehistory_resetAutoTriggers_();

  Logger.log('✅ stagehistory_setupAuto done');
}

/**
 * Это вызывает триггер.
 * Не дергай руками — только через триггер/тест.
 */
function stagehistory_tick() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25 * 1000)) {
    Logger.log('⚠️ stagehistory_tick skipped: lock busy');
    return;
  }

  try {
    if (!stagehistory_isWorkingTime_()) {
      Logger.log('ℹ️ Not working time (Mon–Fri 09–19 MSK). Skip.');
      return;
    }

    // 1) инкремент raw
    stagehistory_syncAll();

    // 2) daily = последние 90 дней
    stagehistory_rebuildDaily_sinceProp();

    Logger.log('✅ stagehistory_tick done');
  } finally {
    lock.releaseLock();
  }
}

// --------------- INTERNAL ---------------

function stagehistory_resetAutoTriggers_() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === SH_TICK_FN) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger(SH_TICK_FN)
    .timeBased()
    .everyMinutes(15)
    .create();

  Logger.log(`✅ Trigger created: ${SH_TICK_FN} every 15 minutes`);
}

function stagehistory_isWorkingTime_() {
  const now = new Date();
  const hour = Number(Utilities.formatDate(now, SH_TZ, 'HH'));
  const dow = Number(Utilities.formatDate(now, SH_TZ, 'u')); // 1..7 (Mon..Sun)

  // Пн–Пт
  if (dow === 6 || dow === 7) return false;

  // 09:00–19:00 (19:00 уже не включаем)
  return hour >= 9 && hour < 19;
}
