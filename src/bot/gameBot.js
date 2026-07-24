import { CARDS, CLASSES, TRINKETS, GADGETS } from '../engine/data.js';
import {
  run, ui, board, cbt, newRun, reachableNodes, enterNode, closeModal, numAt,
  effCost, clickHandCard, clickTile, tileEligible, endTurn,
  takeRewardCard, takeRewardTrinket, takeBossTrinket, takeRewardGadget, finishReward,
  campHeal, campSurvey, campUpgrade, campTrainPicks, doUpgrade, gotoMap, eventChoice, puzzleClick,
  puzzleToggleFlag, togglePuzzleScan, toggleFlag, selectEnemy, useGadget,
  buyShopCard, buyShopTrinket, buyShopGadget, buyRemoval, doRemove, score,
  currentEventView,
} from '../engine/engine.js';

const TERMINAL = new Set(['gameover', 'victory']);
const cardText = (def, upgraded = false) => typeof def?.text === 'function'
  ? def.text(Boolean(upgraded))
  : Array.isArray(def?.text) ? def.text[upgraded ? 1 : 0] : (def?.text || '');
const plain = value => String(typeof value === 'function' ? value(false) : value || '')
  .replace(/<[^>]+>/g, '').replace(/&times;/g, '×');

export function observe(options = {}) {
  const combat = run?.combat;
  const cells = combat?.board.cells.map((cell, index) => {
    const lairOwner = combat.enemies.find(enemy => enemy.hp > 0 && enemy.lair?.includes(index));
    return {
      index,
      state: cell.void ? 'void' : cell.entombed ? 'entombed' : cell.revealed ? 'revealed' : cell.flag ? 'flagged' : 'hidden',
      number: cell.revealed && !cell.void ? numAt(index) : undefined,
      scan: cell.scan || undefined,
      feature: cell.grub ? 'grubber-burrow' : cell.primed ? 'primed' : undefined,
      lair: lairOwner?.def.name,
      construct: cell.construct?.kind,
      mine: options.revealMines ? cell.mine : undefined,
    };
  });
  return {
    screen: ui.screen,
    terminal: TERMINAL.has(ui.screen),
    run: run ? {
      class: run.cls, hp: run.hp, maxHp: run.maxHp, gold: run.gold,
      stratum: run.stratum + 1, floors: run.floors, fullClears: run.fullClears,
      coreWon: Boolean(run.coreWon),
      deckSize: run.deck.length, score: score(),
      deck: run.deck.map((card, index) => ({ index, key: card.key, name: CARDS[card.key].name, upgraded: Boolean(card.up) })),
      trinkets: run.trinkets.map(key => ({ key, name: TRINKETS[key].name, text: TRINKETS[key].desc })),
      gadgets: run.gadgets.map(key => ({ key, name: GADGETS[key].name, text: GADGETS[key].desc })),
    } : null,
    targeting: ui.targeting ? {
      card: combat?.hand[ui.targeting.handIdx]?.key,
      next: ui.targeting.specs[ui.targeting.picked.length],
      picked: [...ui.targeting.picked],
    } : null,
    combat: combat ? {
      turn: combat.turn, energy: combat.energy, picks: combat.picks, maxPicks: combat.maxPicks,
      block: combat.block, plating: combat.plating, insight: combat.insight,
      hand: combat.hand.map((card, index) => ({
        index, key: card.key, name: CARDS[card.key].name, cost: effCost(card),
        type: CARDS[card.key].type, upgraded: Boolean(card.up), text: plain(cardText(CARDS[card.key], card.up)),
      })),
      enemies: combat.enemies.filter(e => e.hp > 0).map((e, index) => ({
        index: combat.enemies.indexOf(e), key: e.key, name: e.def.name, hp: e.hp, maxHp: e.maxHp,
        block: e.block, selected: combat.targetIdx === combat.enemies.indexOf(e),
        intent: e.intent ? { label: e.intent.label, kind: e.intent.kind, class: e.intent.cls } : null,
      })),
      board: {
        size: combat.board.size,
        hidden: combat.board.cells.filter(c => !c.void && !c.revealed && !c.entombed).length,
        cells,
      },
    } : null,
    reward: ui.screen === 'reward' ? {
      cards: run.reward.cards.map((card, index) => ({ index, key: card.key, name: CARDS[card.key].name, rarity: CARDS[card.key].rarity, text: plain(cardText(CARDS[card.key], card.up)) })),
      cardTaken: run.reward.cardTaken, trinket: run.reward.trinket, gadget: run.reward.gadget,
      bossTrinkets: run.reward.bossTrinkets,
    } : null,
    shop: ui.screen === 'shop' ? run.shop : null,
    event: ui.screen === 'event' ? run.event : null,
    modal: ui.modal ? { kind: ui.modal.kind, title: ui.modal.title } : null,
    legalActions: legalActions(),
  };
}

