/* Authored crypt encounters.
   Events deliberately keep their rules beside their fiction: there is no shared
   "behavioral profile" assigning interchangeable rewards to unrelated stories. */

function whole(value) {
  return Math.max(1, Math.round(value));
}

function scaled(context, base, perStratum = .18) {
  return whole(base * (1 + Math.max(0, context.stratum || 0) * perStratum));
}

const action = (key, label) => ({ key, label });
const outcome = (result, effect = {}, preview = '') => ({ result, effect, preview });

const AUTHORED_EVENTS = {
  shrine: {
    emoji: '🚪',
    title: 'The Two-Door Shrine',
    text: 'A saint of miners holds two brass doors shut. Warm air breathes through one seam; gold light leaks through the other. The inscription promises that one door rewards courage and the other remembers every grave-robber.',
    actions: [action('warm', 'Open the warm door'), action('gold', 'Open the golden door')],
    build: (context, rolls, meta) => {
      const prize = scaled(context, 46);
      const damage = scaled(context, 10, .14);
      const warmWins = rolls[0] < .5;
      const door = win => win
        ? outcome('The saint’s stone hand opens. Old offerings tumble into your pack.', { gold: prize }, `The door may hold ${prize} gold—or the shrine’s buried charge.`)
        : outcome('The hinges scream. A funeral charge erupts beneath the threshold.', { damage }, `The door may hold ${prize} gold—or deal ${damage} damage.`);
      return { warm: door(warmWins), gold: door(!warmWins) };
    },
  },

  corpse: {
    emoji: '🪦',
    title: "The Cartographer's Corpse",
    text: 'A cartographer died within sight of a camp marker. His annotated charts are dry beneath his coat; his charcoal-stained hand still points toward an unmarked side passage.',
    actions: [action('take', 'Take the annotated maps'), action('bury', 'Bury him beside his marker')],
    build: (context, rolls, meta) => ({
      take: outcome('The maps are excellent. So is the dead man’s talent for imagining walls closing in.', { gadget: meta.gadgetKey, curse: 'claustrophobia' }, 'Gain a gadget, but add Claustrophobia to your deck.'),
      bury: outcome('You finish the marker he could not reach. The quiet work steadies your breathing.', { maxHp: 3 }, 'Gain 3 max Health.'),
    }),
    followup: {
      text: thread => thread.choice === 'bury'
        ? 'A later survey crew found the grave marker and followed the charcoal arrow you preserved. They offer you first choice from the recovered cache.'
        : 'The cartographer’s old crew recognizes the charts hanging from your pack. They ask where you found their missing friend.',
      actions: [
        { key: 'truth', label: 'Tell them the whole truth', result: 'They listen without interrupting, then pay for the route and carry the news home.', effect: { gold: 24 } },
        { key: 'return', label: 'Give them the charcoal map', result: 'You surrender the best sheet. Their surgeon treats the dust-sickness and cuts the cartographer’s fear from your pack.', effect: { heal: 6, removeCard: 'claustrophobia' } },
      ],
    },
  },

  ratdoors: {
    emoji: '🐀',
    title: "The Rat's Three Doors",
    text: 'The Rat Merchant hides a coffer behind one of three doors. After you choose, he opens an unchosen door to reveal a tethered cave-goat and offers to buy back your claim.',
    actions: [action('sell', 'Sell the claim to the Rat'), action('switch', 'Switch to the remaining door')],
    build: (context, rolls) => {
      const sale = scaled(context, 22);
      const jackpot = scaled(context, 72);
      return {
        sell: outcome('The Rat pays immediately and bars every door before curiosity can become regret.', { gold: sale }, `Take ${sale} gold with no gamble.`),
        switch: rolls[0] < .67
          ? outcome('The remaining door swings wide on a coffer packed with clipped grave-coins.', { gold: jackpot }, `The informed switch has a strong chance to uncover ${jackpot} gold.`)
          : outcome('The goat behind your first door bleats as the remaining chamber proves painfully empty.', {}, `The informed switch has a strong chance to uncover ${jackpot} gold.`),
      };
    },
  },

  prisoners: {
    emoji: '⛓️',
    title: "The Prisoners' Bargain",
    text: 'A chained delver reaches the same buried cache from the opposite cell. There is enough slack to split it cleanly—or to drag the whole box through your own bars while they hold the chain.',
    actions: [action('share', 'Count out an equal share'), action('seize', 'Drag the cache through your bars')],
    build: context => ({
      share: outcome('The stranger keeps the chain steady. Both of you leave richer, and neither leaves hunted.', { gold: scaled(context, 32) }, 'Gain a fair share of the cache.'),
      seize: outcome('You wrench the box free. The chain takes skin from both wrists, and the stranger memorizes your face.', { gold: scaled(context, 55), damage: scaled(context, 5, .1) }, 'Gain more gold, but take damage and make an enemy.'),
    }),
    followup: {
      text: thread => thread.choice === 'share'
        ? 'The freed prisoner catches up at a collapsed bridge. They have already anchored a second rope and kept your side clear.'
        : 'The prisoner from the cells waits at a collapsed bridge with your stolen chain wrapped around one fist.',
      actions: [
        { key: 'cross', label: 'Trust the rope they offer', result: 'The rope holds. They teach you the hitch that lets one pair of hands do the work of two.', effect: { pickBonus: 1 } },
        { key: 'pay', label: 'Leave a purse and take the long path', result: 'Coin settles what trust could not. The long route passes an abandoned supply niche.', effect: { gold: -12, upgrade: true } },
      ],
    },
  },

  alchemist: {
    emoji: '🧪',
    title: "The Alchemist's Red Test",
    text: 'A field alchemist’s strip stains red in your blood. Red can mean the Rot, but lamp-smoke causes the same stain. Your throat feels clear; the nearby quarantine bell is already ringing.',
    actions: [action('quarantine', 'Enter quarantine now'), action('confirm', 'Spend coin on a clean second test')],
    build: (context, rolls) => {
      const cost = Math.min(context.gold || 0, scaled(context, 12));
      return {
        quarantine: outcome('You burn your outer clothes and sleep behind salt lines. Whatever the stain meant, the enforced rest helps.', { heal: 8, gold: -Math.min(context.gold || 0, 5) }, 'Lose up to 5 gold in supplies and recover 8 Health.'),
        confirm: rolls[0] < .12
          ? outcome('The clean test also turns red. Early treatment is bitter, expensive, and effective.', { gold: -cost, maxHp: 2 }, `Pay up to ${cost} gold. The confirmed treatment grants 2 max Health.`)
          : outcome('The clean strip stays white. Lamp-smoke, nothing more. The alchemist charges for the relief.', { gold: -cost }, `Pay up to ${cost} gold to learn whether treatment is needed.`),
      };
    },
  },

  mushroombed: {
    emoji: '🍄',
    title: 'The Common Mushroom Bed',
    text: 'Glowcaps crowd a damp shelf beside a slate asking each crew to harvest only one handful. Fresh knife marks show that the last visitor took three.',
    actions: [action('share', 'Cut one careful handful'), action('strip', 'Strip every mature cap')],
    build: context => ({
      share: outcome('You leave the young caps and spread their spores across the wet stone.', { heal: 7, gold: 8 }, 'Recover 7 Health and gain 8 gold.'),
      strip: outcome('Your sack fills. Behind you, the shelf goes dark and the slate accusation follows.', { gold: scaled(context, 50), curse: 'dud' }, 'Gain a large purse, but add a Dud to your deck.'),
    }),
    followup: {
      text: thread => thread.choice === 'share'
        ? 'The tended glowcaps now illuminate a whole refugee camp. Its keeper recognizes your careful cut marks.'
        : 'You return to the shelf in darkness. A hungry camp has settled beside the bare stone.',
      actions: [
        { key: 'help', label: 'Share supplies with the camp', result: 'The camp cooks what remains, patches your wounds, and burns one piece of dead weight from your pack.', effect: { gold: -10, heal: 8, removeCard: 'dud' } },
        { key: 'pass', label: 'Follow the dark shelf onward', result: 'In the black beyond the camp, your fingers find a coin crack everyone else missed.', effect: { gold: 18 } },
      ],
    },
  },

  floodedstair: {
    emoji: '🌊',
    title: 'The Flooded Stair',
    text: 'Black water climbs a spiral stair while a miner hammers from behind a rusted gate below. The gate wheel will turn, but opening it will release the water into your route.',
    actions: [action('gate', 'Open the gate and pull the miner free'), action('climb', 'Climb before the stair floods')],
    build: context => ({
      gate: outcome('The water hits like a dropped wall. You lose supplies, but two pairs of hands reach the dry landing.', { damage: scaled(context, 7, .12), gold: -Math.min(context.gold || 0, 8) }, 'Take damage and lose up to 8 gold saving the trapped miner.'),
      climb: outcome('You reach the upper arch dry. The hammering stops several turns later.', { gold: scaled(context, 24) }, 'Keep the salvage gathered on the climb.'),
    }),
    followup: {
      text: thread => thread.choice === 'gate'
        ? 'The rescued miner has braced a dangerous shaft and saved a bright seam for the delver who turned the wheel.'
        : 'The flooded stair has drained. A waterlogged pack rests against the gate that never opened.',
      actions: [
        { key: 'claim', label: 'Enter the braced shaft', result: 'The braces groan but hold while you cut a bright pocket and temper a card against its face.', effect: { gold: 24, upgrade: true } },
        { key: 'salvage', label: 'Search the waterlogged pack', result: 'Most of it is ruined. One sealed field dressing is not.', effect: { heal: 10 } },
      ],
    },
  },

  beggingshade: {
    emoji: '👻',
    title: 'The Begging Shade',
    text: 'A translucent child sits beside an empty funeral bowl. “One coin for the ferryman,” it whispers. The bowl’s underside is scratched raw by hands that tried to take coins back.',
    actions: [action('give', 'Place ten gold in the bowl'), action('take', 'Turn the bowl over for hidden coins')],
    build: context => ({
      give: outcome('The child smiles, becomes old for one heartbeat, and vanishes. Your next breath comes easier.', { gold: -Math.min(context.gold || 0, 10), maxHp: 2 }, 'Pay up to 10 gold and gain 2 max Health.'),
      take: outcome('Coins spill from a cavity beneath the bowl. Cold little fingers settle around your wrist.', { gold: 34, curse: 'claustrophobia' }, 'Gain 34 gold and add Claustrophobia to your deck.'),
    }),
  },

  twinidols: {
    emoji: '🗿',
    title: 'The Twin Idols',
    text: 'Two miners’ gods share one plinth. The iron idol holds a pick; the salt idol holds a closed eye. The offering slot can feed only one before the chamber seals.',
    actions: [action('iron', 'Offer blood to the iron idol'), action('salt', 'Offer gold to the salt idol')],
    build: context => ({
      iron: outcome('The iron pick strikes your best card once, leaving its edges sharp enough to cut stone.', { damage: 5, upgrade: true }, 'Take 5 damage and upgrade a card.'),
      salt: outcome('Salt pours from the idol’s eye and closes your shallow wounds without leaving a scar.', { gold: -Math.min(context.gold || 0, 14), heal: 13 }, 'Pay up to 14 gold and recover 13 Health.'),
    }),
  },

  bonegame: {
    emoji: '🦴',
    title: 'The Ossuary Game',
    text: 'A skeleton cups one black knucklebone and one white. “Name the hand with white and take my purse. Name black and add your finger to the stakes.” Its sleeves drag equally on the floor.',
    actions: [action('left', 'Name the left hand'), action('right', 'Name the right hand')],
    build: (context, rolls) => {
      const leftWins = rolls[0] < .5;
      const prize = scaled(context, 58);
      const loss = scaled(context, 9, .14);
      const pick = wins => wins
        ? outcome('White bone. The skeleton bows and unhooks its purse.', { gold: prize }, `A blind half-chance at ${prize} gold.`)
        : outcome('Black bone. The skeleton accepts blood in place of a finger—this time.', { damage: loss }, `A blind half-chance; failure deals ${loss} damage.`);
      return { left: pick(leftWins), right: pick(!leftWins) };
    },
  },

  tolldoor: {
    emoji: '🔔',
    title: 'The Bell-Toll Door',
    text: 'A bronze door bears no lock, only a bell-rope and a tariff: FIFTEEN GOLD, OR ONE PROMISE OWED BELOW. Something patient breathes on the other side.',
    actions: [action('pay', 'Pay the posted toll'), action('promise', 'Ring the bell and promise a future service')],
    build: context => ({
      pay: outcome('The coins vanish into the wall. The door opens without learning your name.', { gold: -Math.min(context.gold || 0, 15), heal: 4 }, 'Pay up to 15 gold and recover 4 Health in the quiet room beyond.'),
      promise: outcome('The bell speaks your name in a voice you have never used. The door opens for its new debtor.', { gold: 20 }, 'Keep your purse and find 20 gold beyond, but the toll-keeper will return.'),
    }),
    followup: {
      text: thread => thread.choice === 'promise'
        ? 'The toll-keeper rings from inside your pack. It asks you to carry a leaden bell until the next camp—or settle the debt in blood.'
        : 'The bronze door’s keeper finds you again and returns one of your coins: “An honest toll buys an honest road.”',
      actions: [
        { key: 'carry', label: 'Carry the leaden bell', result: 'The bell drags at every step, then cracks open at camp to reveal a tempered card-rivet.', effect: { curse: 'dud', upgrade: true } },
        { key: 'settle', label: 'Settle the account now', result: 'The keeper takes exactly what the old inscription promised and leaves no second debt.', effect: { damage: 8, gold: 12 } },
      ],
    },
  },

  cavernhound: {
    emoji: '🐕',
    title: 'The Cavern Hound',
    text: 'A blind hound guards a miner’s pack. A snapped trap chain cuts deep into its foreleg; each growl is weaker than the last.',
    actions: [action('free', 'Cut the trap and bind its leg'), action('pack', 'Distract it and steal the pack')],
    build: (context, rolls, meta) => ({
      free: outcome('The hound flinches from the blade, then permits the bandage. It follows your scent into the dark.', { heal: 5 }, 'Spend time helping the hound and recover 5 Health while you rest.'),
      pack: outcome('You get the pack. The hound gets one bite before limping away.', { gadget: meta.gadgetKey, damage: scaled(context, 6, .1) }, 'Gain a gadget, but take a bite.'),
    }),
    followup: {
      text: thread => thread.choice === 'free'
        ? 'The blind hound finds you beside a false wall and paws at one loose stone until a hidden cache shows.'
        : 'The wounded hound corners you at a dead end. It has learned to follow the smell of its stolen pack.',
      actions: [
        { key: 'kneel', label: 'Kneel and offer an open hand', result: 'The hound chooses the hand over the throat and leads you to what it found.', effect: { gold: 30, heal: 6 } },
        { key: 'drive', label: 'Drive it away with a flare', result: 'It flees. The flare also exposes old reinforcement marks on your gear.', effect: { damage: 4, upgrade: true } },
      ],
    },
  },

  glowcapfeast: {
    emoji: '🍲',
    title: 'The Glowcap Feast',
    text: 'A table is laid for twelve beneath luminous caps. Eleven chairs contain skeletons with clean bowls. The twelfth bowl steams, and your name is carved into its spoon.',
    actions: [action('eat', 'Take your appointed seat and eat'), action('burn', 'Burn the caps and search the table')],
    build: (context, rolls) => ({
      eat: rolls[0] < .65
        ? outcome('The broth tastes of childhood kitchens. Warmth returns to places the crypt had numbed.', { heal: 15, maxHp: 1 }, 'The feast is usually nourishing, but its diners offer no reassurance.')
        : outcome('The skeletons turn their clean bowls toward you as the bitter caps take hold.', { damage: scaled(context, 8, .12), curse: 'dud' }, 'The feast is usually nourishing, but its diners offer no reassurance.'),
      burn: outcome('Blue fire races across the caps. Beneath the table you find the diners’ untouched purses.', { gold: scaled(context, 38) }, 'Destroy the feast and take the dead diners’ gold.'),
    }),
  },

  echoingchoir: {
    emoji: '🎵',
    title: 'The Echoing Choir',
    text: 'A buried choir sustains one impossible note. Cracks in the ceiling close whenever you match it and widen whenever you breathe. A donation box rattles in the vibration.',
    actions: [action('sing', 'Hold the note with the choir'), action('silence', 'Break the echo and raid the box')],
    build: context => ({
      sing: outcome('Your voice frays, but the ceiling seals and the choir folds one stronger note into your lungs.', { damage: 3, maxHp: 3 }, 'Lose 3 Health and gain 3 max Health.'),
      silence: outcome('A thrown stone breaks the resonance. The ceiling sheds rubble while you empty the box.', { gold: scaled(context, 44), damage: scaled(context, 6, .1) }, 'Gain the offerings, but take falling-stone damage.'),
    }),
  },

  markedledger: {
    emoji: '📕',
    title: 'The Marked Ledger',
    text: 'The foreman’s ledger lists wages stolen from dead crews. Your own name appears on the final blank line beside an amount not yet entered.',
    actions: [action('names', 'Copy the victims’ names and expose the theft'), action('amount', 'Write in your price and sign')],
    build: context => ({
      names: outcome('At the next camp, the names buy testimony, gratitude, and a careful repair to your deck.', { gold: 16, upgrade: true }, 'Gain 16 gold and upgrade a card.'),
      amount: outcome('The ink supplies every coin you demand, then writes DUD across one card in your pack.', { gold: scaled(context, 62), curse: 'dud' }, 'Gain a large payment and add a Dud to your deck.'),
    }),
    followup: {
      text: thread => thread.choice === 'names'
        ? 'Families from the ledger have cornered the foreman. They need your copied page to finish the case before he buys the watch.'
        : 'The ledger’s foreman finds your signature and offers a final payment to swear the book never existed.',
      actions: [
        { key: 'testify', label: 'Put your name beneath the evidence', result: 'The foreman falls. The recovered wages are divided among every surviving name.', effect: { gold: 34, maxHp: 1 } },
        { key: 'deal', label: 'Take the foreman’s private settlement', result: 'The purse is heavy. The silence is heavier, though it fits inside the pack.', effect: { gold: 48, curse: 'dud' } },
      ],
    },
  },

  groaningvault: {
    emoji: '🏚️',
    title: 'The Groaning Vault',
    text: 'A treasure vault has sunk sideways into a fault. Each groan drops more dust from its lintel. A small coffer lies near the door; a jeweled reliquary glints at the back.',
    actions: [action('coffer', 'Take the near coffer and leave'), action('reliquary', 'Crawl to the jeweled reliquary')],
    build: (context, rolls, meta) => ({
      coffer: outcome('You hook the coffer with a pick and clear the lintel before the next shudder.', { gold: scaled(context, 28) }, 'Take a modest coffer safely.'),
      reliquary: rolls[0] < .55
        ? outcome('The floor tilts, but you reach the reliquary and roll free with its mechanism intact.', { gadget: meta.gadgetKey, gold: scaled(context, 26) }, 'Risk the collapse for a gadget and gold.')
        : outcome('The reliquary is bolted down. The vault folds before you can wrench it loose.', { damage: scaled(context, 12, .14) }, 'Risk the collapse for a gadget and gold.'),
    }),
  },

  signalfire: {
    emoji: '🔥',
    title: 'The Last Signal Fire',
    text: 'Across a lightless chasm, three stranded miners wave beside an unlit signal basket. Your lamp oil can reach them as a burning arrow, but you will travel the next tunnels in darkness.',
    actions: [action('light', 'Use your lamp oil to light the signal'), action('keep', 'Keep the oil and mark their location')],
    build: context => ({
      light: outcome('The basket catches. A rescue bell answers from far above while you wrap a burned hand.', { damage: 4, heal: 8 }, 'Lose 4 Health to the burn, then recover 8 while the rescue line descends.'),
      keep: outcome('You copy the location carefully. Their shouts follow your lamp until stone finally swallows them.', { gold: 18 }, 'Conserve supplies and find 18 gold along the lit route.'),
    }),
    followup: {
      text: thread => thread.choice === 'light'
        ? 'One of the rescued miners has returned with a spool of silver rescue-line and insists you take it.'
        : 'A recovery crew studies the location you marked. The stranded miners are silent now, but their equipment may still be reached.',
      actions: [
        { key: 'line', label: 'Accept the silver rescue-line', result: 'The rescue hitch gives you permanent leverage, and its silver fibers reinforce your oldest card.', effect: { pickBonus: 1, upgrade: true } },
        { key: 'cache', label: 'Guide the recovery crew to the ledge', result: 'The crew splits the recovered equipment with its guide.', effect: { gold: 32 } },
      ],
    },
  },

  sharedrope: {
    emoji: '🪢',
    title: 'The Fraying Rope',
    text: 'A rival delver hangs below you from the same rope. The anchor is walking out of the rock. Their belt carries a hammer; your ledge has room to brace exactly once.',
    actions: [action('brace', 'Wrap the rope around your arm and hold'), action('cut', 'Cut their end before the anchor fails')],
    build: (context, rolls, meta) => ({
      brace: outcome('The rope strips skin to the bone, but the rival climbs high enough to hammer the anchor home.', { damage: scaled(context, 7, .1), gadget: meta.gadgetKey }, 'Take damage; the rescued rival gives you a gadget.'),
      cut: outcome('The anchor holds the instant their weight vanishes. Their pack catches on a spur below.', { gold: scaled(context, 42) }, 'Take the rival’s reachable purse.'),
    }),
  },

  woundedrival: {
    emoji: '⚔️',
    title: 'The Wounded Rival',
    text: 'A rival map-runner lies pinned beneath a slab. Their route-book points toward a rich seam you both intended to claim. Moving the stone will cost precious time; taking the book will not.',
    actions: [action('lift', 'Lever the slab off together'), action('book', 'Take the route-book and leave')],
    build: context => ({
      lift: outcome('The improvised lever snaps, but not before the rival crawls free. They bind your strained shoulder and tear the route page in half.', { damage: 3, heal: 9, gold: 14 }, 'Lose 3 Health, recover 9, and take a fair share of the route’s value.'),
      book: outcome('You reach the seam first. Its richest face has already been marked with the rival’s family sign.', { gold: scaled(context, 54) }, 'Claim the rich seam alone.'),
    }),
    followup: {
      text: thread => thread.choice === 'lift'
        ? 'The rival reaches the marked seam by another route and has left your half untouched, exactly as promised.'
        : 'The rival survived the slab. They stand between you and the seam with an empty scabbard and a very full blasting satchel.',
      actions: [
        { key: 'split', label: 'Split the seam as first agreed', result: 'Two crews work faster than one, and neither wastes powder watching the other.', effect: { gold: 36, heal: 5 } },
        { key: 'yield', label: 'Yield the claim and ask for safe passage', result: 'The rival takes the seam but honors the request, reinforcing your route out.', effect: { maxHp: 2 } },
      ],
    },
  },
};

