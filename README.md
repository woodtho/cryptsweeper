# CRYPTSWEEPER — vertical slice v0.3 (Vite + React)

A playable implementation of the *Cryptsweeper* design document (roguelite deckbuilder × Minesweeper).

**Play:** https://woodtho.github.io/cryptsweeper/

## Run it
```
npm install
npm run dev      # dev server with HMR
npm run build    # production bundle in dist/
npm run deploy   # bump patch version, build, and publish dist/ to gh-pages
npm test         # headless engine smoke tests (no DOM)
npm run bot      # JSON-lines bot on stdin/stdout
npm run balance  # 10 deterministic oracle-policy runs per Delver
npm run android:sync  # build and copy web assets into the Android project
npm run android:run   # build and run on an emulator or connected device
npm run android:open  # open the native project in Android Studio
```

## Android app

The native wrapper uses Capacitor 8 with application ID `com.woodtho.cryptsweeper` and supports
Android 7/API 24 or newer. Install Android Studio and its Android SDK, then run
`npm run android:sync` after web changes. Use `npm run android:run` for a connected device or
emulator, or `npm run android:open` to build and sign an APK/AAB in Android Studio. Browser-local
saves and settings use the Android WebView's persistent local storage inside the installed app.

## JSON bot

The bot drives the exported game actions used by the UI. Send one JSON object per line:

```json
{"cmd":"new","class":"sapper","seed":"optional-seed"}
{"cmd":"state"}
{"cmd":"actions"}
{"cmd":"act","action":{"type":"play-card","handIndex":0}}
{"cmd":"step","policy":"oracle"}
{"cmd":"run","policy":"oracle","maxSteps":5000}
```

`actions` returns the currently legal choices and `act` executes a selected choice, allowing an
external LLM or human controller to reason from visible tiles, enemy intents, deck, rewards, and
shops. `step` performs one built-in-policy action. `run` repeats the built-in policy
step policy until victory, defeat, a stall, or the step limit. Use `policy: "honest"` to prevent
the bot from reading hidden mines; the default `oracle` policy is intended for repeatable combat
and content balance tests. The latest 100-run snapshot is in `balance-report.json`.

## Architecture
- `src/engine/engine.js` — DOM-free game engine: no-guess board generator + constraint solver,
  all board verbs (Reveal/Detonate/Scan/Defuse/Chord/Entomb), combat loop, enemy turns, map,
  rewards, shop, camps, events. Exposes a tiny external store (`subscribe`/`getVersion`);
  every action mutates state then notifies.
- `src/engine/data.js` — content: strata, ten passive-driven Delvers, 200 cards, 13 enemies + 3 bosses,
  trinkets, gadgets, and encounter tables. Card/enemy effects call engine verbs at play-time.
- `src/bot/` — JSON command interface, single-step/continuous policies, and deterministic balance runner.
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

Browser-local autosave plus three named save slots preserve complete runs, including combats.
Persistent accessibility/display settings are stored separately. The daily challenge uses a
date-derived deterministic seed so its map and game rolls repeat for that day.

## Controls
- **Left-click** — reveal a tile · **Right-click** or Flag mode (`F`) — flag
- Click an enemy to target it · click a card, then its board target(s)
- `E` — end turn · `Esc` — cancel targeting / close dialogs
- Hover or focus a highlighted mechanic for a summary · `T` pins its tooltip so related terms can be explored

## Implemented
Ten illustrated Delvers, each with distinct cartoon portrait art, starter deck, combat passive,
trinket, and card pool · the first three begin available and seven unlock through persistent
cross-run achievements · 200 uniquely named cards · a current/max pick economy with temporary
pick gains, pick-spending attacks, combat-long max-pick trades, trinket bonuses, and camp training
that permanently raises the run's refill · linked mechanic glossary tooltips ·
Block vs Plating (mines pierce Block) · **Lairs** — every enemy nests in a tinted board region:
revealing a safe lair tile wounds its owner by the tile's number, a mine detonating there deals 10,
entombing deals 3, and killing the owner crumbles its lair open (mines defused, tiles revealed)
· Insight, constructs, Full Clear (50 damage to ALL enemies,
upgraded card reward, +15g — then the crypt re-seals with a fresh board; only kills win a combat)
· enemy board attacks (Lay/Fog/Scramble/Prime/Devour, constructs
soak them) · no-guess board generation (avg 100% provably solvable on 10×10/20) · Instinct safety
net (Depth 0) · 3 strata with branching tunnel maps, camps (Rest/Smith/Survey/Trail Training), shops, treasure,
3 events incl. the Honest Puzzle · elites (Ossuary Warden, The Miscounter, Detonata) and bosses
(The Collapser, The Fogfather, three-phase NN-99).

## Not yet implemented (from the doc)
The Vein / Detonator Keys (Act 4, The First Mine) · Depths 1–20 ascension ladder.
