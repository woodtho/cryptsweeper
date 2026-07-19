import { CARDS, CLASSES } from '../engine/data.js';
import {
  run, ui, board, cbt, newRun, reachableNodes, enterNode, closeModal,
  effCost, clickHandCard, clickTile, tileEligible, endTurn,
  takeRewardCard, takeRewardTrinket, takeBossTrinket, takeRewardGadget, finishReward,
  campHeal, campSurvey, gotoMap, eventChoice, puzzleClick, score,
} from '../engine/engine.js';

const TERMINAL = new Set(['gameover', 'victory']);
const cardText = (def, upgraded = false) => Array.isArray(def?.text)
  ? def.text[upgraded ? 1 : 0]
  : (def?.text || '');

export function observe() {
  const combat = run?.combat;
  return {
    screen: ui.screen,
    terminal: TERMINAL.has(ui.screen),
    run: run ? {
      class: run.cls, hp: run.hp, maxHp: run.maxHp, gold: run.gold,
      stratum: run.stratum + 1, floors: run.floors, fullClears: run.fullClears,
      deckSize: run.deck.length, score: score(),
    } : null,
    targeting: ui.targeting ? {
      card: combat?.hand[ui.targeting.handIdx]?.key,
      next: ui.targeting.specs[ui.targeting.picked.length],
      picked: [...ui.targeting.picked],
    } : null,
    combat: combat ? {
      turn: combat.turn, energy: combat.energy, picks: combat.picks,
      block: combat.block, plating: combat.plating, insight: combat.insight,
      hand: combat.hand.map((card, index) => ({ index, key: card.key, cost: effCost(card) })),
      enemies: combat.enemies.filter(e => e.hp > 0).map(e => ({ key: e.key, hp: e.hp, maxHp: e.maxHp })),
      board: { size: combat.board.size, hidden: combat.board.cells.filter(c => !c.void && !c.revealed && !c.entombed).length },
    } : null,
  };
}

function chooseMapNode() {
  const priorities = run.hp < run.maxHp * 0.45
    ? ['camp', 'treasure', 'dig', 'shop', 'event', 'elite', 'boss']
    : ['treasure', 'elite', 'camp', 'shop', 'dig', 'event', 'boss'];
  const nodes = reachableNodes();
  return nodes.sort((a, b) => priorities.indexOf(run.map.nodes[a.r][a.c]) - priorities.indexOf(run.map.nodes[b.r][b.c]))[0];
}

function targetTile(policy) {
  const target = ui.targeting;
  const spec = target.specs[target.picked.length];
  const candidates = board().cells.map((_, i) => i).filter(i => tileEligible(i, spec, target.picked));
  if (!candidates.length) return null;
  if (spec === 'hidden' && policy === 'oracle') {
    const text = cardText(CARDS[cbt().hand[target.handIdx].key], cbt().hand[target.handIdx].up);
    const wantsMine = /detonat|defuse|mine to deal|verified flag/i.test(text);
    return candidates.find(i => Boolean(board().cells[i].mine) === wantsMine) ?? candidates[0];
  }
  return candidates.find(i => board().cells[i].scan === 'safe') ?? candidates[0];
}

function cardScore(card) {
  const def = CARDS[card.key];
  const text = cardText(def, card.up);
  return (/damage|Attack/i.test(text) ? 30 : 0) + (/Block|Plating/i.test(text) ? 16 : 0)
    + (/Reveal|Scan|Defuse/i.test(text) ? 10 : 0) - (effCost(card) || 0);
}

function choosePlayableCard() {
  const c = cbt();
  return c.hand.map((card, index) => ({ card, index }))
    .filter(({ card }) => {
      const def = CARDS[card.key];
      if (def.unplayable || effCost(card) > c.energy) return false;
      if (def.can && !def.can(card.up)) return false;
      return def.targets.every(spec => c.board.cells.some((_, i) => tileEligible(i, spec, [])));
    })
    .sort((a, b) => cardScore(b.card) - cardScore(a.card))[0];
}

