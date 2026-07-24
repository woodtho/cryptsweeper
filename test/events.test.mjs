import fs from 'node:fs';
import {
  run, ui, newRun, closeCutscene, startSpecificEvent, currentEventView, eventChoice,
  EVENT_CATALOG, HONEST_PUZZLE_EVENT_CHANCE,
} from '../src/engine/engine.js';
import { behavioralEventFollowup } from '../src/engine/events.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};

let failures = 0;
function test(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else { failures++; console.error(`FAIL  ${name}`); }
}
function prepare(id, suffix = '') {
  newRun('sapper', { daily:`event-audit-${id}${suffix}`, testMode:true });
  closeCutscene(); startSpecificEvent(id); run.hp = Math.floor(run.maxHp / 2);
}
function snapshot() {
  return JSON.stringify({
    hp:run.hp, maxHp:run.maxHp, gold:run.gold, deck:run.deck.map(card => [card.key, card.up]),
    gadgets:run.gadgets, upgrades:run.upgrades,
  });
}

const ids = Object.keys(EVENT_CATALOG);
const review = JSON.parse(fs.readFileSync(new URL('../docs/design/event-review-100.json', import.meta.url), 'utf8'));
const requiredReviewFields = [
  'eventName', 'existingEventText', 'existingChoices', 'existingOutcomes',
  'containsTutorialOrExplanatoryLanguage', 'choicesRevealQualityTooClearly', 'resultInterpretsDecision',
  'mechanicallyMeaningful', 'consistentlyDominant', 'fairDespiteHiddenInformation',
  'recommendedRevisedEventText', 'recommendedRevisedChoiceLabels', 'recommendedRevisedResultText',
  'mechanicalChangesRequired', 'priority',
];
const evaluativeLabel = /\b(safe|risky|risk|prudent|correct|wrong|smart|clever|foolish|dominant|optimal|honestly|fair|strongest|complementary|systematically|randomize|tail risk|patient|sustainable|robust|better|best)\b/i;
const interpretiveResult = /what this tested|not graded|correct choice|wrong choice|stronger decision|lesson|strategy|rational|bias|theorem|fallacy|expected value|probability/i;

test('event audit covers exactly the live 111-event catalog', ids.length === 111);
test('Honest puzzles have a recurring event-room frequency', HONEST_PUZZLE_EVENT_CHANCE >= 0.30
  && HONEST_PUZZLE_EVENT_CHANCE <= 0.40);
const followups = ids.map((id, index) => behavioralEventFollowup(EVENT_CATALOG[id], {
  choice: 'a', choiceLabel: EVENT_CATALOG[id].actions[0].label, floor: index,
}));
test('follow-up events use a varied bank of narrative callback scenes',
  new Set(followups.map(followup => followup.title)).size === 8);
test('every follow-up names the originating event and remembered action', ids.every((id, index) =>
  followups[index].text.includes(EVENT_CATALOG[id].title)
  && followups[index].text.includes(EVENT_CATALOG[id].actions[0].label)
  && followups[index].choices.every(choice => choice.label && choice.desc)));
test('the per-event deliverable covers all 111 IDs and every requested review field', review.events.length === 111
  && new Set(review.events.map(event => event.id)).size === 111
  && review.events.every(event => requiredReviewFields.every(field => Object.hasOwn(event, field))));
test('all live choice labels describe actions without evaluative adjectives', ids.every(id =>
  EVENT_CATALOG[id].actions.every(action => !evaluativeLabel.test(action.label))));
test('all live events use the shared behavioral resolver schema', ids.every(id => {
  const event = EVENT_CATALOG[id];
  return event.behavioral && event.actions.length === 2 && event.actions.every(action => action.key && action.label && !action.desc);
}));

let hiddenBeforeCommit = true;
let directResultsOnly = true;
let distinctBranches = true;
let allTerminate = true;
let investigationsCostAndReveal = true;

for (const id of ids) {
  const outcomes = [];
  for (const choice of ['a', 'b']) {
    prepare(id);
    const view = currentEventView();
    hiddenBeforeCommit &&= view.choices.filter(option => option.key !== 'observe').every(option => option.desc === '');
    const before = snapshot();
    eventChoice(choice);
    outcomes.push(snapshot());
    const html = run.eventState?.result?.html || '';
    allTerminate &&= run.eventState?.stage === 'resolved' && ui.modal?.kind === 'info' && Boolean(html);
    directResultsOnly &&= !interpretiveResult.test(html)
      && /Gain|Lose|Recover|Upgrade|Add/.test(html);
    // Ensure the branch actually changed run state rather than acting as a disguised Continue button.
    distinctBranches &&= snapshot() !== before;
  }
  distinctBranches &&= outcomes[0] !== outcomes[1];

  prepare(id, '-observe');
  const beforeView = currentEventView();
  const observe = beforeView.choices.find(choice => choice.key === 'observe');
  if (observe) {
    const before = { hp:run.hp, gold:run.gold };
    eventChoice('observe');
    const afterView = currentEventView();
    investigationsCostAndReveal &&= (run.hp < before.hp || run.gold < before.gold)
      && afterView.choices.length === 2
      && afterView.choices.every(choice => choice.desc && /gold|damage|HP|card|gadget|upgrade/i.test(choice.desc));
  }
}

test('all 111 events hide branch outcomes before commitment', hiddenBeforeCommit);
test('all 222 primary event branches terminate', allTerminate);
test('all event results contain direct consequences and no interpretation', directResultsOnly);
test('all event actions alter state and paired branches remain mechanically distinct', distinctBranches);
test('available investigations apply a cost before revealing both branches', investigationsCostAndReveal);

if (failures) {
  console.error(`\n${failures} EVENT VALIDATION FAILURE${failures === 1 ? '' : 'S'}`);
  process.exit(1);
}
console.log('\nALL EVENT VALIDATION TESTS PASS');
