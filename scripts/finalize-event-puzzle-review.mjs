import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXTRA_EVENT_CATALOG, CORE_BEHAVIORAL_EVENTS } from '../src/engine/events.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = path.join(root, 'docs/design/event-review-100.json');
const reportPath = path.join(root, 'docs/design/event-puzzle-review.md');
const review = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const live = { ...CORE_BEHAVIORAL_EVENTS, ...EXTRA_EVENT_CATALOG };
const clean = value => String(value || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();

for (const event of review.events) {
  const current = live[event.id];
  if (!current) throw new Error(`Review references missing event ${event.id}`);
  event.recommendedRevisedEventText = current.text;
  event.recommendedRevisedChoiceLabels = current.actions.map(action => action.label);
  event.recommendedRevisedResultText = 'One atmospheric action sentence, followed only by the exact HP, Gold, max-HP, card, upgrade, or gadget consequence that was actually applied.';
  event.mechanicalChangesRequired = 'Use the shared behavioral resolver. Hide outcome values before commitment; on profiles with investigation, reveal them only after its displayed Gold/HP cost is paid. Preserve state-scaled, distinct effects.';
  event.priority = 'essential — implemented';
}
fs.writeFileSync(jsonPath, `${JSON.stringify(review, null, 2)}\n`);

const rows = review.events.map(event => `| ${clean(event.eventName)} | ${clean(event.existingEventText)} | ${event.existingChoices.map(choice => clean(choice.label)).join(' / ')} | ${clean(event.existingOutcomes)} | ${event.containsTutorialOrExplanatoryLanguage ? 'Yes' : 'No'} | ${event.choicesRevealQualityTooClearly ? 'Yes' : 'No'} | ${event.resultInterpretsDecision ? 'Yes' : 'No'} | ${event.mechanicallyMeaningful ? 'Yes' : 'No'} | ${event.consistentlyDominant ? 'Yes' : 'No'} | ${clean(event.fairDespiteHiddenInformation)} | ${clean(event.recommendedRevisedEventText)} | ${event.recommendedRevisedChoiceLabels.map(clean).join(' / ')} | ${clean(event.recommendedRevisedResultText)} | ${clean(event.mechanicalChangesRequired)} | ${clean(event.priority)} |`).join('\n');

const ids = list => list.map(id => `${live[id]?.title || id} (\`${id}\`)`).join(', ');
const markdown = `# Event and puzzle review

This is the implementation audit for all 100 discoverable narrative events and all six embedded puzzle families. The machine-readable per-event record is [event-review-100.json](./event-review-100.json). It preserves the pre-revision copy and outcomes alongside the live revised presentation.

## Executive result

- Events reviewed: **${review.reviewedEvents} / ${Object.keys(live).length}**.
- Pre-revision tutorial-like events: **${review.tutorialLikeEvents.length}**.
- Pre-revision events with telegraphed choice consequences: **${review.choicesTelegraphingConsequences.length}**.
- Pre-revision interpretive result screens: **${review.interpretiveResultScreens.length}**.
- Mechanically dominant, meaningless, or fake two-choice events: **${review.dominantMeaninglessOrFakeChoices.length}**.
- Live puzzle families: **Minesweeper, Sudoku, crossword word squares, numeric sequences, Lights Out, and nonograms**.

## 1. Events that behaved like tutorials

All 100 events used the former shared result treatment, which named and explained a statistical or game-theory concept after the choice. The affected list is:

${ids(review.tutorialLikeEvents)}.

## 2. Revised versions

The exhaustive row-by-row revisions appear in the table below and in the JSON artifact. Live events now show a situation, two concrete actions, optional paid investigation on supported profiles, and direct applied consequences. Analytical reference metadata remains non-player-facing for design review only.

## 3. Choices that telegraphed consequences

The former shared view appended exact stakes or probabilities to both actions in all 100 events before commitment. Affected IDs: ${review.choicesTelegraphingConsequences.map(id => `\`${id}\``).join(', ')}. Live action descriptions are empty until the player buys an available investigation; only the investigation cost is disclosed beforehand.

## 4. Result screens that interpreted the choice

All 100 former result screens appended “What this tested,” the named concept, an explanation, and a grading disclaimer. Affected IDs: ${review.interpretiveResultScreens.map(id => `\`${id}\``).join(', ')}. The shared live resolver now emits atmosphere plus actual consequences only. The unreachable legacy tutorial resolver was removed.

