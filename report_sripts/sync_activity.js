/****************************************************
 * BizGift Dashboard — Activity sync (Emails + CRM-work)
 *
 * Pulls from Bitrix24 REST:
 *   - crm.activity.list (EMAIL + TODO + TASKS_TASK)
 *
 * Writes to Google Sheets:
 *   - Activity_Raw   (event-level log)
 *   - Activity_Daily (daily aggregation by manager)
 *
 * Script Properties required:
 *   - BITRIX_WEBHOOK_BASE  e.g. https://vegapro.bitrix24.ru/rest/2559/0phof84rzogri0b2
 * Optional:
 *   - LASTSYNC_ACTIVITY    ISO datetime
 ****************************************************/

const ACT_SHEET_RAW = 'Activity_Raw';
const ACT_SHEET_DAILY = 'Activity_Daily';
const ACT_PROP_LASTSYNC = 'LASTSYNC_ACTIVITY';

// ---------- PUBLIC ENTRYPOINTS ----------

function activity_setupSheets() {
  ensureSheet_(ACT_SHEET_RAW, [
    'id',
    'kind',                 // email | crm_work
    'created',
    'last_updated',
    'responsible_id',
    'direction',            // 0/1/2 (Bitrix); for email often 1=in,2=out
    'completed',
    'status',
    'type_id',
    'provider_id',
    'provider_type_id',
    'subject',
    'owner_type_id',
    'owner_id',
    'comm_type',
    'comm_value'
  ]);

  ensureSheet_(ACT_SHEET_DAILY, [
    'date',                 // YYYY-MM-DD
    'responsible_id',
    'emails_in',
    'emails_out',
    'crm_todo',
    'crm_tasks',
    'crm_work_total',
    'emails_total',
    'events_total'
  ]);

  Logger.log('✅ activity_setupSheets done');
}

function activity_syncAll() {
  const props = PropertiesService.getScriptProperties();
  const last = props.getProperty(ACT_PROP_LASTSYNC);

  // Default: last 7 days if first run
  const since = last ? new Date(last) : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const sinceIso = toBxIso_(since);

  Logger.log(`=== activity_syncAll since ${sinceIso} ===`);

  const emails = activity_pull_(sinceIso, 'email', {
    'PROVIDER_TYPE_ID': 'EMAIL'
  });

  const crmWork = activity_pull_(sinceIso, 'crm_work', {
    'TYPE_ID': 6
    // We'll split TODO vs TASKS_TASK on provider_type_id
  });

  const all = [].concat(emails, crmWork);
  if (all.length === 0) {
    Logger.log('ℹ️ No new activities. Skipping write.');
    return;
  }

  const maxTs = activity_writeRaw_(all); // returns max created timestamp (ms)

  // lastSync = max + 1 sec (same as you did for calls)
  const newLast = new Date(maxTs + 1000);
  props.setProperty(ACT_PROP_LASTSYNC, newLast.toISOString());
  Logger.log(`✅ ${ACT_PROP_LASTSYNC} set to ${props.getProperty(ACT_PROP_LASTSYNC)}`);

  activity_rebuildDailyFromRaw_(sinceIso); // cheap aggregation from raw
}

// ---------- CORE PULL ----------

function activity_pull_(sinceIso, kind, extraFilter) {
  const filter = Object.assign({}, extraFilter || {}, {
    '>=CREATED': sinceIso
  });

  // Minimal set of fields we need. Bitrix allows "select".
  const params = {
    order: { 'CREATED': 'ASC' },
    filter: filter,
    select: [
      'ID', 'TYPE_ID', 'PROVIDER_ID', 'PROVIDER_TYPE_ID',
      'SUBJECT',
      'OWNER_TYPE_ID', 'OWNER_ID',
      'RESPONSIBLE_ID',
      'DIRECTION',
      'COMPLETED', 'STATUS',
      'CREATED', 'LAST_UPDATED',
      'COMMUNICATIONS'
    ]
  };

  const items = bxListAll_('crm.activity.list', params);
  Logger.log(`✅ Pulled ${items.length} items for kind=${kind}`);

  return items.map(it => normalizeActivity_(it, kind));
}

