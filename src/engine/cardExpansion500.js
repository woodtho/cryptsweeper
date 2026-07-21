/* 500-card expansion.
   This module deliberately imports no engine state. data.js passes the existing
   engine verbs into the factory, which keeps every definition inside the game's
   established rules and avoids adding another data/engine dependency cycle. */

const CLASS_CYCLES = {
  sapper: 'Breach', surveyor: 'Survey', terraformer: 'Foundation', lamplighter: 'Kindle',
  gambler: 'Wager', chirurgeon: 'Triage', archivist: 'Index', warden: 'Bastion',
  hexwright: 'Proof', revenant: 'Grave',
};

const CLASS_PROFILE = {
  sapper: { attack: 3, guard: 0, scan: 0 }, surveyor: { attack: 0, guard: 0, scan: 3 },
  terraformer: { attack: 0, guard: 3, scan: 1 }, lamplighter: { attack: 2, guard: 0, scan: 2 },
  gambler: { attack: 2, guard: 1, scan: 1 }, chirurgeon: { attack: 1, guard: 3, scan: 0 },
  archivist: { attack: 1, guard: 0, scan: 2 }, warden: { attack: 0, guard: 4, scan: 0 },
  hexwright: { attack: 2, guard: 0, scan: 2 }, revenant: { attack: 4, guard: 0, scan: 0 },
};

const TITLES = [
  'Measured Strike', 'Surveyed Guard', 'Trail Reserve', 'Mine Dividend', 'Numbered Brace',
  'Honest Mark', 'Peripheral Survey', 'Momentum Blow', 'Plate Exchange', 'Blind Advance',
  'Quiet Burial', 'Neighbor Notes', 'Row Check', 'Flag Salvo', 'Deliberate Effort',
  'Safe Perimeter', 'Salvage Charge', 'Chord Lesson', 'Fault Reading', 'Controlled Chain',
  'Edge Claim', 'Watchful Sentry', 'Patient Relay', 'Mine Investment', 'Cascade Dividend',
  'Exact Count', 'Known Risk', 'Clean Sequence', 'Flag Economy', 'Grand Survey',
  'Full-Clear Aspirant', 'Mine Symphony', 'Open Ledger', 'Adaptive Works', 'Stone Exchange',
  'Last Pick', 'Dense Ground', 'Clear Ground', 'Verified Arsenal', 'Reversal',
  'Cartographer’s Coup', 'Controlled Collapse', 'Perfect Deduction', 'Mine Harvest', 'Last Map',
];

const BURDEN_TITLES = [
  'Bent Pick', 'Blunt Chisel', 'Split Handle', 'Damp Fuse', 'Cracked Lens', 'Warped Plate', 'Frayed Cord', 'Rust Flake', 'Loose Buckle', 'Empty Tin',
  'Bad Bearing', 'False Start', 'Hasty Scratch', 'Blind Corner', 'Crooked Measure', 'Stale Map', 'Wrong Turn', 'Faded Arrow', 'Poor Light', 'Cold Guess',
  'Loose Fill', 'Soft Mortar', 'Unstable Shelf', 'Powder Leak', 'Sour Earth', 'Shifting Gravel', 'Weak Brace', 'Hollow Stone', 'Rotten Timber', 'Slag Pocket',
  'Cramped Step', 'Low Ceiling', 'Narrow Crawl', 'Heavy Pack', 'Snagged Coat', 'Sore Knee', 'Short Breath', 'Dragging Chain', 'Twisted Ankle', 'Bad Footing',
  'Smudged Note', 'Missing Figure', 'Torn Margin', 'Blurred Count', 'Wet Ledger', 'Crossed Line', 'Lost Page', 'Broken Pencil', 'Ink Blot', 'Unreadable Hand',
];

const BENEFIT_ENTRY = {
  common: 'Normal combat reward or merchant stock for this Delver.',
  uncommon: 'Uncommon combat reward or merchant stock for this Delver.',
  rare: 'Rare combat reward or merchant stock for this Delver.',
};

function design(meta) {
  return {
    mechanicsUsed: meta.mechanics,
    archetype: meta.role,
    value: meta.value || 'beneficial',
    entry: meta.entry,
    keepOrRemove: meta.keep,
    example: meta.example,
    balanceRisks: meta.risk,
    tuningRange: meta.tuning,
    overlap: meta.overlap || 'No exact existing-card match; monitor the noted recipe family.',
  };
}

function rarityFor(classIndex, slot) {
  if (slot < 15) return { rarity: 'common', tier: 'common' };
  const uncommonEnd = classIndex < 5 ? 29 : 28;
  if (slot < uncommonEnd) return { rarity: 'uncommon', tier: 'uncommon' };
  if (slot < 40) return { rarity: 'rare', tier: 'rare' };
  return { rarity: 'rare', tier: 'exceptional' };
}

function tuning(base, spread = 2) { return `${Math.max(0, base - spread)}–${base + spread}`; }

