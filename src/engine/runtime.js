/* Runtime bridge for data-driven card and enemy effects.
   Data definitions import these stable delegates instead of importing engine.js,
   keeping the engine -> data dependency one-way. */
let api = null;

export function bindRuntime(next) {
  api = next;
}

function call(name, args) {
  if (!api?.[name]) throw new Error(`Engine runtime verb "${name}" is not bound`);
  return api[name](...args);
}

export const cbt = (...args) => call('cbt', args);
export const board = (...args) => call('board', args);
export const shuffle = (...args) => call('shuffle', args);
export const randPick = (...args) => call('randPick', args);
export const randInt = (...args) => call('randInt', args);
export const revealTile = (...args) => call('revealTile', args);
export const hitEnemy = (...args) => call('hitEnemy', args);
export const hitRandom = (...args) => call('hitRandom', args);
export const hitAll = (...args) => call('hitAll', args);
export const curTarget = (...args) => call('curTarget', args);
export const atk = (...args) => call('atk', args);
export const gainBlock = (...args) => call('gainBlock', args);
export const gainPlating = (...args) => call('gainPlating', args);
export const gainEnergy = (...args) => call('gainEnergy', args);
export const gainInsight = (...args) => call('gainInsight', args);
export const gainPicks = (...args) => call('gainPicks', args);
export const gainMaxPicks = (...args) => call('gainMaxPicks', args);
export const loseMaxPicks = (...args) => call('loseMaxPicks', args);
export const spendPicks = (...args) => call('spendPicks', args);
export const drawCards = (...args) => call('drawCards', args);
export const loseHP = (...args) => call('loseHP', args);
export const healHP = (...args) => call('healHP', args);
export const canHeal = (...args) => call('canHeal', args);
export const applyEnemyEffect = (...args) => call('applyEnemyEffect', args);
export const detonateForCards = (...args) => call('detonateForCards', args);
export const defuseTile = (...args) => call('defuseTile', args);
export const scanTile = (...args) => call('scanTile', args);
export const entombTile = (...args) => call('entombTile', args);
export const swapCells = (...args) => call('swapCells', args);
export const addConstruct = (...args) => call('addConstruct', args);
export const chordAt = (...args) => call('chordAt', args);
export const verifyFlag = (...args) => call('verifyFlag', args);
export const flaggedIdx = (...args) => call('flaggedIdx', args);
export const hiddenIdx = (...args) => call('hiddenIdx', args);
export const isHiddenUsable = (...args) => call('isHiddenUsable', args);
export const area3x3 = (...args) => call('area3x3', args);
export const highestRevealedNumber = (...args) => call('highestRevealedNumber', args);
export const neighborsOf = (...args) => call('neighborsOf', args);
export const numAt = (...args) => call('numAt', args);
export const toast = (...args) => call('toast', args);
export const log = (...args) => call('log', args);
export const fleeCombat = (...args) => call('fleeCombat', args);
export const enemyAttack = (...args) => call('enemyAttack', args);
export const boardAttack = (...args) => call('boardAttack', args);
export const layMines = (...args) => call('layMines', args);
export const fogTiles = (...args) => call('fogTiles', args);
export const scrambleMines = (...args) => call('scrambleMines', args);
export const setLie = (...args) => call('setLie', args);
export const clearLie = (...args) => call('clearLie', args);
export const primeTile = (...args) => call('primeTile', args);
export const resolvePrimed = (...args) => call('resolvePrimed', args);
export const clearPrimed = (...args) => call('clearPrimed', args);
export const devourRing = (...args) => call('devourRing', args);
export const annexTiles = (...args) => call('annexTiles', args);
export const addMineAt = (...args) => call('addMineAt', args);