export function legalActions() {
  if (ui.modal) {
    if (ui.modal.kind === 'upgrade') return [{ type: 'close-modal' }, ...run.deck.flatMap((card, deckIndex) => !card.up && CARDS[card.key].cost != null
      ? [{ type: 'upgrade', deckIndex, card: CARDS[card.key].name }] : [])];
    if (ui.modal.kind === 'remove') return [{ type: 'close-modal' }, ...run.deck.map((card, deckIndex) => ({ type: 'remove', deckIndex, card: CARDS[card.key].name }))];
    return [{ type: 'close-modal' }];
  }
  if (!run || ui.screen === 'title' || TERMINAL.has(ui.screen)) return [];
  if (ui.screen === 'map') return reachableNodes().map(({ r, c }) => ({ type: 'enter-node', r, c, node: run.map.nodes[r][c] }));
  if (ui.screen === 'combat') {
    const c = cbt();
    if (ui.targeting) {
      const spec = ui.targeting.specs[ui.targeting.picked.length];
      return c.board.cells.flatMap((_, tile) => tileEligible(tile, spec, ui.targeting.picked) ? [{ type: 'target-tile', tile, target: spec }] : []);
    }
    if (ui.gadgetTargeting) return c.board.cells.flatMap((_, tile) => tileEligible(tile, GADGETS[ui.gadgetTargeting].target, []) ? [{ type: 'target-tile', tile, target: GADGETS[ui.gadgetTargeting].target }] : []);
    const actions = [{ type: 'end-turn' }];
    c.hand.forEach((card, handIndex) => {
      const def = CARDS[card.key];
      const hasTargets = def.targets.every(spec => c.board.cells.some((_, tile) => tileEligible(tile, spec, [])));
      if (!def.unplayable && effCost(card) <= c.energy && (!def.can || def.can(card.up)) && hasTargets) actions.push({ type: 'play-card', handIndex, card: def.name });
    });
    if (c.picks > 0) c.board.cells.forEach((cell, tile) => {
      if (!cell.void && !cell.revealed && !cell.entombed && !cell.flag) actions.push({ type: 'dig', tile });
    });
    c.board.cells.forEach((cell, tile) => {
      if (!cell.void && !cell.revealed && !cell.entombed) actions.push({ type: 'flag', tile });
    });
    c.enemies.forEach((enemy, enemyIndex) => { if (enemy.hp > 0 && !enemy.data.buried) actions.push({ type: 'select-enemy', enemyIndex, enemy: enemy.def.name }); });
    run.gadgets.forEach(key => actions.push({ type: 'use-gadget', key, gadget: GADGETS[key].name }));
    return actions;
  }
  if (ui.screen === 'reward') {
    const actions = [];
    if (!run.reward.cardTaken) run.reward.cards.forEach((card, index) => actions.push({ type: 'take-card', index, card: CARDS[card.key].name }));
    if (run.reward.trinket) actions.push({ type: 'take-trinket', key: run.reward.trinket });
    if (run.reward.gadget && run.gadgets.length < 3) actions.push({ type: 'take-gadget' });
    run.reward.bossTrinkets?.forEach(key => actions.push({ type: 'take-boss-trinket', key }));
    if (run.reward.cardTaken) actions.push({ type: 'finish-reward' });
    return actions;
  }
  if (ui.screen === 'camp') return [
    { type: 'camp-heal' }, { type: 'camp-upgrade' }, { type: 'camp-survey' },
    ...((run.pickBonus || 0) < 2 ? [{ type: 'camp-train-picks' }] : []),
  ];
  if (ui.screen === 'shop') {
    const actions = [{ type: 'leave-shop' }];
    run.shop.cards.forEach((item, index) => { if (!item.sold && run.gold >= item.price) actions.push({ type: 'buy-card', index, card: CARDS[item.key].name, price: item.price }); });
    run.shop.trinkets.forEach((item, index) => { if (!item.sold && run.gold >= item.price) actions.push({ type: 'buy-trinket', index, trinket: TRINKETS[item.key].name, price: item.price }); });
    run.shop.gadgets.forEach((item, index) => { if (!item.sold && run.gold >= item.price && run.gadgets.length < 3) actions.push({ type: 'buy-gadget', index, gadget: GADGETS[item.key].name, price: item.price }); });
    if (run.gold >= run.removalCost) actions.push({ type: 'buy-removal', price: run.removalCost });
    return actions;
  }
  if (ui.screen === 'event') return (currentEventView()?.choices || [])
    .filter(choice => !choice.disabled)
    .map(choice => ({ type: 'event-choice', choice: choice.key }));
  if (ui.screen === 'puzzle') {
    const actions = [{ type: 'leave-puzzle' }, { type: 'toggle-puzzle-scan' }];
    run.puzzle.board?.cells.forEach((cell, tile) => { if (!cell.revealed) actions.push({ type: 'puzzle-click', tile }, { type: 'puzzle-flag', tile }); });
    return actions;
  }
  return [];
}

