import { useEffect, useRef, useState } from 'react';
import { MECHANICS, mechanicKey } from './mechanics.js';

export function MechanicTooltip() {
  const [tip, setTip] = useState(null);
  const tipRef = useRef(null);

  useEffect(() => { tipRef.current = tip; }, [tip]);

  useEffect(() => {
    const findTerm = target => target?.closest?.('[data-mechanic], .kw');
    const show = (element, keepLocked = false) => {
      const key = mechanicKey(element?.dataset.mechanic || element?.textContent);
      if (!key) return;
      const rect = element.getBoundingClientRect();
      setTip(current => ({
        key, x: Math.min(window.innerWidth - 18, Math.max(18, rect.left + rect.width / 2)),
        y: rect.bottom + 9, locked: keepLocked || Boolean(current?.locked),
        history: current?.locked && current.key !== key ? [...(current.history || []), current.key] : (current?.history || []),
      }));
    };
    const onOver = event => {
      if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
      const element = findTerm(event.target);
      if (!element) return;
      setTip(current => {
        if (current?.locked && !element.closest('.mechanic-tooltip')) return current;
        const key = mechanicKey(element.dataset.mechanic || element.textContent);
        if (!key) return current;
        const rect = element.getBoundingClientRect();
        return { key, x: Math.min(window.innerWidth - 18, Math.max(18, rect.left + rect.width / 2)), y: rect.bottom + 9,
          locked: Boolean(current?.locked), history: current?.locked && current.key !== key ? [...(current.history || []), current.key] : (current?.history || []) };
      });
    };
    const onOut = event => {
      if (window.matchMedia('(hover: none), (pointer: coarse)').matches) return;
      if (!findTerm(event.target)) return;
      setTip(current => current?.locked ? current : null);
    };
    const onClick = event => {
      const close = event.target?.closest?.('.mechanic-tooltip-close');
      if (close) {
        event.preventDefault(); event.stopPropagation(); setTip(null); return;
      }
      const element = findTerm(event.target);
      const mobile = window.matchMedia('(hover: none), (pointer: coarse)').matches;
      if (mobile && element) {
        event.preventDefault(); event.stopPropagation();
        show(element, true);
        return;
      }
      if (mobile && tipRef.current?.locked && !event.target?.closest?.('.mechanic-tooltip')) {
        event.preventDefault(); event.stopPropagation(); setTip(null);
      }
    };
    const onFocus = event => { const element = findTerm(event.target); if (element) show(element); };
    const onKey = event => {
      if (event.key.toLowerCase() === 't' && tipRef.current) {
        event.preventDefault();
        setTip(current => current ? { ...current, locked: !current.locked } : current);
      } else if (event.key === 'Escape' && tipRef.current?.locked) setTip(null);
    };
    const onCloseRequest = () => setTip(null);
    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('cryptsweeper:close-tooltip', onCloseRequest);
    return () => {
      document.removeEventListener('pointerover', onOver); document.removeEventListener('pointerout', onOut);
      document.removeEventListener('focusin', onFocus); document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('cryptsweeper:close-tooltip', onCloseRequest);
    };
  }, []);

  if (!tip || !MECHANICS[tip.key]) return null;
  const entry = MECHANICS[tip.key];
  return (
    <aside className={`mechanic-tooltip ${tip.locked ? 'locked' : ''}`}
      style={{ left: tip.x, top: Math.max(10, Math.min(tip.y, window.innerHeight - 210)) }} role="tooltip">
      <div className="mechanic-tooltip-head">
        <b>{entry.name}</b>
        <span><kbd>T</kbd><button className="mechanic-tooltip-close" type="button" aria-label="Close tooltip">×</button></span>
      </div>
      <p>{entry.summary}</p>
      {tip.locked ? (
        <div className="mechanic-related">
          <small>Explore related mechanics</small>
          <div>{entry.related.map(key => <button key={key} data-mechanic={key}>{MECHANICS[key]?.name || key}</button>)}</div>
          <span>Press T to unpin · Esc to close</span>
        </div>
      ) : <span className="mechanic-pin-hint">Press T to pin and explore</span>}
    </aside>
  );
}
