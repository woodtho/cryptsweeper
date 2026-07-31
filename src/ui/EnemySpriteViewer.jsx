import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { registerBackHandler } from './backNav.js';
import { enemySpriteKey } from './enemyIcons.jsx';
import { SpriteAnimation } from './SpriteAnimation.jsx';
import { useDialogFocus } from './useDialogFocus.js';

const STATES = [
  ['idle', 'Idle'],
  ['moving', 'Moving'],
  ['action', 'Action'],
  ['defeated', 'Defeated'],
];

export function EnemySpriteViewer({ enemyKey, title, onClose }) {
  const [motion, setMotion] = useState('idle');
  const dialogRef = useRef(null);
  const actorKey = enemySpriteKey(enemyKey);
  useDialogFocus(dialogRef, onClose);

  useEffect(() => registerBackHandler(() => {
    onClose();
    return true;
  }), [onClose]);

  return createPortal(
    <div className="enemy-sprite-viewer-overlay" onClick={event => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section ref={dialogRef} className="enemy-sprite-viewer" role="dialog" aria-modal="true"
        aria-labelledby="enemy-sprite-viewer-title" tabIndex="-1">
        <header>
          <div>
            <small>Enemy sprite archive</small>
            <h2 id="enemy-sprite-viewer-title">{title}</h2>
          </div>
          <button type="button" className="full-art-close" onClick={onClose}
            aria-label={`Close ${title} sprite viewer`}>×</button>
        </header>
        <div className="enemy-sprite-viewer-stage">
          <SpriteAnimation actorKey={actorKey} motion={motion}
            label={`${title}, ${STATES.find(([key]) => key === motion)?.[1]} state`} />
        </div>
        <div className="enemy-sprite-state-controls" role="group" aria-label={`${title} sprite state`}>
          {STATES.map(([key, label]) => <button key={key} type="button"
            className={motion === key ? 'selected' : ''}
            aria-pressed={motion === key}
            onClick={() => setMotion(key)}>{label}</button>)}
        </div>
      </section>
    </div>,
    document.body,
  );
}
