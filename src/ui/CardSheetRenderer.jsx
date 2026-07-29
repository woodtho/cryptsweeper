import { CARDS, CLASSES } from '../engine/data.js';
import { CardView } from './CardView.jsx';
import '../card-sheet.css';

export const CARD_SHEET_KEYS = [...Object.keys(CLASSES), 'neutral-special'];

const byName = (a, b) => CARDS[a].name.localeCompare(CARDS[b].name);
const card = (key, section, index) => ({
  id: `card-sheet-${section}-${key}-${index}`,
  key,
  up: 0,
});

function CardSection({ title, note, cardKeys, sectionKey }) {
  if (!cardKeys.length) return null;
  return (
    <section className="card-sheet-section">
      <div className="card-sheet-section-heading">
        <h2>{title}</h2>
        <span>{cardKeys.length} cards</span>
      </div>
      {note ? <p>{note}</p> : null}
      <div className="card-sheet-grid">
        {cardKeys.map((key, index) => (
          <CardView key={`${sectionKey}-${key}-${index}`} card={card(key, sectionKey, index)} />
        ))}
      </div>
    </section>
  );
}

function DelverSheet({ sheetKey, cls }) {
  const starterKeys = [...cls.deck];
  const rewardKeys = [...cls.rewardPool];
  const alreadyShown = new Set([...starterKeys, ...rewardKeys]);
  const additionalKeys = Object.entries(CARDS)
    .filter(([key, def]) => def.cls === sheetKey && !alreadyShown.has(key))
    .map(([key]) => key)
    .sort(byName);
  const uniqueCards = new Set([...starterKeys, ...rewardKeys, ...additionalKeys]).size;

  return (
    <main className="card-sheet" data-card-sheet-ready="true">
      <header className="card-sheet-header">
        <span className="card-sheet-kicker">FLAG THE DEEP · DELVER DECK CATALOG</span>
        <h1>{cls.name}</h1>
        <p>{cls.role}</p>
        <div className="card-sheet-summary">
          <span>{starterKeys.length} starter cards</span>
          <span>{rewardKeys.length} reward cards</span>
          <span>{uniqueCards} unique cards shown</span>
        </div>
      </header>
      <CardSection
        title="Starter deck"
        note="Exact starting draw pile. Duplicate cards are intentionally shown."
        cardKeys={starterKeys}
        sectionKey={`${sheetKey}-starter`}
      />
      <CardSection
        title="Curated reward pool"
        note="Cards this Delver can normally be offered after battle."
        cardKeys={rewardKeys}
        sectionKey={`${sheetKey}-rewards`}
      />
      <CardSection
        title="Additional class cards"
        note="Class cards present in the catalog but outside the current curated reward pool."
        cardKeys={additionalKeys}
        sectionKey={`${sheetKey}-additional`}
      />
      <footer>Base card faces · generated from the live game catalog</footer>
    </main>
  );
}

function NeutralSpecialSheet() {
  const neutralKeys = Object.entries(CARDS)
    .filter(([, def]) => def.cls === 'neutral')
    .map(([key]) => key)
    .sort(byName);
  const specialKeys = Object.entries(CARDS)
    .filter(([, def]) => !def.cls)
    .map(([key]) => key)
    .sort(byName);

  return (
    <main className="card-sheet" data-card-sheet-ready="true">
      <header className="card-sheet-header">
        <span className="card-sheet-kicker">FLAG THE DEEP · SHARED CARD CATALOG</span>
        <h1>NEUTRAL &amp; SPECIAL CARDS</h1>
        <p>Shared tools, Status cards, and persistent Curses.</p>
        <div className="card-sheet-summary">
          <span>{neutralKeys.length} neutral cards</span>
          <span>{specialKeys.length} status &amp; curse cards</span>
          <span>{neutralKeys.length + specialKeys.length} unique cards shown</span>
        </div>
      </header>
      <CardSection
        title="Neutral cards"
        note="Shared cards that may appear across Delver decks and rewards."
        cardKeys={neutralKeys}
        sectionKey="neutral"
      />
      <CardSection
        title="Status & curse cards"
        note="Special cards added by combat effects, hazards, and persistent conditions."
        cardKeys={specialKeys}
        sectionKey="special"
      />
      <footer>Base card faces · generated from the live game catalog</footer>
    </main>
  );
}

export function CardSheetRenderer({ sheetKey }) {
  const cls = CLASSES[sheetKey];
  if (cls) return <DelverSheet sheetKey={sheetKey} cls={cls} />;
  return <NeutralSpecialSheet />;
}
