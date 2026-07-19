# CRYPTSWEEPER — vertical slice v0.3 (Vite + React)

A playable implementation of the *Cryptsweeper* design document (roguelite deckbuilder × Minesweeper).

## Run it
```
npm install
npm run dev      # dev server with HMR
npm run build    # production bundle in dist/
npm test         # headless engine smoke tests (42 assertions, no DOM)
```

## Architecture
- `src/engine/engine.js` — DOM-free game engine: no-guess board generator + constraint solver,
  all board verbs (Reveal/Detonate/Scan/Defuse/Chord/Entomb), combat loop, enemy turns, map,
  rewards, shop, camps, events. Exposes a tiny external store (`subscribe`/`getVersion`);
  every action mutates state then notifies.
- `src/engine/data.js` — content: strata, classes, 27 cards, 13 enemies + 3 bosses,
  10 trinkets, 5 gadgets, encounter tables. Card/enemy effects call engine verbs at play-time.
- `src/ui/` — React components subscribed via `useSyncExternalStore` (`useGame` hook):
  screens (title, map, combat, reward, camp, shop, event, puzzle, game over),
  `BoardView`/`Tile`, `CardView`, `ModalHost`, `Toasts`.
- `src/engine/sfx.js` — synthesized WebAudio sound effects (no audio assets): digs, cascades,
  detonations, scans, chords, card draws/plays, hits, board attacks, full-clear and victory/defeat
  stingers. Lazily initialized inside user gestures; mute toggle persisted to localStorage;
  no-ops in Node so the engine stays testable.
- `src/styles.css` — "carved crypt" theme: geometric chamfered-octagon plates (clip-path two-layer
  border technique), hexagonal map nodes / cost badges / trinkets, diamond energy sigil, chiseled
  faceted tiles, hatched entombed stone, abyss ground with vignette + striation texture, ember
  flicker (disabled under `prefers-reduced-motion`). Single-theme dark by design.
  Mobile: viewport-driven tile sizing, long-press to flag, sticky horizontally-scrolling hand.
  Animations: cards fan into an arc, deal in staggered from the draw pile, and fly off as ghosts
  when played (up) or discarded (down); tiles pop on reveal; craters flash; detonations shake the
  screen; enemy HP bars ease; modals pop in. All motion respects `prefers-reduced-motion`.

## Controls
- **Left-click** — reveal a tile · **Right-click** or Flag mode (`F`) — flag
- Click an enemy to target it · click a card, then its board target(s)
- `E` — end turn · `Esc` — cancel targeting / close dialogs

## Implemented
Three Delvers (Sapper / Surveyor / Terraformer) with starter decks, trinkets, and full card pools ·
Block vs Plating (mines pierce Block) · **Lairs** — every enemy nests in a tinted board region:
revealing a safe lair tile wounds its owner by the tile's number, a mine detonating there deals 10,
entombing deals 3, and killing the owner crumbles its lair open (mines defused, tiles revealed)
· Insight, constructs, Full Clear (50 damage to ALL enemies,
upgraded card reward, +15g — then the crypt re-seals with a fresh board; only kills win a combat)
· enemy board attacks (Lay/Fog/Scramble/Prime/Devour, constructs
soak them) · no-guess board generation (avg 100% provably solvable on 10×10/20) · Instinct safety
net (Depth 0) · 3 strata with branching tunnel maps, camps (Rest/Smith/Survey), shops, treasure,
3 events incl. the Honest Puzzle · elites (Ossuary Warden, The Miscounter, Detonata) and bosses
(The Collapser, The Fogfather, three-phase NN-99).

## Not yet implemented (from the doc)
The Vein / Detonator Keys (Act 4, The First Mine) · Depths 1–20 ascension ladder ·
per-class unlock drip · score-tracked provably-safe reveals.
