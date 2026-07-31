import { useRef } from 'react';
import { CARDS } from '../engine/data.js';
import { run, ui, closeModal, doUpgrade, doRemove } from '../engine/engine.js';
import { CardView } from './CardView.jsx';
import { decorateMechanics } from './mechanics.js';
import { GameIcon, IconText } from './gameIcons.jsx';
import { useDialogFocus } from './useDialogFocus.js';

export function ModalHost({ onPreferenceChange = () => {} }) {
  const m = ui.modal;
  const modalRef = useRef(null);
  useDialogFocus(modalRef, closeModal, Boolean(m));
  if (!m) return null;
  let body = null;
  if (m.kind === 'info') {
    body = (
      <>
        <h2><IconText>{m.title}</IconText></h2>
        <div dangerouslySetInnerHTML={{ __html: decorateMechanics(m.html) }} />
        <button className="btn primary" onClick={closeModal}>{m.btn || 'Continue'}</button>
      </>
    );
  } else if (m.kind === 'cleanup') {
    body = (
      <>
        <h2><GameIcon name="safe" /> Finish the board</h2>
        <p>Every enemy is defeated. Cards and enemy turns are now closed.</p>
        <p>Use your unlimited Picks to reveal every remaining safe tile. The reward opens when the board is complete.</p>
        <div className="modal-actions">
          <button className="btn primary" onClick={closeModal}>Continue clearing</button>
          <button className="btn" onClick={() => {
            onPreferenceChange('showCleanupPrompt', false);
            closeModal();
          }}>Don’t show again</button>
        </div>
      </>
    );
  } else if (m.kind === 'deck') {
    body = (
      <>
        <h2>Your deck ({run.deck.length})</h2>
        <div className="cardpick">
          {run.deck.map(c => <CardView key={c.id} card={c} />)}
        </div>
        <button className="btn" onClick={closeModal}>Close</button>
      </>
    );
  } else if (m.kind === 'pile') {
    body = (
      <>
        <h2>{m.which} ({m.cards.length})</h2>
        <div className="cardpick">
          {m.cards.length
            ? m.cards.map(c => <CardView key={c.id} card={c} />)
            : <p className="dim">Empty.</p>}
        </div>
        <button className="btn" onClick={closeModal}>Close</button>
      </>
    );
  } else if (m.kind === 'mechanic') {
    body = (
      <>
        <header className={`mechanic-page-head ${m.cls}`}>
          <small>Delver mechanic</small>
          <h2>{m.label}</h2>
          <strong>{m.value}</strong>
        </header>
        <section className="mechanic-page-help">
          <h3>How it works</h3>
          <p dangerouslySetInnerHTML={{ __html: decorateMechanics(m.help || m.detailLabel) }} />
          <div className="mechanic-page-state">
            <b>Current state</b>
            <span>{m.detailLabel}</span>
            {m.detailValue != null && <strong>{m.detailValue}</strong>}
          </div>
        </section>
        {Array.isArray(m.cards) && (
          <section className="mechanic-page-cards">
            <h3>{m.label} cards ({m.cards.length})</h3>
            <div className="cardpick">
              {m.cards.length
                ? m.cards.map((card, index) => <CardView key={card.id || `${card.key}-${index}`} card={card} />)
                : <p className="dim">No cards are here yet.</p>}
            </div>
          </section>
        )}
        <button className="btn primary mechanic-page-close" onClick={closeModal}>Back to battle</button>
      </>
    );
  } else if (m.kind === 'upgrade') {
    const upgradable = run.deck
      .map((c, i) => ({ c, i }))
      .filter(x => (x.c.up || 0) < 2 && CARDS[x.c.key].cost != null);
    body = (
      <>
        <h2><GameIcon name="upgrade" /> Upgrade a card</h2>
        <p className="sub">Previewing the next tier — pick one. Level 2 keeps the upgrade and costs 1 less Energy.</p>
        <div className="cardpick card-select-grid">
          {upgradable.map(x => (
            <CardView key={x.c.id} card={{ ...x.c, up: Math.min(2, (x.c.up || 0) + 1) }} onClick={() => doUpgrade(x.i)} />
          ))}
        </div>
        <button className="btn" onClick={closeModal}>Cancel</button>
      </>
    );
  } else if (m.kind === 'remove') {
    body = (
      <>
        <h2>Remove a card — {run.removalCost}g</h2>
        <div className="cardpick card-select-grid">
          {run.deck.map((c, i) => (
            <CardView key={c.id} card={c} onClick={() => doRemove(i)} />
          ))}
        </div>
        <button className="btn" onClick={closeModal}>Cancel</button>
      </>
    );
  }
  return (
    <div className="overlay" onClick={ev => { if (ev.target === ev.currentTarget) closeModal(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" tabIndex="-1"
        aria-label={m.kind === 'mechanic' ? `${m.label} mechanic details` : `${m.kind} dialog`}
        className={`modal ${m.kind === 'mechanic' ? 'mechanic-modal' : ''}`}>{body}</div>
    </div>
  );
}