export const FICTION_EVENT_CATALOG = Object.fromEntries(
  Object.entries(AUTHORED_EVENTS).map(([key, event]) => [key, { fiction: true, ...event }]),
);

export function createFictionEventState(event, context, rolls, gadgetKey = null) {
  return {
    version: 2,
    stage: 'choice',
    rolls,
    outcomes: event.build(context, rolls, { gadgetKey }),
  };
}

export function fictionEventView(event, state) {
  return {
    stageLabel: 'A choice in the dark',
    text: event.text,
    choices: event.actions.map(item => ({
      ...item,
      desc: state.outcomes[item.key]?.preview || '',
    })),
  };
}

export function resolveFictionEvent(event, state, key) {
  if (state.stage !== 'choice') return null;
  const actionDef = event.actions.find(item => item.key === key);
  const selected = state.outcomes[key];
  if (!actionDef || !selected) return null;
  state.stage = 'resolved';
  return { ...selected, action: actionDef, title: event.title };
}

export function fictionEventFollowup(event, thread) {
  const followup = event?.followup;
  if (!followup || !thread) return null;
  return {
    title: `${event.title}: What Followed`,
    stageLabel: 'A consequence returns',
    text: followup.text(thread),
    choices: followup.actions.map(item => ({ key: item.key, label: item.label, desc: '' })),
  };
}

export function resolveFictionEventFollowup(event, key) {
  return event?.followup?.actions.find(item => item.key === key) || null;
}
