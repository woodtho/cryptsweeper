import { ui } from '../engine/engine.js';

export function Toasts() {
  if (!ui.toasts.length) return null;
  return (
    <div className="toastwrap" role="status" aria-live="polite" aria-atomic="false">
      {ui.toasts.map(t => (
        <div key={t.id} className={`toast ${t.bad ? 'bad' : ''}`}>{t.msg}</div>
      ))}
    </div>
  );
}
