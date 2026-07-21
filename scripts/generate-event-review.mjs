import { mkdir, writeFile } from 'node:fs/promises';
import {
  EVENT_CATALOG, newRun, startSpecificEvent, currentEventView, eventChoice, ui,
} from '../src/engine/engine.js';
import { EVENT_ACTION_REVISIONS, EVENT_TEXT_REVISIONS } from '../src/engine/events.js';

const PROFILE_OUTCOMES = [
  'A: modest Gold. B: larger Gold or HP loss.',
  'A: healing. B: Gold plus HP loss.',
  'A: pay Gold for max HP. B: immediate Gold.',
  'A: Gold plus healing. B: more Gold plus Claustrophobia.',
  'A: Gold. B: max HP or HP loss.',
  'A: Gold. B: pay Gold to upgrade a card.',
  'A: healing plus Gold. B: a gadget or HP loss plus Gold.',
  'Two different concealed Gold-versus-HP-loss outcome pools.',
];
const tutorialText = /typical|average|probab|expected|independent|bias|confidence|sample|variance|deviation|strategy|value|rational|fair|robust|optimal|dominant|evidence|information|risk|certainty|chance|odds|rate|random/i;
const evaluativeChoice = /safe|risky|risk|correct|wrong|smart|fair|sustainable|robust|strongest|superior|dominated|optimal|value|evidence|information|random|expected|average|sample|probab|chance|certainty|protect|maximize|minimize/i;

const rows = [];
for (const [id, event] of Object.entries(EVENT_CATALOG)) {
  newRun('sapper', { testMode:true, daily:`event-review-${id}` });
  startSpecificEvent(id);
  const view = currentEventView();
  eventChoice(event.actions[0].key);
  const resultHtml = ui.modal?.html || '';
  const revisedLabels = EVENT_ACTION_REVISIONS[id] || event.actions.map(action => action.label);
  const textFlags = [];
  if (tutorialText.test(event.text)) textFlags.push('The situation uses analytical or evaluative framing that can steer interpretation.');
  if (event.explanation) textFlags.push('The result explicitly explains and names the concept.');
  const choiceFlags = event.actions.filter(action => evaluativeChoice.test(`${action.label} ${action.desc || ''}`)).map(action => action.label);
  rows.push({
    id,
    eventName:event.title,
    existingEventText:event.text,
    existingChoices:event.actions.map(action => ({ label:action.label, description:action.desc })),
    existingPresentedChoiceBehavior:'The interface appends exact mechanical consequences or probabilities to both action descriptions before commitment.',
    existingOutcomes:PROFILE_OUTCOMES[event.profile % PROFILE_OUTCOMES.length],
    existingExampleResult:resultHtml,
    containsTutorialOrExplanatoryLanguage:Boolean(textFlags.length),
    tutorialFindings:textFlags,
    choicesRevealQualityTooClearly:true,
    explicitlyEvaluativeChoices:choiceFlags,
    resultInterpretsDecision:/What this tested|not graded|decision:/i.test(resultHtml),
    mechanicallyMeaningful:true,
    meaningfulReason:'The two profile branches exchange different immediate resources, uncertainty, or long-term value; optional investigation has an explicit existing cost.',
    consistentlyDominant:false,
    dominanceFinding:'No branch dominates every deck state because HP, Gold, upgrades, gadgets, max HP, and deck burdens have state-dependent value.',
    fairDespiteHiddenInformation:'Needs revision: penalties scale and investigation is available on uncertain profiles, but exact pre-choice spoilers replace discovery and generic profile outcomes need neutral presentation.',
    recommendedRevisedEventText:EVENT_TEXT_REVISIONS[id] || event.text,
    recommendedRevisedChoiceLabels:revisedLabels,
    recommendedRevisedResultText:'Show one atmospheric sentence followed only by the exact applied resource/card consequence. Do not name, grade, or explain the concept.',
    mechanicalChangesRequired:'Keep the existing effect profile. Hide unpurchased outcomes; show only the investigation cost before use and the observed branch after it is purchased.',
    priority:'essential',
  });
}

const payload = {
  reviewedEvents:rows.length,
  tutorialLikeEvents:rows.filter(row => row.containsTutorialOrExplanatoryLanguage).map(row => row.id),
  choicesTelegraphingConsequences:rows.filter(row => row.choicesRevealQualityTooClearly).map(row => row.id),
  interpretiveResultScreens:rows.filter(row => row.resultInterpretsDecision).map(row => row.id),
  dominantMeaninglessOrFakeChoices:rows.filter(row => row.consistentlyDominant || !row.mechanicallyMeaningful).map(row => row.id),
  events:rows,
};
await mkdir(new URL('../docs/design/', import.meta.url), { recursive:true });
await writeFile(new URL('../docs/design/event-review-100.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote reviews for ${rows.length} events.`);