export function act(action) {
  const legal = legalActions();
  const identity = ['r', 'c', 'tile', 'handIndex', 'enemyIndex', 'index', 'key', 'deckIndex', 'choice'];
  const allowed = legal.some(candidate => candidate.type === action.type
    && identity.every(key => candidate[key] === undefined || candidate[key] === action[key]));
  if (!allowed) throw new Error(`Illegal action: ${JSON.stringify(action)}`);
  switch (action.type) {
    case 'close-modal': closeModal(); break;
    case 'upgrade': doUpgrade(action.deckIndex); break;
    case 'remove': doRemove(action.deckIndex); break;
    case 'enter-node': enterNode(action.r, action.c); break;
    case 'play-card': clickHandCard(action.handIndex); break;
    case 'target-tile': clickTile(action.tile); break;
    case 'dig': clickTile(action.tile); break;
    case 'flag': toggleFlag(action.tile); break;
    case 'end-turn': endTurn(); break;
    case 'select-enemy': selectEnemy(action.enemyIndex); break;
    case 'use-gadget': useGadget(action.key); break;
    case 'take-card': takeRewardCard(action.index); break;
    case 'take-trinket': takeRewardTrinket(); break;
    case 'take-gadget': takeRewardGadget(); break;
    case 'take-boss-trinket': takeBossTrinket(action.key); break;
    case 'finish-reward': finishReward(); break;
    case 'camp-heal': campHeal(); break;
    case 'camp-upgrade': campUpgrade(); break;
    case 'camp-survey': campSurvey(); break;
    case 'camp-train-picks': campTrainPicks(); break;
    case 'leave-shop': gotoMap(); break;
    case 'buy-card': buyShopCard(action.index); break;
    case 'buy-trinket': buyShopTrinket(action.index); break;
    case 'buy-gadget': buyShopGadget(action.index); break;
    case 'buy-removal': buyRemoval(); break;
    case 'event-choice': eventChoice(action.choice); break;
    case 'puzzle-click': puzzleClick(action.tile); break;
    case 'puzzle-flag': puzzleToggleFlag(action.tile); break;
    case 'toggle-puzzle-scan': togglePuzzleScan(); break;
    case 'leave-puzzle': gotoMap(); break;
    default: throw new Error(`Unsupported action: ${action.type}`);
  }
  return observe();
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
  const classBias = {
    sapper: /Detonate|Defuse|mine/i,
    surveyor: /Scan|Insight|Chord/i,
    terraformer: /Entomb|Construct|Plating/i,
    lamplighter: /Reveal|Energy/i,
    gambler: /flag|random|draw/i,
    chirurgeon: /Recover|Block|Plating/i,
    archivist: /draw|Exhaust|discard/i,
    warden: /Block|Plating|Construct/i,
    hexwright: /number|Scan|Chord/i,
    revenant: /damage|HP|Exhaust/i,
  };
  return (/damage|Attack/i.test(text) ? 30 : 0) + (/Block|Plating/i.test(text) ? 16 : 0)
    + (/Reveal|Scan|Defuse|Chord/i.test(text) ? 10 : 0)
    + (classBias[run.cls]?.test(text) ? 12 : 0) - (effCost(card) || 0);
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
    if (run.hp < run.maxHp * 0.8) campHeal();
    else if ((run.pickBonus || 0) < 2) campTrainPicks();
    else campSurvey();
    return { action: 'camp', state: observe() };
  }
  if (ui.screen === 'shop') { gotoMap(); return { action: 'shop:leave', state: observe() }; }
  if (ui.screen === 'event') {
    const choice = currentEventView()?.choices?.find(item => !item.disabled);
    if (!choice) return { action: 'stalled:event', state: observe() };
    eventChoice(choice.key);
    return { action: 'event', state: observe() };
  }
  if (ui.screen === 'puzzle') {
    if (!run.puzzle?.board) {
      gotoMap();
      return { action: 'puzzle:leave-nonmines', state: observe() };
    }
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
    if (result.state.terminal || (command.stopAtCoreVictory && result.state.run?.coreWon)
      || result.action.startsWith('stalled:')) {
      return { steps: i + 1, actions, state: result.state };
    }
  }
  return { steps: maxSteps, actions, limitReached: true, state: observe() };
}