function normalizeActivity_(it, kind) {
  const comm = (it.COMMUNICATIONS && it.COMMUNICATIONS.length) ? it.COMMUNICATIONS[0] : null;

  return {
    id: String(it.ID || ''),
    kind: kind,
    created: String(it.CREATED || ''),
    last_updated: String(it.LAST_UPDATED || ''),
    responsible_id: String(it.RESPONSIBLE_ID || ''),
    direction: String(it.DIRECTION || ''),
    completed: String(it.COMPLETED || ''),
    status: String(it.STATUS || ''),
    type_id: String(it.TYPE_ID || ''),
    provider_id: String(it.PROVIDER_ID || ''),
    provider_type_id: String(it.PROVIDER_TYPE_ID || ''),
    subject: String(it.SUBJECT || ''),
    owner_type_id: String(it.OWNER_TYPE_ID || ''),
    owner_id: String(it.OWNER_ID || ''),
    comm_type: comm ? String(comm.TYPE || '') : '',
    comm_value: comm ? String(comm.VALUE || '') : ''
  };
}

// ---------- WRITE RAW ----------

function activity_writeRaw_(rows) {
  const sh = SpreadsheetApp.getActive().getSheetByName(ACT_SHEET_RAW);
  if (!sh) throw new Error(`Sheet not found: ${ACT_SHEET_RAW}`);

  // Build existing ID set to avoid duplicates (simple + reliable)
  const lastRow = sh.getLastRow();
  const existingIds = new Set();
  if (lastRow >= 2) {
    const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    ids.forEach(v => { if (v) existingIds.add(String(v)); });
  }

  const out = [];
  let maxTs = 0;

  rows.forEach(r => {
    if (!r.id || existingIds.has(r.id)) return;

    out.push([
      r.id,
      r.kind,
      r.created,
      r.last_updated,
      r.responsible_id,
      r.direction,
      r.completed,
      r.status,
      r.type_id,
      r.provider_id,
      r.provider_type_id,
      r.subject,
      r.owner_type_id,
      r.owner_id,
      r.comm_type,
      r.comm_value
    ]);

    const ts = Date.parse(r.created);
    if (!isNaN(ts)) maxTs = Math.max(maxTs, ts);
  });

  if (out.length) {
    sh.getRange(sh.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);
  }

  Logger.log(`✅ activity_writeRaw_: appended=${out.length}, skippedDuplicates=${rows.length - out.length}`);

  // Fallback if parse failed everywhere
  if (!maxTs) maxTs = Date.now();
  return maxTs;
}

// ---------- BUILD DAILY AGG ----------