export function buildCardExpansion500(api) {
  const {
    cbt, board, shuffle, curTarget, atk, hitEnemy, hitRandom, hitAll,
    gainBlock, gainPlating, gainEnergy, gainInsight, gainPicks, gainMaxPicks,
    loseMaxPicks, spendPicks, drawCards, loseHP, revealTile, scanTile, defuseTile,
    detonateForCards, entombTile, swapCells, addConstruct, chordAt, verifyFlag,
    hiddenIdx, flaggedIdx, isHiddenUsable, neighborsOf, numAt, annexTiles, addMineAt,
  } = api;

  const defs = {};
  const hiddenNeighbors = i => neighborsOf(i, board().size).filter(isHiddenUsable);
  const verifiedCount = () => flaggedIdx().filter(i => board().cells[i].flag === 2).length;
  const revealedCount = () => board().cells.filter(c => c.revealed && !c.void).length;
  const hiddenMineCount = () => hiddenIdx().filter(i => board().cells[i].mine).length;
  const scannedMineCount = () => hiddenIdx().filter(i => board().cells[i].scan === 'mine').length;
  const scannedCount = () => hiddenIdx().filter(i => board().cells[i].scan).length;
  const constructCount = () => board().cells.filter(c => c.construct).length;
  const entombedCount = () => board().cells.filter(c => c.entombed).length;
  const highestNumber = () => board().cells.reduce((high, cell, i) => cell.revealed && !cell.void ? Math.max(high, numAt(i)) : high, 0);
  const scanRandom = n => shuffle(hiddenIdx().filter(i => !board().cells[i].scan)).slice(0, n).forEach(scanTile);
  const className = cls => CLASS_CYCLES[cls];

  function addClassIdentity(def, cls, slot) {
    const mode = slot % 3;
    const originalText = def.text;
    const originalPlay = def.play;
    let suffix;
    let mechanics;
    let tuningNote;
    let riskNote;
    let forceExhaust = false;

    if (cls === 'sapper') {
      if (mode === 0) {
        suffix = u => `If this card Detonates a mine, gain ${u ? 3 : 2} Plating.`;
        mechanics = ['detonate', 'plating']; tuningNote = '2–3 rider Plating';
        riskNote = 'The Sapper rider can turn already-profitable controlled detonations into excessive defense.';
      } else if (mode === 1) {
        suffix = u => `If you have at least 2 verified flags afterward, gain ${u ? 5 : 3} Block.`;
        mechanics = ['verified flag', 'block']; tuningNote = '3–5 rider Block';
        riskNote = 'Verified-flag generators can make the Sapper rider automatic.';
      } else {
        suffix = u => `If at least 8 mines remain hidden afterward, deal ${u ? 5 : 3} damage to a random enemy.`;
        mechanics = ['mines', 'random damage']; tuningNote = '3–5 rider damage';
        riskNote = 'Dense late boards may make the Sapper rider unconditional.';
      }
    } else if (cls === 'surveyor') {
      if (mode === 0) {
        suffix = u => `Afterward, Scan ${u ? 2 : 1} additional random hidden tile${u ? 's' : ''}.`;
        mechanics = ['scan']; tuningNote = '1–2 rider Scans';
        riskNote = 'Extra scans accelerate Field Method and can over-compress information.';
      } else if (mode === 1) {
        suffix = () => 'If at least 3 hidden tiles are Scanned afterward, gain 1 Insight.';
        mechanics = ['scan', 'insight']; tuningNote = '1 rider Insight';
        riskNote = 'The Surveyor rider can become automatic after the opening turns.';
      } else {
        suffix = u => `Gain ${u ? 2 : 1} Block for each hidden mine Scanned afterward, up to 6 Block.`;
        mechanics = ['scan', 'block']; tuningNote = '1–2 Block per scanned mine; cap 6';
        riskNote = 'Mass Scan effects can also produce capped defense too reliably.';
      }
    } else if (cls === 'terraformer') {
      if (mode === 0) {
        suffix = () => 'Gain 2 Block for each Construct afterward, up to 6 Block.';
        mechanics = ['construct', 'block']; tuningNote = '2 per Construct; cap 6';
        riskNote = 'Construct-heavy decks can turn the rider into reliable maximum Block.';
      } else if (mode === 1) {
        suffix = () => 'Gain 1 Plating for each Entombed tile afterward, up to 3 Plating.';
        mechanics = ['entomb', 'plating']; tuningNote = '1 per Entomb; cap 3';
        riskNote = 'Entomb decks may gain too much persistent defense while advancing Full Clear.';
      } else {
        suffix = () => 'If you have no Constructs afterward, gain 4 Block; otherwise gain 2 Plating.';
        mechanics = ['construct', 'block', 'plating']; tuningNote = '4 Block or 2 Plating';
        riskNote = 'The flexible Terraformer rider always provides some defense.';
      }
    } else if (cls === 'lamplighter') {
      if (mode === 0) {
        suffix = () => 'If this card Reveals at least 3 tiles, gain 1 Energy.';
        mechanics = ['reveal', 'energy']; tuningNote = '3-tile threshold; 1 Energy';
        riskNote = 'This can stack with Kindle on one cascade for a large refund.';
      } else if (mode === 1) {
        suffix = () => 'If this card Reveals a safe tile, gain 1 pick.';
        mechanics = ['reveal', 'picks']; tuningNote = '1 rider pick';
        riskNote = 'Safe-reveal cards can become action-positive.';
      } else {
        suffix = u => `If this card Reveals no tiles, gain ${u ? 6 : 4} Block.`;
        mechanics = ['reveal', 'block']; tuningNote = '4–6 fallback Block';
        riskNote = 'The fallback can erase the opportunity cost of mistimed reveal payoffs.';
      }
    } else if (cls === 'gambler') {
      if (mode === 0) {
        suffix = u => `If at least 2 tiles are flagged afterward, gain ${u ? 6 : 4} Block.`;
        mechanics = ['flag', 'block']; tuningNote = '4–6 rider Block';
        riskNote = 'Because manual flags are free, the condition can be staged without card cost.';
      } else if (mode === 1) {
        suffix = () => 'If at least 2 verified flags remain afterward, draw 1 card.';
        mechanics = ['verified flag', 'draw']; tuningNote = '1 rider card';
        riskNote = 'Verified-flag engines can turn many Gambler cards into cantrips.';
      } else {
        suffix = u => `If at least 3 tiles are flagged afterward, deal ${u ? 7 : 5} damage to the targeted enemy.`;
        mechanics = ['flag', 'target damage']; tuningNote = '5–7 rider damage';
        riskNote = 'Free flag placement may make the damage rider too easy to enable.';
      }
    } else if (cls === 'chirurgeon') {
      if (mode === 0) {
        suffix = u => `If you have no Plating afterward, gain ${u ? 6 : 4} Block.`;
        mechanics = ['plating', 'block']; tuningNote = '4–6 rider Block';
        riskNote = 'The no-Plating condition is common early and may overstate baseline defense.';
      } else if (mode === 1) {
        suffix = u => `If you have no Block afterward, gain ${u ? 4 : 3} Plating.`;
        mechanics = ['block', 'plating']; tuningNote = '3–4 rider Plating';
        riskNote = 'Persistent Plating can make defensive sequencing too forgiving.';
      } else {
        suffix = () => 'If your Block plus Plating is 5 or less afterward, gain 1 pick.';
        mechanics = ['block', 'plating', 'picks']; tuningNote = '1 rider pick';
        riskNote = 'Low-defense builds may gain a pick from too many cards.';
      }
    } else if (cls === 'archivist') {
      if (mode === 0) {
        suffix = () => 'If you have 3 or fewer cards in hand afterward, draw 1 card.';
        mechanics = ['draw']; tuningNote = '1 rider card at ≤3 hand';
        riskNote = 'Hand-emptying sequences can turn the rider into repeated cantrips.';
      } else if (mode === 1) {
        suffix = () => 'Exhaust.';
        mechanics = ['exhaust']; tuningNote = 'combat-only Exhaust';
        riskNote = 'Too much Exhaust can make Archivist decks deterministic after one cycle.';
        forceExhaust = true;
      } else {
        suffix = () => 'If at least 5 cards are in your discard pile afterward, draw 1 card.';
        mechanics = ['discard pile', 'draw']; tuningNote = '1 rider card at 5+ discard';
        riskNote = 'Late-turn draw can extend already-long Archivist sequences.';
      }
    } else if (cls === 'warden') {
      if (mode === 0) {
        suffix = () => 'If you have at least 10 Block afterward, gain 2 Plating.';
        mechanics = ['block', 'plating']; tuningNote = '2 rider Plating at 10 Block';
        riskNote = 'Block-retention decks may trigger this every turn.';
      } else if (mode === 1) {
        suffix = () => 'Gain Block equal to your Plating afterward, up to 5 Block.';
        mechanics = ['plating', 'block']; tuningNote = 'Plating to Block; cap 5';
        riskNote = 'High-Plating Warden decks can get a free capped defense rider.';
      } else {
        suffix = () => 'If you have any Block afterward, gain 1 Plating.';
        mechanics = ['block', 'plating']; tuningNote = '1 rider Plating';
        riskNote = 'The low threshold may accumulate too much persistent defense.';
      }
    } else if (cls === 'hexwright') {
      if (mode === 0) {
        suffix = () => 'If a revealed tile shows 3 or higher afterward, gain 1 Insight.';
        mechanics = ['numbered tile', 'insight']; tuningNote = '1 rider Insight';
        riskNote = 'Dense boards can make the number condition automatic.';
      } else if (mode === 1) {
        suffix = u => `If a revealed tile shows 3 or higher afterward, deal ${u ? 3 : 2} damage to all enemies.`;
        mechanics = ['numbered tile', 'all-enemy damage']; tuningNote = '2–3 rider damage';
        riskNote = 'This stacks with Hot Number and may over-reward dense boards.';
      } else {
        suffix = () => 'Gain Block equal to the highest revealed number afterward.';
        mechanics = ['numbered tile', 'block']; tuningNote = '0–8 rider Block';
        riskNote = 'Very high numbers can turn the rider into oversized free defense.';
      }
    } else {
      if (mode === 0) {
        suffix = () => 'Afterward, lose 1 HP and gain 1 Energy.';
        mechanics = ['health', 'energy']; tuningNote = '1 HP for 1 Energy';
        riskNote = 'Energy refunds may enable long turns despite the voluntary HP cost.';
      } else if (mode === 1) {
        suffix = u => `Afterward, lose 1 HP and gain ${u ? 7 : 5} Block.`;
        mechanics = ['health', 'block']; tuningNote = '1 HP for 5–7 Block';
        riskNote = 'The Block can make the HP trade favorable too consistently.';
      } else {
        suffix = u => `Afterward, lose 1 HP and gain ${u ? 3 : 2} picks.`;
        mechanics = ['health', 'picks']; tuningNote = '1 HP for 2–3 picks';
        riskNote = 'Pick-heavy Revenant turns may become too long.';
      }
    }

    return {
      ...def,
      exhaust: Boolean(def.exhaust || forceExhaust),
      text: u => `${originalText(u)} ${suffix(u)}`,
      play: (u, targets) => {
        const combat = cbt();
        const beforeDetonations = combat?.minesDetonated || 0;
        const beforeReveals = combat?.revealedThisTurn || 0;
        originalPlay(u, targets);
        if (!cbt() || cbt() !== combat || combat.over) return;
        if (cls === 'sapper') {
          if (mode === 0 && combat.minesDetonated > beforeDetonations) gainPlating(u ? 3 : 2);
          else if (mode === 1 && verifiedCount() >= 2) gainBlock(u ? 5 : 3);
          else if (mode === 2 && hiddenMineCount() >= 8) hitRandom(atk(u ? 5 : 3));
        } else if (cls === 'surveyor') {
          if (mode === 0) scanRandom(u ? 2 : 1);
          else if (mode === 1 && scannedCount() >= 3) gainInsight(1);
          else if (mode === 2) gainBlock(Math.min(6, scannedMineCount() * (u ? 2 : 1)));
        } else if (cls === 'terraformer') {
          if (mode === 0) gainBlock(Math.min(6, constructCount() * 2));
          else if (mode === 1) gainPlating(Math.min(3, entombedCount()));
          else if (constructCount() === 0) gainBlock(4); else gainPlating(2);
        } else if (cls === 'lamplighter') {
          const revealed = combat.revealedThisTurn - beforeReveals;
          if (mode === 0 && revealed >= 3) gainEnergy(1);
          else if (mode === 1 && revealed >= 1) gainPicks(1);
          else if (mode === 2 && revealed === 0) gainBlock(u ? 6 : 4);
        } else if (cls === 'gambler') {
          if (mode === 0 && flaggedIdx().length >= 2) gainBlock(u ? 6 : 4);
          else if (mode === 1 && verifiedCount() >= 2) drawCards(1);
          else if (mode === 2 && flaggedIdx().length >= 3) hitEnemy(curTarget(), atk(u ? 7 : 5));
        } else if (cls === 'chirurgeon') {
          if (mode === 0 && combat.plating === 0) gainBlock(u ? 6 : 4);
          else if (mode === 1 && combat.block === 0) gainPlating(u ? 4 : 3);
          else if (mode === 2 && combat.block + combat.plating <= 5) gainPicks(1);
        } else if (cls === 'archivist') {
          if (mode === 0 && combat.hand.length <= 3) drawCards(1);
          else if (mode === 2 && combat.discard.length >= 5) drawCards(1);
        } else if (cls === 'warden') {
          if (mode === 0 && combat.block >= 10) gainPlating(2);
          else if (mode === 1) gainBlock(Math.min(5, combat.plating));
          else if (mode === 2 && combat.block > 0) gainPlating(1);
        } else if (cls === 'hexwright') {
          const high = highestNumber();
          if (mode === 0 && high >= 3) gainInsight(1);
          else if (mode === 1 && high >= 3) hitAll(atk(u ? 3 : 2));
          else if (mode === 2) gainBlock(high);
        } else {
          loseHP(1);
          if (!cbt() || combat.over) return;
          if (mode === 0) gainEnergy(1);
          else if (mode === 1) gainBlock(u ? 7 : 5);
          else gainPicks(u ? 3 : 2);
        }
      },
      design: {
        ...def.design,
        mechanicsUsed: [...new Set([...def.design.mechanicsUsed, ...mechanics])],
        archetype: `${def.design.archetype} with ${CLASS_CYCLES[cls]} class sequencing`,
        balanceRisks: `${def.design.balanceRisks} ${riskNote}`,
        tuningRange: `${def.design.tuningRange}; ${tuningNote}`,
      },
    };
  }

  function recipe(slot, cls, classIndex) {
    const p = CLASS_PROFILE[cls];
    const { rarity, tier } = rarityFor(classIndex, slot);
    const dmg = 5 + p.attack + (slot % 4);
    const guard = 4 + p.guard + (slot % 3);
    const scans = 2 + Math.min(2, p.scan);
    const name = `${className(cls)}: ${TITLES[slot]}`;
    const base = { name, rarity, designTier: tier, cls, cost: [1, 1], targets: [] };
    const m = (mechanics, role, example, risk, range, extra = {}) => design({
      mechanics, role, entry: BENEFIT_ENTRY[rarity],
      keep: `Keep when the deck supports ${role.toLowerCase()}; remove if it dilutes a tighter plan.`,
      example, risk, tuning: range, ...extra,
    });

    switch (slot) {
      case 0: return { ...base, type:'Attack', hits:'target', targets:['hidden'],
        text:u=>`Reveal the chosen hidden tile. If it is safe, deal ${u?dmg+3:dmg} damage to the targeted enemy.`,
        play:(u,t)=>{ if(revealTile(t[0],'card-safe').safe) hitEnemy(curTarget(),atk(u?dmg+3:dmg)); },
        design:m(['reveal','target damage'],'Reliable safe-tile tempo','Reveal a likely-safe frontier tile while advancing the fight.','Too efficient if damage rivals attacks without tile requirements.',tuning(dmg)) };
      case 1: return { ...base, type:'Skill', targets:['hidden'],
        text:u=>`Scan the chosen hidden tile. Gain ${u?guard+3:guard} Block.`,
        play:(u,t)=>{scanTile(t[0]);gainBlock(u?guard+3:guard);},
        design:m(['scan','block'],'Information defense','Check a dangerous tile before absorbing an incoming attack.','Zero-risk information plus defense can crowd out pure Scan cards.',tuning(guard)) };
      case 2: return { ...base, type:'Skill', text:u=>`Gain ${u?3:2} picks and ${u?guard+2:guard} Block.`,
        play:u=>{gainPicks(u?3:2);gainBlock(u?guard+2:guard);},
        design:m(['picks','block'],'Manual-dig consistency','Extend a turn after spending the Delver’s normal picks.','Pick generation may enable overly long turns with draw loops.',`${uRange(2,3)} picks; ${tuning(guard)} Block`) };
      case 3: return { ...base, type:'Attack', hits:'random', targets:['hidden'],
        text:u=>`Defuse the chosen hidden tile. If it was mined, deal ${u?dmg+5:dmg+2} damage to a random enemy. If it was safe, draw 1 card.`,
        play:(u,t)=>{if(defuseTile(t[0]))hitRandom(atk(u?dmg+5:dmg+2));else drawCards(1);},
        design:m(['defuse','random damage','draw'],'Mine-or-safe flexibility','Target an uncertain tile and receive useful output either way.','A safe-tile cantrip plus full resolution may be too consistent.',tuning(dmg+2)) };
      case 4: return { ...base, type:'Skill', targets:['number'],
        text:u=>`Gain ${u?2:1} Block plus ${u?3:2} Block for the chosen tile’s number.`,
        play:(u,t)=>gainBlock((u?2:1)+numAt(t[0])*(u?3:2)),
        design:m(['numbered tile','block'],'High-number defense','Turn a revealed 4 into substantial defense.','High-density boards may make this universally efficient.',`1–2 base; 2–3 per number`) };
      case 5: return { ...base, type:'Attack', hits:'target', targets:['hidden'],
        text:u=>`If the chosen tile is correctly flagged, Detonate it and deal ${u?dmg+7:dmg+4} damage to the targeted enemy. Otherwise, Scan it and gain ${u?4:2} Block.`,
        play:(u,t)=>{const c=board().cells[t[0]];if(c.flag&&c.mine){detonateForCards(t[0]);hitEnemy(curTarget(),atk(u?dmg+7:dmg+4));}else{scanTile(t[0]);gainBlock(u?4:2);}},
        design:m(['flag','detonate','scan','block'],'Accurate deduction payoff','Cash in a logically certain flag for damage.','The fallback must not make guessing optimal.',tuning(dmg+4)) };
      case 6: return { ...base, type:'Skill', targets:['hidden'],
        text:u=>`Scan the chosen hidden tile and up to ${u?3:2} adjacent hidden tiles.`,
        play:(u,t)=>{scanTile(t[0]);shuffle(hiddenNeighbors(t[0])).slice(0,u?3:2).forEach(scanTile);},
        design:m(['scan','adjacency'],'Local information','Probe a compact ambiguous cluster.','Large scan bursts can trivialize deduction.',`2–3 adjacent tiles`) };
      case 7: return { ...base, type:'Attack', hits:'target',
        text:u=>`Deal ${u?4:3} damage to the targeted enemy for each tile revealed this turn, up to ${u?24:18}.`,
        play:u=>hitEnemy(curTarget(),atk(Math.min(u?24:18,cbt().revealedThisTurn*(u?4:3)))),
        design:m(['safe reveals','target damage'],'Reveal-chain payoff','Play after a cascade to convert exploration into damage.','Cascade classes could reach the cap too easily.',`3–4 per tile; 18–24 cap`) };
      case 8: return { ...base, type:'Skill', cost:[1,0],
        text:u=>`Lose 1 max pick for the rest of this combat. Gain ${u?guard+6:guard+3} Plating.`,
        play:u=>{loseMaxPicks(1);gainPlating(u?guard+6:guard+3);},
        design:m(['max picks','plating'],'Defensive tradeoff','Trade future digging tempo for protection before a dangerous turn.','Multiple copies can reduce agency by collapsing pick economy.',tuning(guard+3)) };
      case 9: return { ...base, type:'Attack', hits:'target', targets:['hidden'],
        text:u=>`Reveal the chosen hidden tile normally. If it is safe, gain 1 pick and deal ${u?dmg+4:dmg} damage to the targeted enemy.`,
        play:(u,t)=>{if(revealTile(t[0],'reveal').safe&&cbt()){gainPicks(1);hitEnemy(curTarget(),atk(u?dmg+4:dmg));}},
        design:m(['reveal','instinct','picks','target damage'],'Calculated risk','Use deduction to earn back the manual action and deal damage.','Instinct can make blind use too safe early in combat.',tuning(dmg)) };
      case 10:return { ...base, type:'Skill', targets:['hidden'],
        text:u=>`Entomb the chosen hidden tile. Gain ${u?guard+3:guard} Block.`,
        play:(u,t)=>{entombTile(t[0]);if(cbt())gainBlock(u?guard+3:guard);},
        design:m(['entomb','block','full clear'],'Board resolution','Seal a tile that is awkward to solve while defending.','Cheap Entomb effects can make Full Clear deterministic.',tuning(guard)) };
      case 11:return { ...base, type:'Skill', targets:['number'],
        text:u=>`Scan up to ${u?4:3} hidden tiles adjacent to the chosen number. Gain 1 Insight for each mine found.`,
        play:(u,t)=>{let found=0;shuffle(hiddenNeighbors(t[0])).slice(0,u?4:3).forEach(i=>{scanTile(i);if(board().cells[i].mine)found++;});gainInsight(found);},
        design:m(['numbered tile','adjacency','scan','insight'],'Number-cluster analysis','Inspect the neighborhood of a high number and bank its mine information.','Insight gain can spike on dense boards.',`3–4 scans; 1 Insight per mine`) };
      case 12:return { ...base, type:'Skill', targets:['row'],
        text:u=>`Scan up to ${u?4:3} hidden tiles in the chosen row. Gain 2 Block for each mine found.`,
        play:(u,t)=>{const b=board(),xs=[];for(let c=0;c<b.size;c++){const i=t[0]*b.size+c;if(isHiddenUsable(i))xs.push(i);}let n=0;xs.slice(0,u?4:3).forEach(i=>{scanTile(i);if(b.cells[i].mine)n++;});gainBlock(n*2);},
        design:m(['row','scan','block'],'Row information','Check a threatened row and turn mine finds into defense.','Row targeting can be disproportionately strong on shaped boards.',`3–4 scans; 2 Block per mine`) };
      case 13:return { ...base, type:'Attack', hits:'all',
        text:u=>`Deal ${u?3:2} damage to all enemies for each flagged tile, up to ${u?18:12}.`,
        play:u=>hitAll(atk(Math.min(u?18:12,flaggedIdx().length*(u?3:2)))),
        design:m(['flag','all-enemy damage'],'Flag payoff','Mark a set of deduced mines before converting certainty into pressure.','Manual flags are free, so the cap is essential.',`2–3 per flag; 12–18 cap`) };
      case 14:return { ...base, type:'Attack', hits:'target', cost:[0,0],
        text:u=>`Spend up to 2 picks. Deal ${u?dmg+3:dmg} damage to the targeted enemy for each pick spent.`,
        can:()=>cbt().picks>0,canMsg:'No picks left to spend.',
        play:u=>hitEnemy(curTarget(),atk(spendPicks(2)*(u?dmg+3:dmg))),
        design:m(['picks','target damage'],'Pick conversion','Convert spare picks near the end of a turn into damage.','Pick-generating cards could create excessive zero-energy damage.',`${tuning(dmg)} per pick`) };
      case 15:return { ...base, type:'Skill', rarity, targets:['hidden'],
        text:u=>`Reveal the chosen hidden tile. If it is safe, Scan up to ${u?4:3} adjacent hidden tiles and draw 1 card.`,
        play:(u,t)=>{if(revealTile(t[0],'card-safe').safe&&cbt()){shuffle(hiddenNeighbors(t[0])).slice(0,u?4:3).forEach(scanTile);drawCards(1);}},
        design:m(['reveal','adjacency','scan','draw'],'Safe-frontier engine','Open a proven tile, map its perimeter, and replace the card.','Reliable cantrip plus several scans can over-compress decks.',`3–4 adjacent scans`) };
      case 16:return { ...base, type:'Attack', rarity, hits:'all', targets:['hidden'],
        text:u=>`Defuse the chosen hidden tile. If it was mined, gain ${u?guard+3:guard} Plating and deal ${u?dmg+3:dmg} damage to all enemies. If it was safe, gain ${u?guard+2:guard} Block.`,
        play:(u,t)=>{if(defuseTile(t[0])){if(cbt()){gainPlating(u?guard+3:guard);hitAll(atk(u?dmg+3:dmg));}}else if(cbt())gainBlock(u?guard+2:guard);},
        design:m(['defuse','plating','block','all-enemy damage'],'Mine salvage','Turn a known mine into durable defense and area damage.','Known-mine payoff may be too broad for one card.',`${tuning(guard)} defense; ${tuning(dmg)} damage`) };
      case 17:return { ...base, type:'Skill', rarity, targets:['number'],
        text:u=>`Chord the chosen number. If the Chord succeeds, gain ${u?guard+4:guard+1} Block and draw ${u?2:1} card${u?'s':''}.`,
        play:(u,t)=>{const r=chordAt(t[0]);if(r.ok&&cbt()){gainBlock(u?guard+4:guard+1);drawCards(u?2:1);}},
        design:m(['chord','block','draw','accurate deduction'],'Exact-flag reward','After solving a numbered cluster, open its remainder and refill.','Successful Chord already has high board value.',`${tuning(guard+1)} Block; 1–2 cards`) };
      case 18:return { ...base, type:'Skill', rarity, targets:['hidden','hidden'],
        text:u=>`Swap the two chosen hidden tiles, then Scan both. Gain ${u?guard+4:guard} Block.`,
        play:(u,t)=>{swapCells(t[0],t[1]);scanTile(t[0]);scanTile(t[1]);gainBlock(u?guard+4:guard);},
        design:m(['swap','scan','block'],'Board relocation','Move a known risk away from an important neighborhood and confirm both endpoints.','Scanning both endpoints reduces the uncertainty cost of Swap.',tuning(guard)) };
      case 19:return { ...base, type:'Attack', rarity, hits:'random', targets:['hidden','hidden'], optionalTargets:true,
        text:u=>`Defuse up to 2 chosen hidden tiles. For each mine removed, deal ${u?dmg+5:dmg+2} damage to a random enemy.`,
        play:(u,t)=>t.forEach(i=>{if(cbt()&&defuseTile(i))hitRandom(atk(u?dmg+5:dmg+2));}),
        design:m(['defuse','random damage','optional targeting'],'Multi-mine cleanup','Resolve two deduced mines and convert both into attacks.','Two safe resolutions can accelerate Full Clear too cheaply.',`${tuning(dmg+2)} per mine`) };
      case 20:return { ...base, type:'Skill', rarity,
        text:u=>`Add ${u?3:2} safe tiles to the board’s edge. They begin Scanned as safe.`,
        play:u=>annexTiles(u?3:2,false).forEach(i=>board().cells[i].scan='safe'),
        design:m(['annex','scan','safe tiles'],'Safe-edge expansion','Create certain space for later reveals or constructs.','Adding safe tiles can make Full Clear harder despite being safe.',`2–3 tiles`) };
      case 21:return { ...base, type:'Skill', rarity, cost:[2,1], targets:['open'],
        text:u=>`Build a Sentry on the chosen revealed tile. It deals ${u?7:5} damage to a random enemy each turn. Gain ${u?guard+2:guard} Block.`,
        play:(u,t)=>{addConstruct(t[0],'sentry',{dmg:u?7:5});gainBlock(u?guard+2:guard);},
        design:m(['construct','random damage','block'],'Sentry build-around','Place sustained damage where it can absorb a board attack.','Construct stacking can trivialize long fights.',`5–7 Sentry damage`) };
      case 22:return { ...base, type:'Skill', rarity, cost:[2,1], targets:['open'],
        text:u=>`Build a Relay on the chosen revealed tile. It Scans a random hidden tile and grants ${u?4:2} Block each turn. Draw 1 card.`,
        play:(u,t)=>{addConstruct(t[0],'relay',{block:u?4:2});drawCards(1);},
        design:m(['construct','scan','block','draw'],'Relay build-around','Invest in recurring information while replacing the setup card.','Cantrip constructs can become automatic picks.',`2–4 recurring Block`) };
      case 23:return { ...base, type:'Skill', rarity, targets:['hidden'],
        text:u=>`Add a mine to the chosen hidden tile. If a mine is added, verified-flag it and gain ${u?guard+4:guard+1} Plating. If it was already mined, Scan it.`,
        play:(u,t)=>{if(addMineAt(t[0])){verifyFlag(t[0]);gainPlating(u?guard+4:guard+1);}else scanTile(t[0]);},
        design:m(['add mine','verified flag','plating','scan'],'Mine creation','Create controlled ammunition at the cost of a denser board.','Sapper synergies may turn the drawback into pure upside.',tuning(guard+1)) };
      case 24:return { ...base, type:'Attack', rarity, hits:'all', targets:['hidden'],
        text:u=>`Reveal the chosen hidden tile. If it is safe, deal ${u?3:2} damage to all enemies for each tile revealed by its cascade, up to ${u?24:16}.`,
        play:(u,t)=>{const r=revealTile(t[0],'card-safe');if(r.safe&&cbt())hitAll(atk(Math.min(u?24:16,(r.cascade||1)*(u?3:2))));},
        design:m(['reveal','cascade','all-enemy damage'],'Cascade payoff','Choose a likely zero to turn a wide opening into damage.','Zero cascades are shape-dependent and may hit the cap too often.',`2–3 per tile; 16–24 cap`) };
      case 25:return { ...base, type:'Attack', rarity, hits:'all', targets:['number'],
        text:u=>`If adjacent flags equal the chosen number, Chord it and deal ${u?dmg+5:dmg+2} damage to all enemies. Otherwise, Scan up to 3 adjacent hidden tiles.`,
        play:(u,t)=>{const r=chordAt(t[0]);if(r.ok&&cbt())hitAll(atk(u?dmg+5:dmg+2));else shuffle(hiddenNeighbors(t[0])).slice(0,3).forEach(scanTile);},
        design:m(['numbered tile','chord','scan','all-enemy damage'],'Exact-count payoff','Complete a proven cluster for board progress and area damage.','The fallback may remove too much cost from an incorrect setup.',tuning(dmg+2)) };
      case 26:return { ...base, type:'Attack', rarity, hits:'target', targets:['hidden'],
        text:u=>`If the chosen tile is Scanned as a mine, Detonate it and deal ${u?dmg+9:dmg+5} damage to the targeted enemy. Otherwise, Scan it and gain ${u?guard+2:guard} Block.`,
        play:(u,t)=>{const c=board().cells[t[0]];if(c.scan==='mine'&&c.mine){detonateForCards(t[0]);hitEnemy(curTarget(),atk(u?dmg+9:dmg+5));}else{scanTile(t[0]);gainBlock(u?guard+2:guard);}},
        design:m(['scan','detonate','target damage','block'],'Known-mine payoff','Set up with one Scan, then cash the certainty into a large hit.','Two-card setup must outperform generic attacks without dominating.',tuning(dmg+5)) };
      case 27:return { ...base, type:'Skill', rarity, cost:[2,1], targets:['hidden'],
        text:u=>`Scan the chosen hidden tile. If it is safe, Reveal it; if it is mined, Defuse it.${u?' Gain 1 pick.':''}`,
        play:(u,t)=>{scanTile(t[0]);if(board().cells[t[0]].mine)defuseTile(t[0]);else revealTile(t[0],'card-safe');if(u&&cbt())gainPicks(1);},
        design:m(['scan','reveal','defuse','picks'],'Guaranteed tile resolution','Safely resolve a critical tile regardless of its contents.','Deterministic resolution is premium board control.',`2→1 Energy; 0–1 pick`) };
      case 28:return { ...base, type:'Skill', rarity, cost:[2,1],
        text:u=>`Verified-flag ${u?3:2} random hidden mines, then draw 1 card.`,
        play:u=>{shuffle(hiddenIdx().filter(i=>board().cells[i].mine&&!board().cells[i].flag)).slice(0,u?3:2).forEach(verifyFlag);drawCards(1);},
        design:m(['verified flag','draw'],'Flag consistency','Seed guaranteed flags for Chord and mine-payoff cards.','Random guaranteed knowledge can bypass too much deduction.',`2–3 verified flags`) };
      case 29:return { ...base, type:'Skill', rarity, cost:[2,1], targets:['number'],
        text:u=>`Scan every hidden tile adjacent to the chosen number. Gain 1 Energy for every ${u?2:3} mines found, up to 2 Energy.`,
        play:(u,t)=>{let n=0;hiddenNeighbors(t[0]).forEach(i=>{scanTile(i);if(board().cells[i].mine)n++;});gainEnergy(Math.min(2,Math.floor(n/(u?2:3))));},
        design:m(['numbered tile','adjacency','scan','energy'],'Dense-cluster engine','Analyze a high-number neighborhood and refund energy from confirmed danger.','Energy refunds plus Surveyor triggers can approach a free mass Scan.',`1 Energy per 2–3 mines; cap 2`) };
      case 30:return { ...base, type:'Skill', rarity, cost:[2,1], targets:['hidden','hidden'], optionalTargets:true, exhaust:true,
        text:u=>`Entomb up to 2 chosen hidden tiles. Draw ${u?2:1} card${u?'s':''}. Exhaust.`,
        play:(u,t)=>{t.forEach(i=>{if(cbt())entombTile(i);});if(cbt())drawCards(u?2:1);},
        design:m(['entomb','draw','exhaust','full clear'],'Entomb build-around','Remove two stubborn cells from the solve and thin this card for combat.','Repeated copies could force Full Clear with little deduction.',`1–2 cards drawn`) };
      case 31:return { ...base, type:'Attack', rarity, hits:'all', cost:[2,2],
        text:u=>`Detonate up to 3 flagged mines. For each mine detonated, deal ${u?dmg+5:dmg+2} damage to all enemies. Safe flags are Revealed normally.`,
        play:u=>{const b=board();for(const i of flaggedIdx().slice(0,3)){if(!cbt()||board()!==b)break;if(detonateForCards(i))hitAll(atk(u?dmg+5:dmg+2));else revealTile(i,'reveal');}},
        design:m(['flag','detonate','reveal','all-enemy damage'],'Flagged-mine finisher','Turn three proven flags into a major area attack.','Free manual flags make oracle play disproportionately strong.',`${tuning(dmg+2)} per mine`) };
      case 32:return { ...base, type:'Attack', rarity, hits:'target', cost:[2,1], targets:['hidden','hidden','hidden'], optionalTargets:true,
        text:u=>`Reveal up to 3 chosen hidden tiles. Deal ${u?6:4} damage to the targeted enemy for each safe tile revealed.`,
        play:(u,t)=>{let n=0;const b=board();for(const i of t){if(!cbt()||board()!==b)break;if(revealTile(i,'reveal').safe)n++;}if(cbt())hitEnemy(curTarget(),atk(n*(u?6:4)));},
        design:m(['reveal','instinct','target damage','optional targeting'],'Multi-tile risk','Select only tiles supported by deduction for a large focused hit.','Instinct can blunt the risk of selecting uncertain tiles.',`4–6 per safe tile`) };
      case 33:return { ...base, type:'Skill', rarity, cost:[2,1], targets:['open'],
        text:u=>`On a tile numbered 2 or higher, build a Sentry that deals ${u?8:6} damage each turn. Otherwise, build a Relay that grants ${u?4:3} Block each turn.`,
        play:(u,t)=>numAt(t[0])>=2?addConstruct(t[0],'sentry',{dmg:u?8:6}):addConstruct(t[0],'relay',{block:u?4:3}),
        design:m(['numbered tile','construct','random damage','block'],'Adaptive construct','Let board position decide whether the deck gains offense or information-defense.','The Sentry branch may always be preferable on normal boards.',`6–8 damage or 3–4 Block`) };
      case 34:return { ...base, type:'Skill', rarity, cost:[2,1], targets:['hidden'],
        text:u=>`Entomb the chosen hidden tile, then add ${u?3:2} safe tiles to the board’s edge Scanned as safe.`,
        play:(u,t)=>{entombTile(t[0]);if(cbt())annexTiles(u?3:2,false).forEach(i=>board().cells[i].scan='safe');},
        design:m(['entomb','annex','scan'],'Board-shape strategy','Seal a dangerous cell while creating known construction space.','Net board growth may stall Full Clear despite safe information.',`2–3 annexed tiles`) };
      case 35:return { ...base, type:'Skill', rarity, cost:[0,0], exhaust:true,
        can:()=>cbt().picks===0,canMsg:'You still have picks.',
        text:u=>`Playable only with no picks. Gain ${u?3:2} picks and draw ${u?2:1} card${u?'s':''}. Exhaust.`,
        play:u=>{gainPicks(u?3:2);drawCards(u?2:1);},
        design:m(['picks','draw','exhaust'],'Empty-pick recovery','Spend normal picks first, then reopen the turn and cycle.','With draw and pick-spending attacks this can extend turns too far.',`2–3 picks; 1–2 cards`) };
      case 36:return { ...base, type:'Attack', rarity, hits:'all', cost:[2,1],
        text:u=>`Deal 1 damage to all enemies for every ${u?1:2} hidden mines, up to ${u?24:18}.`,
        play:u=>hitAll(atk(Math.min(u?24:18,Math.floor(hiddenMineCount()/(u?1:2))))),
        design:m(['mines','all-enemy damage'],'Dense-board payoff','Attack early while the board still contains many mines.','Upgrade scaling at one damage per mine can dominate late strata.',`1 per 1–2 mines; 18–24 cap`) };
      case 37:return { ...base, type:'Attack', rarity, hits:'target', cost:[2,1],
        text:u=>`Deal 1 damage to the targeted enemy for every ${u?1:2} revealed tiles, up to ${u?28:20}.`,
        play:u=>hitEnemy(curTarget(),atk(Math.min(u?28:20,Math.floor(revealedCount()/(u?1:2))))),
        design:m(['safe reveals','target damage'],'Open-board payoff','Finish a turn of careful digging with a scaling attack.','Large cascades can turn this into a generic capped nuke.',`1 per 1–2 tiles; 20–28 cap`) };
      case 38:return { ...base, type:'Attack', rarity, hits:'all', cost:[2,1],
        text:u=>`Defuse up to ${u?5:4} verified-flagged mines. Deal ${u?5:3} damage to all enemies for each mine removed.`,
        play:u=>{let n=0;const b=board();for(const i of flaggedIdx().filter(i=>b.cells[i].flag===2).slice(0,u?5:4)){if(!cbt()||board()!==b)break;if(defuseTile(i))n++;}if(cbt())hitAll(atk(n*(u?5:3)));},
        design:m(['verified flag','defuse','all-enemy damage'],'Verified-flag payoff','Convert guaranteed marks into safe board progress and damage.','Cards that create verified flags may make this too deterministic.',`3–5 per mine; 4–5 mines`) };
      case 39:return { ...base, type:'Attack', rarity, hits:'target', cost:[2,1], targets:['hidden','hidden'],
        text:u=>`Swap the two chosen hidden tiles. Defuse the first and Scan the second. If the first contained a mine after the swap, deal ${u?dmg+10:dmg+6} damage to the targeted enemy.`,
        play:(u,t)=>{swapCells(t[0],t[1]);const mined=defuseTile(t[0]);if(cbt())scanTile(t[1]);if(mined&&cbt())hitEnemy(curTarget(),atk(u?dmg+10:dmg+6));},
        design:m(['swap','defuse','scan','target damage'],'Sequence manipulation','Move a known mine into the first slot, then cash it out while checking the other.','Known scans can make the setup deterministic.',tuning(dmg+6)) };
      case 40:return { ...base, type:'Skill', rarity:'rare', designTier:'exceptional', cost:[3,2], targets:['row'], exhaust:true,
        text:u=>`Scan every hidden tile in the chosen row. Reveal up to ${u?6:4} tiles Scanned as safe and verified-flag every tile Scanned as a mine. Exhaust.`,
        play:(u,t)=>{const b=board(),xs=[];for(let c=0;c<b.size;c++){const i=t[0]*b.size+c;if(isHiddenUsable(i)){scanTile(i);xs.push(i);}}xs.filter(i=>b.cells[i].mine).forEach(verifyFlag);for(const i of xs.filter(i=>!b.cells[i].mine).slice(0,u?6:4)){if(!cbt()||board()!==b)break;revealTile(i,'card-safe');}},
        design:m(['row','scan','reveal','verified flag','exhaust'],'Showcase row control','Resolve the information state of a crucial row before a boss action.','This approaches deterministic board solving; cost and Exhaust are mandatory.',`4–6 safe reveals`,{overlap:'A much broader, exhausting counterpart to Cross Section.'}) };
      case 41:return { ...base, type:'Attack', rarity:'rare', designTier:'exceptional', hits:'all', cost:[3,2], targets:['hidden','hidden','hidden'], optionalTargets:true, exhaust:true,
        text:u=>`Entomb up to 3 chosen hidden tiles. Deal ${u?7:5} damage to all enemies for each tile Entombed. Exhaust.`,
        play:(u,t)=>{let n=0;for(const i of t){if(!cbt())break;entombTile(i);n++;}if(cbt())hitAll(atk(n*(u?7:5)));},
        design:m(['entomb','all-enemy damage','exhaust','optional targeting'],'Entomb finisher','Resolve three difficult cells and turn the seals into a boss attack.','Three Entombs provide exceptional Full Clear progress.',`5–7 per tile`) };
      case 42:return { ...base, type:'Attack', rarity:'rare', designTier:'exceptional', hits:'all', cost:[2,1], targets:['number'], exhaust:true,
        text:u=>`If every adjacent flag is correct and their count equals the chosen number, Chord it, gain ${u?2:1} Energy, draw ${u?3:2} cards, and deal ${u?16:12} damage to all enemies. Otherwise, Scan all adjacent hidden tiles. Exhaust.`,
        play:(u,t)=>{const b=board(),adj=neighborsOf(t[0],b.size),flags=adj.filter(i=>b.cells[i].flag&&isHiddenUsable(i));const exact=flags.length===numAt(t[0])&&flags.every(i=>b.cells[i].mine);if(exact){chordAt(t[0]);if(cbt()){gainEnergy(u?2:1);drawCards(u?3:2);hitAll(atk(u?16:12));}}else adj.filter(isHiddenUsable).forEach(scanTile);},
        design:m(['numbered tile','flag','accurate deduction','chord','energy','draw','all-enemy damage','exhaust'],'Perfect-deduction showcase','Prove an entire neighborhood to unlock a complete tempo swing.','Energy plus draw can seed combo turns; Exhaust limits repetition.',`1–2 Energy; 2–3 cards; 12–16 damage`) };
      case 43:return { ...base, type:'Attack', rarity:'rare', designTier:'exceptional', hits:'all', cost:[3,2], exhaust:true,
        text:u=>`Defuse up to ${u?6:5} verified-flagged mines. For each mine removed, gain 2 Plating and deal ${u?6:4} damage to all enemies. Exhaust.`,
        play:u=>{let n=0;const b=board();for(const i of flaggedIdx().filter(i=>b.cells[i].flag===2).slice(0,u?6:5)){if(!cbt()||board()!==b)break;if(defuseTile(i))n++;}if(cbt()){gainPlating(n*2);hitAll(atk(n*(u?6:4)));}},
        design:m(['verified flag','defuse','plating','all-enemy damage','exhaust'],'Verified-mine showcase','Spend a large bank of verified flags for offense, defense, and board progress.','Flag generators can turn this into a dominant deterministic finisher.',`5–6 mines; 4–6 damage each`) };
      default:return { ...base, type:'Skill', rarity:'rare', designTier:'exceptional', cost:[3,2], targets:['hidden','hidden','hidden'], optionalTargets:true, exhaust:true,
        text:u=>`Scan up to 3 chosen hidden tiles. Reveal every safe choice and Defuse every mined choice. Gain ${u?2:1} picks. Exhaust.`,
        play:(u,t)=>{const b=board();for(const i of t)scanTile(i);for(const i of t){if(!cbt()||board()!==b)break;if(b.cells[i].mine)defuseTile(i);else revealTile(i,'card-safe');}if(cbt())gainPicks(u?2:1);},
        design:m(['scan','reveal','defuse','picks','exhaust','optional targeting'],'Guaranteed-resolution showcase','Resolve three critical tiles before attempting a Full Clear or boss gate.','This is the strongest deterministic tile control in the expansion.',`3 tiles; 1–2 picks`,{overlap:'A multi-target, exhausting counterpart to Clean Sequence.'}) };
    }
  }

  const classes = Object.keys(CLASS_CYCLES);
  classes.forEach((cls, classIndex) => {
    for (let slot = 0; slot < 45; slot++) defs[`x500_${cls}_${slot}`] = addClassIdentity(recipe(slot, cls, classIndex), cls, slot);
  });

  const burdenEntry = i => [
    'Existing event penalty or unfavorable event outcome.',
    'Existing enemy or board-outcome penalty.',
    'Existing risk/reward event consequence.',
    'Existing event penalty or merchant trap outcome.',
    'Existing puzzle or failed-deduction consequence.',
  ][Math.floor(i / 10)];

  for (let i = 0; i < 50; i++) {
    const family = Math.floor(i / 10), rank = i % 10;
    const type = i % 2 ? 'Curse' : 'Status';
    const name = BURDEN_TITLES[i];
    const common = {
      name, type, rarity:'special', designTier:'burden', cls:null, exhaust:true,
      design: design({
        mechanics: [], role: ['Inefficient defense','Risky reveal','Mine creation','Pick-for-defense trade','Inefficient information'][family],
        value:'intentionally negative', entry:burdenEntry(i),
        keep:'Keep only when its narrow effect supports the current archetype or when removal is better spent on a worse burden; otherwise remove it.',
        example:['Spend excess Energy for a small emergency Block.','Use after Picks are exhausted to attempt one carefully deduced reveal.','Give a Sapper a verified mine while accepting a denser board.','Trade a Pick you cannot safely use for Plating.','Trigger Surveyor scan-count or inspect one essential tile.'][family],
        risk:['May be too harmless if its defensive floor is high.','May be too punishing if Instinct is already spent.','May become beneficial too often in mine-focused decks.','Repeated copies can collapse the player’s pick economy.','May be an easy keep for Surveyor if priced too cheaply.'][family],
        tuning:['2 Energy for 2–4 Block','1 Energy; 1–3 Block on safe reveal','1 Energy; 3–5 Block','1 Energy; 4–7 Plating','1–2 Energy for one Scan'][family],
        overlap:'Uses an intentionally inefficient version of an established basic effect.',
      }),
    };
    if (family === 0) defs[`x500_burden_${i}`] = { ...common, cost:[2,1], targets:[],
      text:u=>`Gain ${u?4:2+(rank%2)} Block. Exhaust.`, play:u=>gainBlock(u?4:2+(rank%2)) };
    else if (family === 1) defs[`x500_burden_${i}`] = { ...common, cost:[1,1], targets:['hidden'],
      text:u=>`Reveal the chosen hidden tile normally. If it is safe, gain ${u?3:1} Block. Exhaust.`,
      play:(u,t)=>{if(revealTile(t[0],'reveal').safe&&cbt())gainBlock(u?3:1);} };
    else if (family === 2) defs[`x500_burden_${i}`] = { ...common, cost:[1,0], targets:['hidden'],
      text:u=>`Add a mine to the chosen hidden tile. If a mine is added, verified-flag it and gain ${u?5:3} Block. If it was already mined, Scan it. Exhaust.`,
      play:(u,t)=>{if(addMineAt(t[0])){verifyFlag(t[0]);gainBlock(u?5:3);}else scanTile(t[0]);} };
    else if (family === 3) defs[`x500_burden_${i}`] = { ...common, cost:[1,0], targets:[],
      text:u=>`Lose 1 max pick for the rest of this combat. Gain ${u?7:5} Plating. Exhaust.`,
      play:u=>{loseMaxPicks(1);gainPlating(u?7:5);} };
    else defs[`x500_burden_${i}`] = { ...common, cost:[rank%3===0?2:1,1], targets:['hidden'],
      text:()=>`Scan the chosen hidden tile. Exhaust.`, play:(u,t)=>scanTile(t[0]) };
  }

  return defs;
}

function uRange(a, b) { return `${a}–${b}`; }
