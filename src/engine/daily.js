/* CRYPTSWEEPER — daily challenge records.
   One entry per date key: attempts, best score, whether it was ever won, and
   whether a win happened on the actual calendar day ("on time") versus later.
   Any past date can be replayed — the daily seed is just the date string. */

const KEY = 'cryptsweeper.daily.v1';

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function loadDailyRecords() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function save(records) {
  try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* storage unavailable */ }
}

export function recordDailyAttempt(dateKey) {
  const records = loadDailyRecords();
  const rec = records[dateKey] || { attempts: 0, won: false, onTime: false, best: 0, cls: null };
  rec.attempts += 1;
  records[dateKey] = rec;
  save(records);
  return rec;
}

export function recordDailyResult(dateKey, { won, score, cls }) {
  const records = loadDailyRecords();
  const rec = records[dateKey] || { attempts: 0, won: false, onTime: false, best: 0, cls: null };
  if (score > rec.best) { rec.best = score; rec.cls = cls; }
  if (won) {
    rec.won = true;
    if (localDateKey() === dateKey) rec.onTime = true;
  }
  records[dateKey] = rec;
  save(records);
  return rec;
}
