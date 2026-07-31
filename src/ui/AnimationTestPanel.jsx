import { useRef, useState } from 'react';
import { AnimationSequenceEditor } from './AnimationSequenceEditor.jsx';
import { CutsceneComposer } from './CutsceneComposer.jsx';
import { useDialogFocus } from './useDialogFocus.js';

export function AnimationTestPanel({ onClose, initialTab = 'animation' }) {
  const [tab, setTab] = useState(initialTab);
  const dialogRef = useRef(null);
  useDialogFocus(dialogRef, onClose);

  return (
    <div className="overlay animation-test-overlay" onClick={event => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} tabIndex="-1" className="modal animation-test-panel" role="dialog" aria-modal="true" aria-label="Animation and cutscene editor">
        <header>
          <div><small>Sprite laboratory</small><h2>Animation editor</h2></div>
          <button className="btn" onClick={onClose}>Close ×</button>
        </header>
        <nav className="animation-editor-tabs" aria-label="Editor mode">
          <button className={`btn ${tab === 'animation' ? 'primary' : ''}`}
            onClick={() => setTab('animation')}>Animation sequence</button>
          <button className={`btn ${tab === 'cutscene' ? 'primary' : ''}`}
            onClick={() => setTab('cutscene')}>Cutscene composer</button>
        </nav>
        {tab === 'animation'
          ? <AnimationSequenceEditor onClose={onClose} />
          : <CutsceneComposer />}
      </section>
    </div>
  );
}