function activity_rebuildDailyFromRaw_(sinceIso) {
  const raw = SpreadsheetApp.getActive().getSheetByName(ACT_SHEET_RAW);
  const daily = SpreadsheetApp.getActive().getSheetByName(ACT_SHEET_DAILY);
  if (!raw || !daily) throw new Error('Missing Activity sheets. Run activity_setupSheets first.');

  const sinceTs = Date.parse(sinceIso);
  const values = raw.getDataRange().getValues();
  if (values.length < 2) return;

  const idx = headerIndex_(values[0]);

  const map = new Map(); // key = date|responsible_id

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const created = row[idx.created];
    const ts = Date.parse(created);
    if (isNaN(ts) || ts < sinceTs) continue;

    const date = createdToDate_(created);
    const rid = String(row[idx.responsible_id] || '');
    if (!rid) continue;

    const kind = String(row[idx.kind] || '');
    const direction = String(row[idx.direction] || '');
    const providerType = String(row[idx.provider_type_id] || '');

    const key = `${date}|${rid}`;
    if (!map.has(key)) {
      map.set(key, {
        date,
        responsible_id: rid,
        emails_in: 0,
        emails_out: 0,
        crm_todo: 0,
        crm_tasks: 0,
        crm_work_total: 0,
        emails_total: 0,
        events_total: 0
      });
    }
    const agg = map.get(key);

    if (kind === 'email') {
      if (direction === '1') agg.emails_in++;
      else agg.emails_out++;
      agg.emails_total++;
      agg.events_total++;
    } else if (kind === 'crm_work') {
      if (providerType === 'TODO') agg.crm_todo++;
      else if (providerType === 'TASKS_TASK') agg.crm_tasks++;
      agg.crm_work_total++;
      agg.events_total++;
    }
  }

  // Пересобираем daily полностью (без дублей) — просто и надёжно
  daily.clearContents();
  daily.getRange(1, 1, 1, 9).setValues([[
    'date','responsible_id','emails_in','emails_out','crm_todo','crm_tasks','crm_work_total','emails_total','events_total'
  ]]);
  daily.setFrozenRows(1);

  if (map.size === 0) {
    Logger.log('ℹ️ activity_rebuildDailyFromRaw_: no rows for rebuild');
    return;
  }

  const out = Array.from(map.values())
    .sort((a, b) => (a.date === b.date ? a.responsible_id.localeCompare(b.responsible_id) : a.date.localeCompare(b.date)))
    .map(a => ([
      a.date,
      a.responsible_id,
      a.emails_in,
      a.emails_out,
      a.crm_todo,
      a.crm_tasks,
      a.crm_work_total,
      a.emails_total,
      a.events_total
    ]));

  daily.getRange(2, 1, out.length, out[0].length).setValues(out);
  Logger.log(`✅ Activity_Daily rebuilt rows=${out.length}`);
}

// ---------- BITRIX HELPERS (self-contained) ----------

function bxBase_() {
  const base = PropertiesService.getScriptProperties().getProperty('BITRIX_WEBHOOK_BASE');
  if (!base) throw new Error('Missing Script Property BITRIX_WEBHOOK_BASE');
  return String(base).replace(/\/$/, '');
}

function bxCallLocal_(method, params) {
  // If your project already has bxCall_ — use it.
  if (typeof bxCall_ === 'function') return bxCall_(method, params);

  const url = `${bxBase_()}/${method}.json`;
  const options = {
    method: 'post',
    payload: params || {},
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

function bxListAll_(method, params) {
  let start = 0;
  const out = [];
  let guard = 0;

  while (true) {
    guard++;
    if (guard > 200) throw new Error('Pagination guard triggered (too many pages)');

    const p = Object.assign({}, params || {}, { start: start });
    const json = bxCallLocal_(method, p);

    // Typical: { result: [...], total: N, next: M }
    const items = Array.isArray(json.result) ? json.result
      : (json.result && Array.isArray(json.result.result) ? json.result.result : []);

    out.push(...items);

    if (typeof json.next === 'number') {
      start = json.next;
      continue;
    }

    // Some endpoints return "total" but no next; in that case stop when less than page size
    if (!items.length) break;
    if (items.length < 50) break; // Bitrix default page size often 50
    start += items.length;
  }

  return out;
}

// ---------- SHEET HELPERS ----------

function ensureSheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
  } else {
    // if headers mismatch, we don't auto-rewrite to avoid destroying your data
  }
}

function headerIndex_(headers) {
  const idx = {};
  headers.forEach((h, i) => idx[String(h)] = i);
  return idx;
}

function createdToDate_(created) {
  // created like: 2026-01-28T17:25:27+03:00
  if (!created) return '';
  return String(created).slice(0, 10);
}

function toBxIso_(d) {
  // Bitrix accepts ISO strings with timezone; we send UTC ISO for filters
  return new Date(d).toISOString();
}
