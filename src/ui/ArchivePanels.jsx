import { useState } from 'react';
import { CLASSES } from '../engine/data.js';
import {
  ACHIEVEMENTS, CHALLENGES, loadAchievements, loadSpeedrunCategories,
} from '../engine/legacy.js';
import { formatRunTime } from '../engine/engine.js';

export function AchievementPanel() {
  const earned = loadAchievements();
  return <div className="achievement-grid">
    {Object.entries(ACHIEVEMENTS).map(([key, achievement]) => <article className={`achievement-stone ${earned[key] ? 'earned' : ''}`} key={key}>
      <span>{earned[key] ? '✦' : '◇'}</span><div><b>{earned[key] ? achievement.name : 'Uncarved stone'}</b><small>{achievement.desc}</small>
        {earned[key] && <time>{new Date(earned[key].earnedAt).toLocaleDateString()}</time>}</div>
    </article>)}
  </div>;
}

export function SpeedrunPanel() {
  const categories = loadSpeedrunCategories();
  const categoryKeys = ['standard', 'daily', ...Object.keys(CHALLENGES).map(key => `challenge:${key}`)];
  const [category, setCategory] = useState('standard');
  const board = categories[category] || {};
  const records = Object.values(board).flat();
  const overall = records.slice().sort((a, b) => a.durationMs - b.durationMs)[0];
  const categoryLabel = category === 'standard' ? 'Standard'
    : category === 'daily' ? 'Daily'
      : CHALLENGES[category.slice('challenge:'.length)]?.name || category;
  return <div className="speedrun-board">
    <header className="speedrun-board-head">
      <span>◷</span>
      <div><b>THE CLOCK BELOW · {categoryLabel}</b><small>Eligible active play time to defeat NN-99. Test Lab runs are excluded; locking or backgrounding pauses the clock.</small></div>
      <strong>{overall ? formatRunTime(overall.durationMs, true) : '—'}</strong>
    </header>
    <nav className="speedrun-categories" aria-label="Speedrun categories">
      {categoryKeys.map(key => <button type="button" className={category === key ? 'active' : ''} key={key} onClick={() => setCategory(key)}>
        {key === 'standard' ? 'Standard' : key === 'daily' ? 'Daily' : CHALLENGES[key.slice(10)]?.name || key}
      </button>)}
    </nav>
    <div className="speedrun-grid">
      {Object.entries(CLASSES).map(([key, cls]) => {
        const rows = board[key] || [];
        return <article className={`speedrun-card ${rows.length ? 'recorded' : 'empty'}`} key={key}>
          <header><span className={`speedrun-sigil ${key}`}>{cls.name.slice(0, 1)}</span><div><b>{cls.name}</b><small>{rows.length ? `${rows.length} recorded clear${rows.length === 1 ? '' : 's'}` : 'No completed descent'}</small></div><strong>{rows[0] ? formatRunTime(rows[0].durationMs, true) : '—'}</strong></header>
          {rows.length > 0 && <ol>{rows.slice(0, 3).map((row, index) => <li key={row.id}>
            <i>{index + 1}</i><time>{formatRunTime(row.durationMs, true)}</time>
            <span>{categoryLabel}</span><small>{new Date(row.endedAt).toLocaleDateString()}</small>
          </li>)}</ol>}
        </article>;
      })}
    </div>
  </div>;
}