export function step(command = {}) {
  const policy = command.policy || 'oracle';
  if (TERMINAL.has(ui.screen)) return { action: 'terminal', state: observe() };
  if (ui.modal) { closeModal(); return { action: 'close-modal', state: observe() }; }
  if (!run || ui.screen === 'title') {
    const cls = command.class || 'sapper';
    if (!CLASSES[cls]) throw new Error(`Unknown class: ${cls}`);
    newRun(cls, command.seed ? { daily: command.seed } : {});
    return { action: `new:${cls}`, state: observe() };
  }
  if (ui.screen === 'map') {
    const node = chooseMapNode();
    if (!node) return { action: 'stalled:no-map-node', state: observe() };
    const kind = run.map.nodes[node.r][node.c];
    enterNode(node.r, node.c);
    return { action: `enter:${kind}`, state: observe() };
  }
  if (ui.screen === 'combat') {
    if (ui.targeting) {
      const tile = targetTile(policy);
      if (tile == null) throw new Error('Targeting has no legal tile');
      clickTile(tile);
      return { action: `target:${tile}`, state: observe() };
    }
    const choice = choosePlayableCard();
    if (choice) {
      clickHandCard(choice.index);
      return { action: `card:${choice.card.key}`, state: observe() };
    }
    if (cbt().picks > 0) {
      const hidden = cbt().board.cells.map((cell, i) => ({ cell, i }))
        .filter(({ cell }) => !cell.void && !cell.revealed && !cell.entombed && !cell.flag);
      const tile = hidden.find(x => x.cell.scan === 'safe')
        ?? (policy === 'oracle' ? hidden.find(x => !x.cell.mine) : null)
        ?? hidden[0];
      if (tile) { clickTile(tile.i); return { action: `dig:${tile.i}`, state: observe() }; }
    }
    endTurn();
    return { action: 'end-turn', state: observe() };
  }
  if (ui.screen === 'reward') {
    if (!run.reward.cardTaken && run.reward.cards.length) { takeRewardCard(0); return { action: 'reward:card', state: observe() }; }
    if (run.reward.trinket) { takeRewardTrinket(); return { action: 'reward:trinket', state: observe() }; }
    if (run.reward.bossTrinkets?.length) { takeBossTrinket(run.reward.bossTrinkets[0]); return { action: 'reward:boss-trinket', state: observe() }; }
    if (run.reward.gadget && run.gadgets.length < 3) { takeRewardGadget(); return { action: 'reward:gadget', state: observe() }; }
    finishReward(); return { action: 'reward:finish', state: observe() };
  }
  if (ui.screen === 'camp') {
    if (run.hp < run.maxHp * 0.8) campHeal(); else campSurvey();
    return { action: 'camp', state: observe() };
  }
  if (ui.screen === 'shop') { gotoMap(); return { action: 'shop:leave', state: observe() }; }
  if (ui.screen === 'event') {
    eventChoice(run.event === 'shrine' ? 'walk' : 'bury');
    return { action: 'event', state: observe() };
  }
  if (ui.screen === 'puzzle') {
    const tile = run.puzzle.board.cells.findIndex(c => !c.mine && !c.revealed);
    if (tile >= 0) puzzleClick(tile); else gotoMap();
    return { action: tile >= 0 ? `puzzle:${tile}` : 'puzzle:leave', state: observe() };
  }
  throw new Error(`Bot does not understand screen: ${ui.screen}`);
}

export function runContinuous(command = {}) {
  const maxSteps = Math.max(1, Number(command.maxSteps) || 5000);
  const actions = {};
  let result;
  for (let i = 0; i < maxSteps; i++) {
    result = step(command);
    actions[result.action] = (actions[result.action] || 0) + 1;
    if (result.state.terminal || result.action.startsWith('stalled:')) {
      return { steps: i + 1, actions, state: result.state };
    }
  }
  return { steps: maxSteps, actions, limitReached: true, state: observe() };
}
