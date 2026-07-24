import {
  run, ui, newRun, closeCutscene, startSpecificEvent, currentEventView, eventChoice,
  EVENT_CATALOG, HONEST_PUZZLE_EVENT_CHANCE,
} from '../src/engine/engine.js';
import { fictionEventFollowup } from '../src/engine/events.js';

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
  newRun('sapper', { daily:`fiction-event-${id}${suffix}`, testMode:true });
  closeCutscene();
  startSpecificEvent(id);
  run.hp = Math.floor(run.maxHp / 2);
  run.gold = 999;
}

const ids = Object.keys(EVENT_CATALOG);
const academicFields = ['behavioral', 'concept', 'explanation', 'profile'];
const academicLanguage = /\b(theorem|bias|expected value|probability lesson|optimal strategy|what this tested|correct answer)\b/i;

test('the live deck contains 20 event cards', ids.length === 20);
test('Honest puzzles remain a recurring event-room outcome', HONEST_PUZZLE_EVENT_CHANCE >= .30
  && HONEST_PUZZLE_EVENT_CHANCE <= .40);
test('event IDs and titles are unique', new Set(ids).size === ids.length
  && new Set(Object.values(EVENT_CATALOG).map(event => event.title)).size === ids.length);
test('every event is authored fiction with exactly two named actions', ids.every(id => {
  const event = EVENT_CATALOG[id];
  return event.fiction && event.text && event.actions?.length === 2
    && event.actions.every(item => item.key && item.label);
}));
test('the academic profile and explanation schema is gone', ids.every(id =>
  academicFields.every(field => !Object.hasOwn(EVENT_CATALOG[id], field))));
test('event prose does not interpret choices as classroom answers', ids.every(id => {
  const event = EVENT_CATALOG[id];
  return !academicLanguage.test(`${event.title} ${event.text} ${event.actions.map(item => item.label).join(' ')}`);
}));
test('retired academic encounters are absent',
  ['mean-median', 'p-value', 'regression-mean', 'nash', 'birthday', 'secretary']
    .every(id => !EVENT_CATALOG[id]));

let allResolve = true;
let allViewsMatch = true;
let allResultsAreFictional = true;
for (const id of ids) {
  const event = EVENT_CATALOG[id];
  for (const selected of event.actions) {
    prepare(id, `-${selected.key}`);
    const view = currentEventView();
    allViewsMatch &&= view.choices.length === 2
      && view.choices.some(choice => choice.key === selected.key
        && (event.falsePurge || choice.label === selected.label));
    eventChoice(selected.key);
    allResolve &&= run.eventState?.stage === 'resolved' && ui.modal?.kind === 'info'
      && run.eventHistory.at(-1)?.id === id;
    allResultsAreFictional &&= Boolean(ui.modal?.html)
      && !academicLanguage.test(ui.modal?.html || '');
  }
}
test('both authored branches of all 20 events terminate safely', allResolve);
test('event views expose the actions authored for their scene', allViewsMatch);
test('all result prose stays inside the fiction', allResultsAreFictional);

const returning = ids.filter(id => EVENT_CATALOG[id].followup);
test('only selected stories create delayed callbacks', returning.length >= 8 && returning.length <= 12);
test('every callback is specific to its originating story and has two consequences', returning.every(id => {
  const event = EVENT_CATALOG[id];
  const followup = fictionEventFollowup(event, { choice:event.actions[0].key, choiceLabel:event.actions[0].label });
  return followup?.text && followup.choices.length === 2
    && event.followup.actions.every(item => item.result && item.effect && item.label);
}));

if (failures) {
  console.error(`\n${failures} EVENT VALIDATION FAILURE${failures === 1 ? '' : 'S'}`);
  process.exit(1);
}
console.log('\nALL EVENT VALIDATION TESTS PASS');