## 5. Dominant, meaningless, or fake choices

No shared event profile has identical branches or a branch that dominates in every run state. The profiles exchange Gold, current HP, max HP, cards, upgrades, gadgets, certainty, and paid information; their value changes with current health, purse, deck, inventory capacity, and depth. The review did find many *labels* that implied the designer's preferred reasoning (for example “report honestly,” “price the tail risk,” and “precommit to the patient choice”). Those labels were replaced with concrete physical actions. Optional investigation is never free unless the player has no Gold, in which case it costs HP.

## Per-event review and revision

| Event | Existing text | Existing choices | Existing outcomes | Tutorial? | Telegraphs? | Interprets result? | Meaningful? | Dominant? | Hidden-info fairness | Revised text | Revised labels | Revised result | Mechanical change | Priority |
|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|---|---|---|
${rows}

## 6. Full puzzle inventory

| Family | Formal rules | Player actions | Generation | Validation | Difficulty | Input/accessibility |
|---|---|---|---|---|---|---|
| Minesweeper | Reveal every non-mine cell; flags are optional marks; opening is safe | Reveal, flag, optionally spend a scan | Procedural 6×6, 7×7, or 8×8 board; up to 200 candidates using seeded run RNG | No-guess solver must prove the entire board from the opening | Larger grid, 6–7 / 9–10 / 13–14 mines, 2 / 1 / 0 scans | Touch/mouse board controls; native focusable controls; no game-wide controller layer exists |
| Sudoku | Each row, column, and 2×2, 2×3, or 3×3 region contains every digit once | Enter digits; on 6×6 and 9×9 toggle candidate mode and add/remove notes | Curated uniquely solvable givens; solution derived by solver and asserted at module load | Structural validity, complete solution, and exactly one solution | 4×4 singles; 6×6 multi-round deduction; 9×9 unique hard puzzle requiring deductions beyond singles | Numeric mobile keyboard, arrow navigation, labelled cells, persisted notes |
| Crossword | Complete a square in which every row and column is a valid answer | Enter letters; arrows navigate; entry advances after a letter | Curated English 3×3, 4×4, and 5×5 word squares | Word lengths, A–Z spelling, symmetric intersections, separate clue counts, and no clue containing its answer | Increasing grid size and clue indirectness; hard Latin square removed | Text keyboard, capitalization, arrow navigation, separate Across/Down regions; locale recorded as en-CA |
| Sequence | Select the sole offered number that continues the displayed rule | Choose one of four distinct values | Curated three-level banks; choices shuffled with run RNG | Exactly one offered answer; numeric equality | Constant operations; recurrence/growing gaps; alternating or interleaved multi-step rules | Large focusable buttons; no speed requirement |
| Lights Out | A press toggles a cell and its orthogonal neighbours; extinguish all cells | Press grid cells | Seeded random legal presses with bounded retries and a verified fallback | Exhaustive first-row solver proves solvability and minimum move count | 3×3 floor 2; 3×3 floor 4; 4×4 floor 7 | Touch/mouse buttons, arrow navigation, lit/dark text alternatives |
| Nonogram | Ordered clues give lengths of filled runs in each row and column | Cycle unknown → filled → crossed | Seeded random 5×5 or 7×7 solutions; bounded retries | Clues regenerated from solution and row-backtracking solver requires exactly one solution | More multi-run lines and 7×7 hard grids | Three visible/announced states, arrow navigation, viewport-constrained board |

## 7. Validity assessment

- **Minesweeper:** valid and no-guess by construction. A bounded retry prevents infinite generation; seed tests cover every level.
- **Sudoku:** valid, uniquely solvable, region-correct, and difficulty-labelled. Candidate notes persist through save/load.
- **Crosswords:** all answers are ordinary English words, intersections agree, clue lists are distinct and accurate, and answer text is absent from its own clue.
- **Sequences:** each prompt has one answer among distinct options; validation handles success and failure without revealing its method.
- **Lights Out:** every board has a solver-confirmed solution and a minimum-move floor; retries and deterministic fallbacks are bounded.
- **Nonograms:** every clue comes from the stored answer, every generated clue set is unique, and completion ignores whether empty cells remain unknown or are crossed.

## 8. Former trivial, impossible, ambiguous, or incomplete puzzles

