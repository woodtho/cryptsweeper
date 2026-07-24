# CryptSweeper

A mobile-first roguelite deckbuilder built around Minesweeper deduction.

**Play:** https://woodtho.github.io/cryptsweeper/

## Run it

```text
npm install
npm run dev           # Vite development server
npm test              # complete headless test suite
npm run build         # production bundle in dist/
npm run deploy        # bump patch version, build, and publish to GitHub Pages
npm run balance       # 100 oracle + 20 honest-policy runs per Delver
npm run bot           # JSON-lines bot on stdin/stdout
npm run android:sync  # build and copy web assets into Android
npm run android:run   # install/run on a connected device or emulator
npm run android:open  # open the native project in Android Studio
```

The Capacitor 8 Android wrapper uses application ID
`com.woodtho.cryptsweeper` and supports Android 7/API 24 or newer. Saves,
settings, achievements, the Graveyard, and local leaderboards live in
persistent WebView/browser storage.

## Current game

CryptSweeper has ten illustrated Delvers with distinct passives, trinkets,
starting resources, starter decks, and curated reward pools. Every starter
deck includes a zero-energy Chord card so the core deduction payoff is
available from the first battle.

Runs cross three finite strata and then enter the infinite Vein. The game
includes branching maps, shops, camps, treasure, 20 fiction-first events,
recurring Honest Puzzles, 13 regular enemies, elites, three core bosses, and
repeating Vein bosses. Boss relics, Vein boons, enemy modifiers, event threads,
achievements, challenge/daily runs, and per-Delver statistics extend the
run-to-run structure.

The Archive groups the indexes, achievements, Graveyard, saves, jukebox, and
speedrun boards. The Graveyard records victories as well as deaths. Speedrun
records are eligibility-checked and separated into standard, daily, and
individual challenge categories.

The tutorial is progressive: the guided first delve establishes the play loop
before the focused mechanics labs unlock. How to Play and the rules index are
searchable, with linked definitions for special terms.

## Controls

- Tap/click a tile to reveal it. Right-click, long-press, or press `F` to flag.
- Use **Inspect** or press `I` to inspect a tile without changing the board.
- Use the arrow keys to move board focus and `Enter`/`Space` to activate it.
- Click an enemy to target or inspect it; select a card before choosing any
  required board or enemy targets.
- Press `E` to end the turn and `Esc` to cancel targeting or close a dialog.
- Hover or focus a highlighted mechanic for its definition; `T` pins tooltips.

## Architecture

- `src/engine/engine.js` owns the DOM-free mutable game state and actions.
- `src/engine/data.js` contains Delvers, cards, enemies, strata, and encounters.
  Its effect functions reach engine verbs through `src/engine/runtime.js`,
  removing the former `data.js` ↔ `engine.js` circular import.
- `src/engine/events.js` contains the authored fiction-first event deck and
  mechanically distinct thread follow-ups.
- `src/bot/` provides a JSON command interface, class-aware policies, and the
  deterministic balance runner.
- `src/ui/` contains focused board, card, archive, tutorial, modal, and screen
  modules subscribed through `useSyncExternalStore`.
- `src/engine/sfx.js` supplies synthesized feedback and haptic cues.
- `src/engine/music.js` combines infinite-jukebox layers with recorded music.
  Recorded tracks are compressed and resolved through lazy dynamic imports,
  rather than being loaded with the initial app.

Browser-local autosave plus three named slots preserve complete runs, including
active combats. The date-derived daily seed makes the daily run reproducible.
Master, music, and SFX volumes are independently configurable.

## Bot and balance runner

Send one JSON object per line to `npm run bot`:

```json
{"cmd":"new","class":"sapper","seed":"optional-seed"}
{"cmd":"state"}
{"cmd":"actions"}
{"cmd":"act","action":{"type":"play-card","handIndex":0}}
{"cmd":"step","policy":"oracle"}
{"cmd":"run","policy":"honest","maxSteps":5000}
```

`oracle` is a repeatable content/balance policy that may inspect hidden mines.
`honest` chooses from player-visible information and guesses only when no
deduction is available. `npm run balance` executes at least 100 class-aware
oracle runs plus honest-policy runs for every Delver and writes
`balance-report.json`.

## Quality and release gates

`npm test` covers engine progression, all authored events, puzzle generation,
dependency boundaries, deployment ordering, controls, tutorial progression,
audio loading, and balance-runner configuration. GitHub Pages deployment runs
the complete suite before its production build.

Real-device checks are still required for Android lifecycle behaviour, touch
ergonomics, layout at display cutouts, haptic strength, and final audio balance.
Depths 1–20 ascension modifiers and automated browser/device end-to-end tests
remain future work.
