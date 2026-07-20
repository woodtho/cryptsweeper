import { CARDS } from '../engine/data.js';
import { run, ui, closeModal, doUpgrade, doRemove } from '../engine/engine.js';
import { CardView } from './CardView.jsx';
import { decorateMechanics } from './mechanics.js';
import { GameIcon, IconText } from './gameIcons.jsx';

export function ModalHost() {
  const m = ui.modal;
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
  } else if (m.kind === 'upgrade') {
    const upgradable = run.deck
      .map((c, i) => ({ c, i }))
      .filter(x => !x.c.up && CARDS[x.c.key].cost != null);
    body = (
      <>
        <h2><GameIcon name="upgrade" /> Upgrade a card</h2>
        <p className="sub">Previewing upgraded versions — pick one.</p>
        <div className="cardpick">
          {upgradable.map(x => (
            <CardView key={x.c.id} card={{ ...x.c, up: 1 }} onClick={() => doUpgrade(x.i)} />
          ))}
        </div>
        <button className="btn" onClick={closeModal}>Cancel</button>
      </>
    );
  } else if (m.kind === 'remove') {
    body = (
      <>
        <h2>Remove a card — {run.removalCost}g</h2>
        <div className="cardpick">
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
      <div className="modal">{body}</div>
    </div>
  );
}