| Finding before revision | Classification | Resolution |
|---|---|---|
| Both 4×4 Sudoku boards admitted multiple solutions | Ambiguous | Replaced with one uniquely solvable introductory grid |
| The 6×6 Sudoku admitted multiple solutions | Ambiguous | Replaced with a unique deduction grid |
| Large Sudoku had no candidate-note tool | Incomplete interaction | Added persistent candidate mode and marks |
| Two of three fixed 5×5 nonograms admitted multiple solutions | Ambiguous | Replaced the fixed bank with unique procedural generation |
| Nonograms had only binary filled/unfilled input | Incomplete interaction | Added unknown, filled, and crossed states |
| Hard crossword used SATOR/AREPO/ROTAS | Obscure rather than fair difficulty | Replaced with an English HEART/EMBER/ABUSE/RESIN/TREND square and independent clue wording |
| Across and Down reused identical clues | Incomplete crossword presentation | Added distinct clue lists and navigation |
| Lights Out could cancel duplicate random presses into a trivial board | Trivial | Generator now checks the true minimum solution length |
| Sequence completion explained the rule after success or failure | Tutorial result | Removed explanations from player-facing outcomes |
| Puzzle intro announced the card-upgrade reward and called Minesweeper no-guess | Telegraphed/meta presentation | Intro now states rules only; the consequence appears after resolution |

No currently generated puzzle is known to be impossible or unintentionally ambiguous under the automated validators.

## 9. Difficulty framework

All families use three non-evaluative labels: **Measured**, **Demanding**, and **Relentless**. Difficulty comes from state-space size, deduction depth, clue interaction, redundancy, and available scans—not timing, illegibility, concealed rules, or random punishment. Sudoku's stored solver rating distinguishes singles-only grids from the hard grid; Lights Out uses exact minimum moves; nonograms require uniqueness and increasing size; Minesweeper increases size/mines while removing scans; crosswords increase size and clue indirection; sequences progress from one operation to interacting rules.

## 10. Technical test plan

Automated coverage lives in **test/puzzles.test.mjs** and runs under **npm test**.

| Requirement | Automated evidence |
|---|---|
| Validity and uniqueness | Every Sudoku size; 30 seeds at every nonogram level; 30 seeds at every Minesweeper level |
| Correct clues/intersections | Nonogram clues regenerated and compared; every crossword template structurally validated |
| Correct/incomplete answers | Engine solution paths plus an incomplete Sudoku that remains unresolved |
| Save/restore | Sudoku notes and representative Sudoku, crossword, Lights Out, and nonogram states |
| Keyboard/controller where supported | Pure boundary tests and UI wiring checks for arrow navigation; controller is not an app-wide supported input mode |
| Minimum/maximum difficulty | Size and exact solver floors checked for every family level |
| Small/large displays | Static UI assertions verify viewport-relative widths with desktop maximums; production build verifies CSS compilation |
| Localization | Crossword locale, A–Z schema, clue counts, and answer-free clues |
| Seed reproducibility | Every hard family generated twice from the same daily seed |
| Many procedural seeds | 270 generated boards across Minesweeper, Lights Out, and nonograms per complete test run |
| Bounded generation | All procedural generators have explicit retry caps and validated fallbacks |

## 11. Prioritized implementation plan

1. **Essential — complete:** remove tutorial results, pre-choice spoilers, evaluative labels, and dead legacy event handling.
2. **Essential — complete:** replace invalid/ambiguous Sudoku and nonogram content; validate uniqueness.
3. **Essential — complete:** guarantee Minesweeper and Lights Out solvability with bounded generators.
4. **High-value — complete:** add Sudoku notes, nonogram crosses, crossword navigation, and arrow navigation across grid puzzles.
5. **High-value — complete:** replace obscure crossword material and separate Across/Down clues.
6. **High-value — complete:** add multi-level difficulty models and many-seed regression tests.
7. **Optional future work:** add a game-wide controller abstraction before claiming controller support, and add browser-device screenshot tests to CI for exact visual regression coverage.

## 12. Outcome-only confirmation

The live event path does not display concept names, explanations, designer judgments, strategy recommendations, or grading language. Before commitment, action descriptions contain no outcomes. When paid investigation exists, it reveals the immediate mechanical branches only after its stated cost is applied. Final results contain one atmospheric sentence and the exact applied consequences. Players are left to interpret the decision themselves.
`;

fs.writeFileSync(reportPath, markdown);
console.log(`Updated ${review.events.length} event records and wrote ${path.relative(root, reportPath)}.`);
