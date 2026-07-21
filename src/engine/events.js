/* Additional event content. The engine resolves the compact outcome metadata so
   this bank can grow without adding another branch to eventChoice for each room. */

/* Design-only reference notes preserve the factual source material for audits.
   Live event views and results never expose these questions, answer keys, or explanations. */
const REFERENCE_NOTES = [
  ['mean-median', '⚖️', 'The Crooked Average', 'One delver has 100 gold; nine have none. Which best describes the typical purse?', 'Median: 0 gold', 'Mean: 10 gold', 'Mode: 100 gold', 'The median resists the single extreme purse; the mean is pulled upward.'],
  ['gambler-fallacy', '🪙', 'Five Tails in the Dust', 'A fair coin has landed tails five times. What is the chance of heads next?', '50%', 'More than 50%', 'Less than 50%', 'Independent flips do not remember the previous streak.'],
  ['expected-die', '🎲', 'The Bone Die', 'What is the expected value of one fair six-sided die?', '3.5', '3', '4', 'Average all six equally likely faces: 21 divided by 6 is 3.5.'],
  ['conditional-coin', '🪙', 'At Least One Head', 'Two fair coins are tossed. Given at least one head, what is the chance both are heads?', '1/3', '1/2', '1/4', 'The remaining equally likely outcomes are HH, HT, and TH.'],
  ['large-numbers', '📈', 'The Long Ledger', 'What happens to a sample average as independent trials accumulate?', 'It tends toward the expected value', 'It becomes exactly correct after 100 trials', 'It grows without limit', 'The law of large numbers describes convergence, not a magic sample size.'],
  ['simpson', '🌀', "Simpson's Staircase", 'Two groups each favor treatment A, yet the combined data favor B. What can cause this?', 'Different group sizes or confounding', 'Arithmetic becomes invalid', 'The samples must be identical', 'Aggregation can reverse a trend when a lurking variable changes group weights.'],
  ['regression-mean', '🎯', 'The Champion Returns', 'An exceptionally lucky score is followed by a more ordinary score. The simplest explanation?', 'Regression toward the mean', 'A permanent curse', 'The rules changed', 'Extreme observations often combine skill with temporary noise.'],
  ['survivorship', '🛡️', 'Armor of the Survivors', 'You reinforce only the places where returning armor is damaged. What did you overlook?', 'Armor that was hit where no one returned', 'The most common scratch', 'The average armor weight', 'Survivorship bias hides failures missing from the observed sample.'],
  ['correlation', '🔗', 'Two Rising Shadows', 'Torch sales and cave accidents rise together. What can you conclude?', 'Association, not necessarily causation', 'Torches cause every accident', 'Accidents manufacture torches', 'A third factor, such as more cave traffic, may drive both.'],
  ['p-value', '🧪', 'The Small P-Rune', 'A p-value of 0.03 means what?', 'The data are unusual if the null model is true', 'The null has a 3% chance of being true', 'The result has a 97% chance of repeating', 'A p-value conditions on the null; it is not the probability that the null is true.'],
  ['confidence', '📏', 'Ninety-Five Runes', 'What does a 95% confidence procedure promise?', 'About 95% of intervals from repeated samples cover the true value', 'This interval has a mystical 95% truth chance', '95% of the data lie inside every interval', 'Coverage describes the long-run procedure used to construct intervals.'],
  ['sampling-bias', '📨', 'The Voluntary Census', 'A danger survey only hears from delvers angry enough to reply. The main problem?', 'Self-selection bias', 'Too many random samples', 'Perfect blinding', 'Volunteers can differ systematically from silent delvers.'],
  ['independence', '✂️', 'Separate Tunnels', 'Events A and B are independent when…', 'Knowing A does not change the probability of B', 'They can never occur together', 'They have equal probabilities', 'Independence concerns information, not equality or mutual exclusion.'],
  ['permutations', '🔢', 'Three Runes in Order', 'How many orders can three distinct runes take?', '6', '3', '9', 'There are 3 × 2 × 1 permutations.'],
  ['combinations', '🗝️', 'Choose Two Keys', 'How many unordered pairs can be chosen from four distinct keys?', '6', '8', '12', 'Four choose two equals 4×3 divided by 2.'],
  ['binomial', '🏹', 'Exactly Two Hits', 'With three independent 50% shots, what is the chance of exactly two hits?', '3/8', '1/8', '1/2', 'There are three two-hit sequences among eight equally likely sequences.'],
  ['geometric', '⏳', 'Until the First Six', 'With a fair die, how many rolls are expected until the first six?', '6', '3.5', '36', 'A geometric wait with success probability 1/6 has mean 6.'],
  ['poisson', '🦇', 'Bats per Minute', 'Independent rare arrivals at a stable average rate are often modeled by…', 'A Poisson distribution', 'A uniform distribution', 'A deterministic line', 'The Poisson model counts independent arrivals over an interval.'],
  ['normal-rule', '🔔', 'The Bell Chamber', 'Roughly what fraction of normal observations lie within one standard deviation?', '68%', '50%', '95%', 'The 68–95–99.7 rule gives the familiar normal ranges.'],
  ['central-limit', '🏛️', 'Averages of Many Rooms', 'Why do many sample averages look approximately normal?', 'The central limit theorem', 'Every raw population is normal', 'Averages erase all uncertainty', 'Under broad conditions, standardized sums approach a normal shape.'],
  ['variance', '📐', 'The Spread Rune', 'Variance measures…', 'Average squared distance from the mean', 'The largest observation', 'The middle observation', 'Squaring makes deviations positive and emphasizes larger distances.'],
  ['standard-deviation', '📏', 'Root of the Spread', 'Standard deviation is useful because it is…', 'In the original measurement units', 'Always between zero and one', 'The same as the mean', 'It is the square root of variance and returns to the original units.'],
  ['ticket-ev', '🎟️', 'The One-in-Ten Ticket', 'A ticket costs 6 gold and has a 10% chance to pay 50. Its net expected value?', '−1 gold', '+5 gold', '+44 gold', 'Expected payout is 5 gold; subtract the 6-gold cost.'],
  ['risk-aversion', '🛡️', 'Certain Thirty', 'Why might someone prefer certain 30 gold over a 50/50 chance at 100 or nothing?', 'Diminishing marginal utility', 'The gamble has lower expected gold', 'Probabilities cannot be compared', 'The gamble has higher expected gold, but wealth can have concave utility.'],
  ['nash', '♟️', 'No One Moves Alone', 'A Nash equilibrium is a profile where…', 'No player benefits by changing alone', 'Everyone receives the same payoff', 'The outcome is always socially best', 'Equilibrium is about unilateral deviations, not fairness or efficiency.'],
  ['dominant-strategy', '👑', 'The Dominant Move', 'A dominant strategy is best…', 'Against every strategy opponents might choose', 'Only when opponents cooperate', 'Only after seeing the outcome', 'Dominance compares a move across all opposing choices.'],
  ['zero-sum', '⚔️', 'One Purse Between Two', 'In a zero-sum game…', "One player's gain equals another's loss", 'Both players must lose', 'Cooperation is impossible in every form', 'The total payoff is fixed; distribution changes but the sum does not.'],
  ['pareto', '◆', 'A Better Chamber', 'A Pareto improvement makes…', 'Someone better off and no one worse off', 'Everyone equally wealthy', 'The richest player poorer', 'Pareto improvement is deliberately silent about equality.'],
  ['stag-hunt', '🦌', 'Stag or Rat', 'The Stag Hunt mainly illustrates tension between…', 'Payoff-dominant cooperation and safer individual action', 'Pure chance and certainty', 'Past and future costs', 'The group prize is largest together, while the smaller solo prize is safer.'],
  ['chicken-game', '🛤️', 'Two Carts, One Track', 'In Chicken, the worst outcome occurs when…', 'Neither side yields', 'Both sides yield', 'Exactly one side yields', 'Mutual stubbornness creates the disastrous collision.'],
  ['ultimatum', '🤝', 'Split the Cache', 'Why are tiny offers often rejected in ultimatum games?', 'Fairness and punishment matter alongside money', 'Responders cannot count', 'Rejection creates more gold', 'People may pay a cost to punish an allocation they consider unfair.'],
  ['public-goods', '🏮', 'The Shared Lantern', 'A public good is typically…', 'Non-excludable and non-rival', 'Private and quickly consumed', 'Available only to its buyer', 'People can benefit without being excluded and without exhausting others’ benefit.'],
  ['backward-induction', '↩️', 'The Last Door First', 'Backward induction solves a finite sequential game by…', 'Reasoning backward from final decisions', 'Ignoring future choices', 'Selecting the first available move', 'Later rational responses determine what earlier moves are sensible.'],
  ['mixed-strategy', '🎭', 'Unpredictable Footwork', 'Why randomize in matching pennies?', 'To prevent an opponent exploiting a pattern', 'To make one face intrinsically stronger', 'To guarantee every round', 'The equilibrium mixture removes predictable weakness, not ordinary variance.'],
  ['condorcet', '🗳️', 'The Pairwise Champion', 'A Condorcet winner is an option that…', 'Beats every other option head-to-head', 'Has exactly half the votes', 'Is ranked last by no one', 'It is defined through pairwise majority contests.'],
  ['arrow', '🏹', "Arrow's Warning", 'What does Arrow’s theorem reveal about rank voting with three or more options?', 'No system satisfies every reasonable fairness condition', 'Every election must tie', 'Majority voting is always dictatorial', 'The listed fairness requirements cannot all coexist in a single rank-order system.'],
  ['anchoring', '⚓', 'The First Price Spoken', 'An irrelevant opening price pulls later estimates toward it. This is…', 'Anchoring', 'Regression', 'Randomization', 'Initial numbers can influence judgment even when they contain little information.'],
  ['availability', '🔥', 'The Vivid Collapse', 'After hearing one dramatic cave-in, you greatly overestimate all cave-in risk. This is…', 'The availability heuristic', 'The law of large numbers', 'Dominance', 'Memorable examples come to mind more easily than representative base rates.'],
  ['loss-aversion', '💔', 'The Pain of Ten Gold', 'Losing 10 gold often feels stronger than gaining 10 gold. This is…', 'Loss aversion', 'Risk neutrality', 'Independence', 'Reference-dependent preferences often weight losses more heavily than equal gains.'],
  ['confirmation', '🔍', 'Only Friendly Runes', 'Seeking only evidence that supports your map is…', 'Confirmation bias', 'Stratified sampling', 'Backward induction', 'Good testing actively searches for observations that could prove a belief wrong.'],
  ['base-rate', '📚', 'The Rare Mimic', 'A detector is impressive, but mimics are extremely rare. What must not be ignored?', 'The base rate', 'The largest payoff', 'The sample maximum', 'Posterior probability depends on prevalence as well as test accuracy.'],
  ['prosecutor', '⚖️', "The Prosecutor's Rune", 'A rare matching trace is presented as the chance the accused is innocent. The error?', 'Confusing P(evidence|innocent) with P(innocent|evidence)', 'Using too many witnesses', 'Calculating an average', 'Reversing conditional probabilities ignores priors and alternative sources.'],
  ['false-positive', '🚨', 'The Alarm That Cries Rat', 'Many alarms among thousands of safe rooms can outnumber true alarms when danger is rare. This emphasizes…', 'False positives and prevalence', 'Only sensitivity', 'Guaranteed guilt after an alarm', 'Even a modest false-positive rate can dominate a very rare true condition.'],
  ['expected-maximum', '🎲', 'Keep the Higher Die', 'Roll two fair dice and keep the higher. Is its expected value above or below 3.5?', 'Above 3.5', 'Exactly 3.5', 'Below 3.5', 'Taking a maximum preserves high rolls while replacing many low ones.'],
];

/* These are decisions, not questions. Both actions can be rational depending
   on the generated stakes and the player's current run. An optional field
   observation reveals part of the hidden situation before commitment. */
const DECISIONS = [
  ['mean-median', 'Set every delver’s ration from a ledger distorted by one enormous purse.', 'Use one equal ration for the whole crew', 'Simple and predictable, but shaped by the extreme purse.', 'Reserve more for the poorer half', 'Protect the typical delver while reducing the shared surplus.'],
  ['gambler-fallacy', 'A fair coin has shown tails five times. The keeper offers one more wager at freshly posted stakes.', 'Keep the original stake', 'Treat this flip as a new trial.', 'Double the stake after the streak', 'Risk more because the run of tails feels due to break.'],
  ['expected-die', 'A bone die will determine tonight’s pay, but the quartermaster will buy the uncertain contract from you now.', 'Sell the contract for the posted amount', 'Take certainty before the die is rolled.', 'Keep the die contract', 'Accept its full spread of possible payouts.'],
  ['conditional-coin', 'The keeper confirms that at least one of two hidden coins is heads, then offers to buy your claim on both being heads.', 'Sell the claim now', 'Take the guaranteed offer.', 'Keep the claim until both coins are shown', 'Trade certainty for the conditional chance.'],
  ['large-numbers', 'One familiar seam pays steadily; a new field can be sampled repeatedly before you commit the crew.', 'Mine the familiar seam', 'Take the known return without learning more.', 'Fund repeated samples of the new field', 'Accept early noise for a better long-run estimate.'],
  ['simpson', 'Two wards each report results for two different patient groups, while the combined ledger points the other way.', 'Choose one treatment for everyone', 'Follow the aggregate result and simplify supplies.', 'Assign treatment by patient group', 'Use the split evidence at the cost of scarce inventory.'],
  ['regression-mean', 'A scout with one spectacular run demands a permanent bonus before attempting the route again.', 'Pay for the apparent breakthrough', 'Lock in the scout while the result looks exceptional.', 'Offer a smaller trial contract', 'Wait to learn how much of the performance persists.'],
  ['survivorship', 'Only returning armor can be inspected before you spend the last reinforcement plates.', 'Patch the damage you can see', 'Improve the armor that survived and came home.', 'Reinforce the untouched fatal zones', 'Infer where missing suits may have been struck.'],
  ['correlation', 'Torch use and cave injuries rose together. You can fund brighter torches or reduce traffic through the shaft.', 'Buy brighter torches', 'Act on the visible association directly.', 'Limit crowded expeditions', 'Act on a possible common cause instead.'],
  ['p-value', 'A rune trial produced an unusual result under the old ward. Replacing it is costly and the evidence is suggestive, not final.', 'Replace the ward now', 'Act quickly on surprising evidence.', 'Run a larger replication first', 'Pay for stronger evidence before committing.'],
  ['confidence', 'A survey gives an interval for the next ore seam. A narrow expedition can exploit its center; a broad plan covers its uncertainty.', 'Plan for the center estimate', 'Concentrate resources for a higher payoff.', 'Plan for the full interval', 'Sacrifice upside for robustness.'],
  ['sampling-bias', 'Only angry delvers answered a safety survey, but repairs must begin tonight.', 'Repair what respondents named', 'Use available testimony immediately.', 'Pay to sample silent crews', 'Delay repairs to seek a representative picture.'],
  ['independence', 'Two tunnel alarms may share one failing wire. You can insure them as separate risks or replace the common circuit.', 'Insure each alarm separately', 'Treat their failures as unrelated.', 'Replace the shared circuit', 'Pay more if the risks move together.'],
  ['permutations', 'Three keyed seals must be tried in an order; every failed order consumes lamp oil.', 'Systematically enumerate orders', 'Spend time while avoiding repeated trials.', 'Try the most promising order first', 'Seek a quick win without full coverage.'],
  ['combinations', 'You may send two of four specialists into a chamber, and team chemistry matters more than marching order.', 'Choose the strongest individuals', 'Maximize visible skill ratings.', 'Choose the most complementary pair', 'Trade raw skill for a better combination.'],
  ['binomial', 'Three independent bolts each have the same chance to hold. You may reinforce one bolt or insure against exactly two holding.', 'Reinforce one bolt', 'Change one trial’s success chance.', 'Buy the two-success contract', 'Keep the trials unchanged and wager on the count.'],
  ['geometric', 'A lock opens on the first six, charging lamp oil for every attempt.', 'Pay a fixed locksmith fee', 'Cap the waiting cost.', 'Roll until the lock opens', 'Accept an unbounded wait for a chance to pay less.'],
  ['poisson', 'Bats arrive independently at a stable average rate. Cross now, or wait while each minute adds exposure and information.', 'Cross during the current lull', 'Act before another arrival.', 'Observe another interval', 'Improve the rate estimate while risking more arrivals.'],
  ['normal-rule', 'A bell-shaped map predicts most shafts near the center but rare rich seams in the tails.', 'Mine near the center', 'Favor the dense, ordinary region.', 'Prospect a distant tail', 'Accept rarity for a larger possible seam.'],
  ['central-limit', 'Many noisy scouts can each make a cheap estimate, or one master surveyor can make an expensive judgment.', 'Average many scout reports', 'Pool independent noise and tolerate mediocre individuals.', 'Hire the master surveyor', 'Buy one concentrated expert opinion.'],
  ['variance', 'Two routes have the same average return; one is tightly clustered and the other swings from ruin to treasure.', 'Take the narrow route', 'Prefer a predictable result.', 'Take the volatile route', 'Accept greater spread for its extreme upside.'],
  ['standard-deviation', 'A supplier quotes average delivery with a spread measured in the same days your camp can survive.', 'Stock for one usual deviation', 'Cover common delays cheaply.', 'Stock for an extreme delay', 'Pay heavily against a rare shortage.'],
  ['ticket-ev', 'A ticket’s posted payout is slightly below its price, but the jackpot would solve your immediate supply problem.', 'Keep your gold', 'Reject the unfavorable average return.', 'Buy the ticket', 'Accept a poor average for a transformative chance.'],
  ['risk-aversion', 'Choose between guaranteed supplies and a higher-average cache that may contain nothing.', 'Take the certain supplies', 'Protect the run’s current position.', 'Open the uncertain cache', 'Risk the floor for greater expected wealth.'],
  ['nash', 'Two rival crews have settled into routes neither wants to abandon alone, though a coordinated swap could help both.', 'Keep your current route', 'Avoid being the only crew to move.', 'Propose a simultaneous swap', 'Risk failed coordination for a better joint outcome.'],
  ['dominant-strategy', 'A merchant offers two sealed contracts while another buyer chooses independently.', 'Choose the contract robust to either rival move', 'Protect against every response.', 'Choose the contract with the largest cooperative upside', 'Depend on the rival selecting the compatible move.'],
  ['zero-sum', 'One purse must be divided after a contest, but you can spend gold sabotaging the rival before the split.', 'Spend on sabotage', 'Improve your share while shrinking the useful prize.', 'Preserve the full purse', 'Accept a fairer contest for a larger total.'],
  ['pareto', 'A tunnel reassignment can help one crew without hurting yours, but it gives them the more visible victory.', 'Approve the reassignment', 'Allow a gain that costs you nothing.', 'Block the change', 'Preserve relative standing despite no direct benefit.'],
  ['stag-hunt', 'A rich armored beast requires both hunters; a smaller rat can be caught alone before your partner commits.', 'Wait for the shared hunt', 'Seek the larger coordinated prize.', 'Take the rat immediately', 'Secure the smaller independent reward.'],
  ['chicken-game', 'Two ore carts race toward one narrow bridge and each driver can lock the brake or leave room to yield.', 'Leave room to yield', 'Avoid collision but risk losing priority.', 'Lock the brake visibly', 'Make a credible stand that could destroy both carts.'],
  ['ultimatum', 'A rival offers you a small share of a cache. Rejecting destroys the cache for both.', 'Accept the offered share', 'Keep the available gold despite the insult.', 'Reject the split', 'Pay to punish an allocation you consider unfair.'],
  ['public-goods', 'Every contributed flask brightens a shared lantern, including for crews that contribute nothing.', 'Add your flask', 'Increase the common light at personal cost.', 'Keep your flask', 'Preserve your supply and rely on others.'],
  ['backward-induction', 'A chain of doors ends with the final guard taking any unclaimed gold. Earlier guards propose splits in sequence.', 'Accept an early modest split', 'Bank value before later decisions erase it.', 'Reject and continue', 'Seek a better offer while the terminal threat approaches.'],
  ['mixed-strategy', 'The rat merchant has learned your last several choices in matching pennies.', 'Use a private randomizer', 'Give up pattern-based control to stay unpredictable.', 'Choose your favored face', 'Trust intuition despite being observed.'],
  ['condorcet', 'Three routes cycle in pairwise crew votes. You control whether to hold another comparison.', 'Use the current pairwise winner', 'Stop the agenda where it stands.', 'Demand a full transparent cycle', 'Expose instability at the cost of delay.'],
  ['arrow', 'No voting rule satisfies every crew’s fairness demand, and departure must happen before dawn.', 'Choose a simple published rule', 'Accept known imperfections consistently.', 'Let the captain decide', 'Trade collective fairness for decisive action.'],
  ['anchoring', 'A merchant blurts out an arbitrary opening price before asking what a damaged relic is worth to you.', 'Negotiate from the spoken price', 'Use the available number as the starting point.', 'Write a private valuation first', 'Pay time to separate value from the anchor.'],
  ['availability', 'A vivid cave-in dominates camp talk while quiet injury records point toward a different danger.', 'Guard against the memorable collapse', 'Respond to the event everyone can picture.', 'Follow the dull injury ledger', 'Trust frequency over vividness.'],
  ['loss-aversion', 'A ward can protect gold already owned or fund a gamble with an equal-sized possible gain.', 'Protect the current purse', 'Avoid a loss that will sting immediately.', 'Risk the purse for growth', 'Accept symmetric gain and loss chances.'],
  ['confirmation', 'Your map predicts the left tunnel. You can inspect a friendly clue or spend more to test the tunnel most likely to disprove it.', 'Inspect the supporting clue', 'Build confidence cheaply.', 'Test the strongest contradiction', 'Risk abandoning the map to learn more.'],
  ['base-rate', 'A sensitive mimic detector alarms in a district where mimics are rare. Quarantine is costly.', 'Quarantine immediately', 'Act on the alarming signal.', 'Check district prevalence first', 'Delay action to incorporate the base rate.'],
  ['prosecutor', 'A rare trace matches one suspect, but many delvers passed through the chamber.', 'Convict on the rare match', 'Treat the striking evidence as decisive.', 'Count alternative sources first', 'Risk letting the suspect go while updating the prior odds.'],
  ['false-positive', 'A broad alarm catches most threats but flags many safe rooms. Search teams are limited.', 'Search every alarm', 'Maximize sensitivity at high cost.', 'Raise the alarm threshold', 'Miss some threats to reduce false searches.'],
  ['expected-maximum', 'You may keep one die now or pay to roll a second and keep the higher result.', 'Keep the first die', 'Avoid the fee and preserve what is shown.', 'Buy the second roll', 'Pay for the option to replace a weak result.'],
];

const DILEMMAS = [
  ['signal-fire', '🔥', 'The Shared Signal Fire', 'Three parties need the beacon, but each hopes another pays for fuel.', 'Contribute fuel', 'Support the public good and make the signal reliable.', 'Wait for the others', 'Free-ride and gamble that enough fuel appears.', 'Public goods invite free-riding because contributors cannot easily exclude noncontributors.'],
  ['shared-rope', '🪢', 'The Common Rope', 'Every team may cut a little rope for itself; too many cuts ruin the crossing.', 'Take only the marked length', 'Preserve the shared resource.', 'Cut an extra coil', 'Gain more now and risk the crossing.', 'Individual extraction can collectively destroy a renewable commons.'],
  ['sealed-urn', '🏺', 'The Ambiguous Urn', 'One urn has known odds; the other hides its color mix.', 'Choose the known odds', 'Avoid uncompensated ambiguity.', 'Choose the hidden urn', 'Accept ambiguity for a larger possible cache.', 'People often distinguish measurable risk from uncertainty with unknown probabilities.'],
  ['bridge-commitment', '🌉', 'The One-Way Bridge', 'Two carts approach. A visible brake lock can make yielding impossible.', 'Signal and coordinate first', 'Avoid a destructive commitment race.', 'Lock the brake', 'Make a credible threat and hope the other yields.', 'Commitment can shift bargaining power while increasing the chance of catastrophe.'],
  ['map-auction', '🗺️', 'The Map Auction', 'Every bidder estimates the same unknown map value with noisy information.', 'Shade for estimation error', 'Account for winning being bad news about your estimate.', 'Bid your estimate aggressively', 'Treat your estimate as exact.', 'In common-value auctions, the winner is often the bidder with the most optimistic error.'],
  ['expedition-vote', '🗳️', 'The Expedition Vote', 'Three routes can produce a preference cycle: A beats B, B beats C, C beats A.', 'Agree on a voting rule first', 'Make the agenda transparent before voting.', 'Let the chair choose the order', 'Exploit agenda control for your route.', 'Pairwise majority preferences can cycle, giving agenda setters real power.'],
  ['wounded-rival', '🩹', 'The Wounded Rival', 'Helping a rival costs supplies now but may begin a repeated alliance.', 'Treat the wound', 'Invest in reciprocity and reputation.', 'Take the rival’s pack', 'Maximize the one-shot payoff.', 'Repeated interaction can reward cooperation that a single encounter would not.'],
  ['ration-pool', '🥖', 'The Ration Pool', 'Private hunger is visible only to each delver; the group must allocate a common store.', 'Report needs honestly', 'Use a rule the group can sustain.', 'Exaggerate your need', 'Claim more before others do.', 'Mechanisms fail when participants benefit from misreporting private information.'],
  ['cursed-coin', '🪙', 'The Cursed Coin', 'The coin offers small gains often and a devastating rare loss.', 'Price the tail risk', 'Judge the entire distribution.', 'Count the frequent wins', 'Let the high win rate guide you.', 'A strategy can win most rounds while carrying negative expected value or ruinous tail risk.'],
  ['oracle-information', '🔮', 'The Costly Oracle', 'An oracle sells a clue before you choose between two tunnels.', 'Value the clue by changed decisions', 'Pay only for information that can alter action.', 'Buy every clue', 'More information must always be valuable.', 'Information has instrumental value only when it can improve a choice enough to cover its cost.'],
  ['mine-insurance', '📜', 'Mine Insurance', 'Full insurance makes careless digging cheaper for the insured.', 'Keep a deductible', 'Preserve an incentive to avoid damage.', 'Cover every loss', 'Remove all personal consequence.', 'Insurance can create moral hazard when protection changes behavior.'],
  ['single-file', '🚶', 'The Narrow Stair', 'Everyone wants to go first, but pushing makes the entire queue slower.', 'Use an agreed order', 'Coordinate for higher total throughput.', 'Push to the front', 'Gain position if others remain orderly.', 'Congestion games can make individually tempting actions collectively inefficient.'],
  ['volunteer', '🛎️', "The Volunteer's Bell", 'Someone must ring the dangerous bell or everyone loses the route.', 'Volunteer deliberately', 'Pay the cost and secure the group benefit.', 'Wait in silence', 'Hope another delver accepts the cost.', 'Volunteer dilemmas combine a shared benefit with an incentive for each person to wait.'],
  ['centipede', '🐛', 'The Centipede Cache', 'Passing the cache grows it, but the next player may take everything.', 'Pass once under a trust pact', 'Use repetition or reputation to support growth.', 'Take immediately', 'Apply strict one-shot backward induction.', 'Finite backward induction predicts early taking, while human trust often sustains growth.'],
  ['trust-game', '🤲', 'The Multiplied Purse', 'Gold sent to a stranger triples; the stranger decides how much to return.', 'Send a measured stake', 'Test reciprocity without risking everything.', 'Send the whole purse', 'Seek the largest cooperative surplus.', 'Trust can create surplus, but exposure should reflect evidence about reciprocity.'],
  ['dictator-game', '👤', "The Dictator's Split", 'You alone decide how to divide a cache with a powerless stranger.', 'Offer a fair share', 'Value fairness and future reputation.', 'Keep everything', 'Take the maximum immediate payoff.', 'Dictator games reveal social preferences even without strategic retaliation.'],
  ['coordination-bells', '🔔', 'The Two Bells', 'Both teams benefit only if they ring the same bell without speaking.', 'Choose the marked bell', 'Use the obvious focal point.', 'Choose the hidden bell', 'Outthink the other team.', 'Salient focal points help people coordinate when communication is impossible.'],
  ['minority-game', '🕯️', 'The Cooler Tunnel', 'Everyone wants the less crowded tunnel, but the choice itself changes which is less crowded.', 'Randomize your route', 'Avoid a predictable crowding pattern.', 'Follow yesterday’s minority', 'Assume the last winner repeats.', 'Adaptive crowds can create oscillation; predictable rules defeat themselves.'],
  ['lemons', '🍋', 'The Used Lantern Market', 'Sellers know lantern quality; buyers cannot distinguish sound lamps from bad ones.', 'Offer inspection or warranty', 'Create a credible quality signal.', 'Sell without evidence', 'Ask buyers to trust the average.', 'Information asymmetry can drive good products from a market.'],
  ['moral-hazard', '🧨', 'Borrowed Blasting Powder', 'A lender absorbs losses while the borrower keeps most upside.', 'Share downside as well as upside', 'Align incentives before lending.', 'Fund the largest blast', 'Chase the maximum possible return.', 'Limited downside can encourage excessive risk-taking.'],
  ['adverse-selection', '🩺', 'The Healing Pool', 'Only the sickest delvers eagerly buy a plan priced for average health.', 'Price or pool with better information', 'Address who chooses to enter.', 'Raise one price for everyone', 'Assume buyers are representative.', 'Hidden types can make the participating group riskier than the full population.'],
  ['free-rider', '🧹', 'Clearing the Public Passage', 'All teams benefit from cleared rubble whether or not they help.', 'Join the work crew', 'Contribute to the shared benefit.', 'Slip past afterward', 'Keep your strength while others work.', 'Non-excludable benefits make free-riding individually tempting.'],
  ['credible-threat', '🐉', 'The Sleeping Dragon Threat', 'A guard threatens to wake the dragon after any trespass—even though doing so would destroy his post.', 'Question the threat', 'Ask whether carrying it out would be rational.', 'Pay the guard immediately', 'Treat every stated threat as binding.', 'A threat influences behavior only if it is credible when the decision point arrives.'],
  ['commitment-device', '🔒', 'The Locked Ration Box', 'Tomorrow’s hungry self will break today’s ration plan.', 'Set a timed lock', 'Commit in advance against predictable temptation.', 'Rely on tomorrow’s resolve', 'Keep every option open.', 'Commitment devices trade flexibility for protection from time-inconsistent preferences.'],
  ['common-knowledge', '👁️', 'The Blue-Eyed Delvers', 'Everyone sees the mark, but action begins only after its existence is publicly announced.', 'Make the fact public', 'Turn shared observation into common knowledge.', 'Whisper it privately', 'Tell each delver separately.', 'Coordination may require everyone to know that everyone knows, recursively.'],
  ['focal-point', '✳️', 'Meet Without a Map', 'Separated teams must independently choose one of many crypt gates to reunite.', 'Choose the uniquely decorated gate', 'Use salience as a coordination point.', 'Choose a random plain gate', 'Avoid being too obvious.', 'Schelling points coordinate expectations without explicit communication.'],
  ['information-cascade', '🐑', 'Footprints to the Left', 'Two earlier delvers went left; your private clue weakly favors right.', 'Weigh your clue and their information', 'Do not count copied choices as independent evidence.', 'Follow the footprints automatically', 'Assume every predecessor had a separate strong clue.', 'Information cascades form when people rationally imitate, hiding their private evidence.'],
  ['winner-curse', '👑', "The Winner's Relic", 'You won a common-value relic after every bidder made a noisy estimate. Payment is due, but inspection can still reveal whether to restore or resell it.', 'Commission an independent appraisal', 'Spend more before committing restoration supplies.', 'Trust your winning estimate', 'Act immediately and preserve the remaining upside.', 'Winning a common-value auction is evidence that your estimate may have been the most optimistic, but information and resale options determine what to do next.'],
  ['endowment', '🎒', 'The Trinket Already Yours', 'You demand more to sell a trinket than you would have paid to acquire it.', 'Revalue it without ownership', 'Use the same comparison in either direction.', 'Keep it because possession proves value', 'Treat ownership as new evidence.', 'The endowment effect makes ownership itself inflate perceived value.'],
  ['framing', '🖼️', 'Lives Saved or Lost', 'The same outcome sounds attractive as lives saved and frightening as lives lost.', 'Translate both frames to outcomes', 'Compare equivalent probabilities directly.', 'Choose the positive wording', 'Let presentation determine value.', 'Equivalent descriptions can produce different choices through framing effects.'],
  ['decoy', '🪤', 'The Inferior Pickaxe', 'A clearly worse third pickaxe makes one of two original choices look better.', 'Ignore dominated options', 'Compare the original tradeoff directly.', 'Follow the newly attractive choice', 'Let the decoy set the comparison.', 'An asymmetrically dominated decoy can shift preferences without adding real value.'],
  ['hyperbolic', '⌛', 'Gold Now or Later', 'You prefer 11 gold tomorrow over 10 today, but later prefer 10 immediately over 11 tomorrow.', 'Precommit to the patient choice', 'Protect the earlier plan from present bias.', 'Always take immediate gold', 'Let each future self decide again.', 'Hyperbolic discounting creates preference reversals as rewards become immediate.'],
  ['status-quo', '🪨', 'The Default Tunnel', 'The marked default route is chosen far more often despite equal alternatives.', 'Review every route explicitly', 'Separate evidence from the default.', 'Stay with the mark', 'Assume default means recommended.', 'Status quo bias makes inaction and defaults unusually influential.'],
  ['escalation', '🧱', 'One More Support Beam', 'A failing tunnel has consumed half the budget and requests still more.', 'Reassess future value from zero', 'Ignore unrecoverable spending.', 'Fund it to justify the past', 'Protect what has already been spent.', 'Escalation of commitment turns sunk costs into reasons for further investment.'],
  ['explore-exploit', '🗺️', 'Known Vein or New Shaft', 'A known vein pays steadily; unexplored shafts might be richer.', 'Reserve some effort for exploration', 'Balance learning with current reward.', 'Mine only the known vein', 'Maximize today’s predictable yield.', 'The explore–exploit dilemma values information that improves later choices.'],
  ['bandit', '🎰', 'Three Rusted Levers', 'Each lever has an unknown payout rate learned only by pulling it.', 'Test, then favor strong evidence', 'Update while preserving limited exploration.', 'Commit after one win', 'Treat the first result as decisive.', 'Multi-armed bandits require learning and earning at the same time.'],
  ['stopping-chests', '📦', 'The Row of Chests', 'You may open chests in order but cannot return after taking one.', 'Set a sample period', 'Use early chests to establish a threshold.', 'Take the first nonempty chest', 'Avoid ever passing a prize.', 'Optimal stopping sacrifices early options to learn what later quality means.'],
  ['secretary-torch', '🕯️', 'The Torchbearer Trial', 'Applicants arrive once in random order; only the best matters.', 'Observe about 37%, then take the next record', 'Use the classic stopping threshold.', 'Choose the final applicant', 'Collect maximum information first.', 'The 1/e rule balances sampling against the shrinking opportunity to choose.'],
  ['overgrazed-moss', '🌿', 'The Overgrazed Moss', 'Each camp gains from harvesting more glow-moss while regrowth is shared.', 'Set and enforce a quota', 'Align private harvest with renewal.', 'Harvest before others do', 'Race to capture the remaining stock.', 'Open access can produce a race that depletes a resource everyone values.'],
  ['bystander', '🚨', 'The Distant Cry', 'Many delvers hear a cry, so each assumes someone else will respond.', 'Name yourself as responder', 'Break diffusion of responsibility.', 'Wait for a better rescuer', 'Assume the crowd guarantees help.', 'Responsibility can diffuse as group size grows.'],
  ['hawk-dove', '🦅', 'Hawk and Dove at the Cache', 'Aggression wins against restraint but mutual aggression is ruinous.', 'Mix firmness with restraint', 'Avoid becoming predictably exploitable.', 'Always attack', 'Claim every uncontested cache.', 'Hawk–Dove equilibria balance the gain from aggression against collision costs.'],
  ['battle-sexes', '🎭', 'Forge or Archive', 'Two partners want to stay together but prefer different destinations.', 'Alternate or randomize fairly', 'Preserve coordination while sharing preference costs.', 'Go to your own favorite', 'Hope the other always yields.', 'Coordination has value even when players disagree over which equilibrium is best.'],
  ['network-effect', '📡', 'The Whispering Runes', 'A communication rune becomes more valuable as more delvers use the same kind.', 'Coordinate on a compatible standard', 'Capture the network benefit.', 'Choose an isolated superior rune', 'Optimize only standalone quality.', 'Network effects can make compatibility more valuable than individual product quality.'],
  ['principal-agent', '📋', 'The Absent Mine Owner', 'An owner pays a foreman whose effort is difficult to observe.', 'Reward measurable outcomes carefully', 'Align incentives while guarding against gaming.', 'Pay only a fixed wage', 'Assume effort cannot change.', 'Principal–agent problems arise when goals differ and actions are hidden.'],
];

const CONCEPT_NAMES = {
  'mean-median': 'Mean versus median', 'gambler-fallacy': "Gambler's fallacy", 'expected-die': 'Expected value',
  'conditional-coin': 'Conditional probability', 'large-numbers': 'Law of large numbers', simpson: "Simpson's paradox",
  'regression-mean': 'Regression toward the mean', survivorship: 'Survivorship bias', correlation: 'Correlation versus causation',
  'p-value': 'P-values and evidence', confidence: 'Confidence intervals', 'sampling-bias': 'Selection bias', independence: 'Statistical independence',
  permutations: 'Permutations', combinations: 'Combinations', binomial: 'Binomial probability', geometric: 'Geometric waiting time',
  poisson: 'Poisson arrivals', 'normal-rule': 'Normal distributions', 'central-limit': 'Central limit theorem', variance: 'Variance',
  'standard-deviation': 'Standard deviation', 'ticket-ev': 'Expected value versus utility', 'risk-aversion': 'Risk aversion', nash: 'Nash equilibrium',
  'dominant-strategy': 'Dominant strategies', 'zero-sum': 'Zero-sum incentives', pareto: 'Pareto improvements', 'stag-hunt': 'Stag Hunt coordination',
  'chicken-game': 'Game of Chicken', ultimatum: 'Ultimatum Game', 'public-goods': 'Public-goods games', 'backward-induction': 'Backward induction',
  'mixed-strategy': 'Mixed strategies', condorcet: 'Condorcet cycles', arrow: "Arrow's impossibility theorem", anchoring: 'Anchoring bias',
  availability: 'Availability heuristic', 'loss-aversion': 'Loss aversion', confirmation: 'Confirmation bias', 'base-rate': 'Base-rate neglect',
  prosecutor: "Prosecutor's fallacy", 'false-positive': 'False positives and prevalence', 'expected-maximum': 'Expected maximum and option value',
  'signal-fire': 'Public-goods free-riding', 'shared-rope': 'Tragedy of the commons', 'sealed-urn': 'Ambiguity aversion and the Ellsberg paradox',
  'bridge-commitment': 'Strategic commitment', 'map-auction': "Winner's curse", 'expedition-vote': 'Agenda control and preference cycles',
  'wounded-rival': 'Reciprocity in repeated games', 'ration-pool': 'Mechanism design with private information', 'cursed-coin': 'Tail risk',
  'oracle-information': 'Value of information', 'mine-insurance': 'Moral hazard', 'single-file': 'Congestion games', volunteer: "Volunteer's dilemma",
  centipede: 'Centipede Game', 'trust-game': 'Trust Game', 'dictator-game': 'Dictator Game', 'coordination-bells': 'Schelling focal points',
  'minority-game': 'Minority Game', lemons: 'Market for lemons', 'moral-hazard': 'Moral hazard', 'adverse-selection': 'Adverse selection',
  'free-rider': 'Free-rider problem', 'credible-threat': 'Credible threats', 'commitment-device': 'Commitment devices and present bias',
  'common-knowledge': 'Common knowledge', 'focal-point': 'Schelling points', 'information-cascade': 'Information cascades',
  'winner-curse': "Winner's curse", endowment: 'Endowment effect', framing: 'Framing effect', decoy: 'Decoy effect',
  hyperbolic: 'Hyperbolic discounting', 'status-quo': 'Status quo bias', escalation: 'Escalation of commitment',
  'explore-exploit': 'Explore–exploit tradeoff', bandit: 'Multi-armed bandit', 'stopping-chests': 'Optimal stopping',
  'secretary-torch': 'Secretary problem', 'overgrazed-moss': 'Tragedy of the commons', bystander: 'Bystander effect',
  'hawk-dove': 'Hawk–Dove Game', 'battle-sexes': 'Battle of the Sexes', 'network-effect': 'Network effects', 'principal-agent': 'Principal–agent problem',
};

/* Review-driven presentation revisions. These replace labels that state the
   analytical lesson with concrete actions the player can actually take. */
export const EVENT_ACTION_REVISIONS = {
  commons: ['Take one basket', 'Strip the mature bed'],
  auction: ['Submit the lower sealed bid', 'Submit the higher sealed bid'],
  survivorship: ['Plate the scarred panels', 'Plate the unscarred panels'],
  'dominant-strategy': ['Sign the iron contract', 'Sign the ivory contract'],
  anchoring: ['Make a counteroffer aloud', 'Write a sealed counteroffer'],
  confirmation: ['Follow the marked route', 'Open the sealed side passage'],
  'base-rate': ['Enter quarantine', 'Return to the district clinic'],
  prosecutor: ['Hand the suspect to the guard', 'Refuse the guard'],
  'false-positive': ['Search every alarmed room', 'Silence the outer alarms'],
  'oracle-information': ['Choose a tunnel now', 'Buy the oracle’s clue'],
  'adverse-selection': ['Raise every premium', 'Close enrollment'],
  'information-cascade': ['Take the left passage', 'Take the right passage'],
  endowment: ['Sell the trinket', 'Keep the trinket'],
  framing: ['Choose the first inscription', 'Choose the second inscription'],
  decoy: ['Buy the bronze pickaxe', 'Buy the iron pickaxe'],
  escalation: ['Seal the failing tunnel', 'Fund another support beam'],
  bandit: ['Pull a different lever', 'Pull the lever that paid once'],
  'stopping-chests': ['Open the next chest', 'Take the current chest'],
  'secretary-torch': ['Dismiss this applicant', 'Hire this applicant'],
  'hawk-dove': ['Approach with your weapon lowered', 'Charge the cache'],
  'battle-sexes': ['Go to the forge', 'Go to the archive'],
  'network-effect': ['Take the common rune', 'Take the solitary rune'],
  'principal-agent': ['Offer a share of the haul', 'Pay the posted wage'],
  'mean-median': ['Fill every bowl equally', 'Fill bowls by purse mark'],
  matching: ['Shake a coin beneath a cup', 'Place a coin by hand'],
  'large-numbers': ['Send the crew to the old seam', 'Send scouts into the new field'],
  simpson: ['Stock one tonic for both wards', 'Stock a different tonic in each ward'],
  'regression-mean': ['Sign a permanent contract', 'Sign a one-route contract'],
  'p-value': ['Break the old ward', 'Repeat the rune trial'],
  confidence: ['Pack the narrow expedition kit', 'Pack the broad expedition kit'],
  permutations: ['Turn the seals in ledger order', 'Try the scratched sequence first'],
  combinations: ['Send the two top-ranked delvers', 'Send the locksmith and medic'],
  'central-limit': ['Hire the scout company', 'Hire the master surveyor'],
  'normal-rule': ['Enter a central shaft', 'Enter a distant shaft'],
  variance: ['Enter the chalk-marked route', 'Enter the red-marked route'],
  'standard-deviation': ['Order the standard crate', 'Order the reserve crate'],
  'chicken-game': ['Keep the brake lever free', 'Lock the brake lever forward'],
  'mixed-strategy': ['Shake the coin in a cup', 'Place your favoured face'],
  condorcet: ['Post the current route', 'Hold three more route votes'],
  arrow: ['Post fixed tally rules', 'Hand the route seal to the captain'],
  availability: ['Reinforce the collapsed arch', 'Reinforce the injury stair'],
  'loss-aversion': ['Put the purse behind the ward', 'Stake the purse at the table'],
  'expected-maximum': ['Pocket the first die', 'Pay for the second die'],
  'sealed-urn': ['Draw from the glass urn', 'Draw from the sealed urn'],
  'bridge-commitment': ['Raise a signal lantern', 'Lock the brake lever'],
  'map-auction': ['Submit the lower map bid', 'Submit the higher map bid'],
  'expedition-vote': ['Post the voting order', 'Give the chair the route cards'],
  'ration-pool': ['Mark your true ration', 'Mark a larger ration'],
  'cursed-coin': ['Sell the coin', 'Keep flipping the coin'],
  'mine-insurance': ['Sign the partial policy', 'Sign the full policy'],
  'single-file': ['Take the numbered place', 'Step ahead of the queue'],
  volunteer: ['Ring the bell', 'Remain in the alcove'],
  centipede: ['Pass the cache onward', 'Take the cache'],
  'trust-game': ['Send five coins', 'Send the whole purse'],
  'dictator-game': ['Leave half the cache', 'Take the cache'],
  'coordination-bells': ['Ring the carved bell', 'Ring the plain bell'],
  'minority-game': ['Take the unmarked tunnel', 'Take yesterday’s quiet tunnel'],
  lemons: ['Open the lantern for inspection', 'Seal the lantern crate'],
  'moral-hazard': ['Split the blast contract', 'Fund the largest blast'],
  'free-rider': ['Lift rubble with the crew', 'Walk through the cleared gap'],
  'credible-threat': ['Cross the guard line', 'Pay the guard'],
  'commitment-device': ['Set the ration-box timer', 'Leave the latch open'],
  'common-knowledge': ['Strike the public gong', 'Whisper to each delver'],
  'focal-point': ['Enter the carved gate', 'Enter a plain gate'],
  'winner-curse': ['Pay for an appraisal', 'Pay the winning invoice'],
  hyperbolic: ['Lock eleven coins until tomorrow', 'Take ten coins now'],
  'status-quo': ['Remove the route marker', 'Follow the marked route'],
  'explore-exploit': ['Open an untested shaft', 'Return to the paying vein'],
  'overgrazed-moss': ['Post a harvest limit', 'Fill your sacks now'],
  bystander: ['Climb down to the caller', 'Remain with the crowd'],
};

export const EVENT_TEXT_REVISIONS = {
  corpse: 'A dead cartographer lies beneath a fallen survey pole. Annotated maps remain clenched in one hand; an empty burial alcove waits nearby.',
  matching: 'The merchant sets two tarnished coins on the table. He wins when the faces match and watches your hands while you choose.',
  sunkcost: 'Three days of digging have left a dry shaft, a tired crew, and one unopened wall. A modest known seam lies one camp away.',
  auction: 'A relic goes to sealed bids. Its worth to your expedition is clear; the rival bids are not.',
  ruin: 'The house offers another double-or-nothing round. Your current winnings sit within reach.',
  'dominant-strategy': 'Two sealed contracts lie beside a rival buyer’s covered choice. The iron seal and ivory seal promise different settlements.',
  'normal-rule': 'Most chalk marks cluster near the map’s central shafts. A few distant marks carry richer ore tallies.',
  variance: 'The chalk route has paid similar purses on every trip. The red route has returned crews empty-handed or laden with ore.',
  'standard-deviation': 'A supplier’s delivery ledger ranges from punctual carts to delays longer than the camp’s present stores.',
  'common-knowledge': 'Every delver can see the mark. No one moves while the chamber remains silent.',
  'focal-point': 'Separated crews must choose one reunion gate. One gate alone bears a crown of white antlers.',
  framing: 'Two inscriptions describe the same sealed bargain in different words.',
  decoy: 'Bronze and iron pickaxes sit beside a third tool that is heavier, duller, and nearly the same price as the iron one.',
  hyperbolic: 'Eleven coins can be locked until tomorrow. Ten coins are already loose on the table.',
  'status-quo': 'One route bears an old official marker. The surrounding passages show equally fresh tracks.',
  'information-cascade': 'Two earlier delvers went left. A faint scratch on your own map points right.',
  'network-effect': 'Most nearby crews carry the common communication rune. A solitary rune has a clearer tone but no matching receivers here.',
};
export const EVENT_TITLE_REVISIONS = {
  shrine: 'The Two-Door Shrine',
  'dominant-strategy': 'The Iron and Ivory Contracts',
  'p-value': 'The Small Rune Trial',
  'standard-deviation': 'The Delayed Cart',
  'risk-aversion': 'The Two Supply Offers',
  pareto: 'The Reassigned Passage',
  'expected-maximum': 'The Second Die',
  'winner-curse': 'The Winning Invoice',
  decoy: 'Three Pickaxes',
  'hawk-dove': 'Two Hands at the Cache',
};
function conceptName(id) {
  return CONCEPT_NAMES[id] || id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function makeDecision(entry, index) {
  const [id, text, actionA, descA, actionB, descB] = entry;
  const note = REFERENCE_NOTES.find(candidate => candidate[0] === id);
  const [, emoji, title, , , , , explanation] = note;
  const labels = EVENT_ACTION_REVISIONS[id] || [actionA, actionB];
  const revisedText = EVENT_TEXT_REVISIONS[id] || text;
  return [id, {
    emoji, title: EVENT_TITLE_REVISIONS[id] || title, text: revisedText, extra: true, behavioral: true,
    concept: conceptName(id), explanation, profile: index % 8,
    actions: [
      { key: 'a', label: labels[0], desc: '' },
      { key: 'b', label: labels[1], desc: '' },
    ],
    choices: [
      { key: 'a', label: labels[0], desc: '' },
      { key: 'b', label: labels[1], desc: '' },
      { key: 'observe', label: 'Gather one more observation', desc: 'Spend a little time or gold to reveal part of the hidden situation.' },
    ],
  }];
}

function makeDilemma(entry, index) {
  const [id, emoji, title, text, prudent, prudentDesc, risky, riskyDesc, explanation] = entry;
  const labels = EVENT_ACTION_REVISIONS[id] || [prudent, risky];
  const revisedText = EVENT_TEXT_REVISIONS[id] || text;
  return [id, {
    emoji, title: EVENT_TITLE_REVISIONS[id] || title, text: revisedText, extra: true, behavioral: true,
    concept: conceptName(id), explanation, profile: (index + 3) % 8,
    actions: [
      { key: 'a', label: labels[0], desc: '' },
      { key: 'b', label: labels[1], desc: '' },
    ],
    choices: [
      { key: 'a', label: labels[0], desc: '' },
      { key: 'b', label: labels[1], desc: '' },
      { key: 'observe', label: 'Look for another signal', desc: 'Pay for information before committing.' },
    ],
  }];
}

export const EXTRA_EVENT_CATALOG = Object.fromEntries([
  ...DECISIONS.map(makeDecision),
  ...DILEMMAS.map(makeDilemma),
]);

function coreSpec(id, emoji, title, concept, text, explanation, profile, a, b) {
  const labels = EVENT_ACTION_REVISIONS[id] || [a[0], b[0]];
  return [id, {
    emoji, title: EVENT_TITLE_REVISIONS[id] || title, concept, text: EVENT_TEXT_REVISIONS[id] || text, explanation, profile, extra: true, behavioral: true,
    actions: [{ key: 'a', label: labels[0], desc: '' }, { key: 'b', label: labels[1], desc: '' }],
    choices: [
      { key: 'a', label: labels[0], desc: '' }, { key: 'b', label: labels[1], desc: '' },
      { key: 'observe', label: 'Gather one more observation', desc: 'Pay for information before committing.' },
    ],
  }];
}

export const CORE_BEHAVIORAL_EVENTS = Object.fromEntries([
  coreSpec('shrine', '🚪', 'The 50/50 Shrine', 'Risk, certainty, and the certainty effect', 'A scorched shrine offers a modest sealed salvage payment or one live door whose outcome was fixed before you arrived.', 'People often overweight certainty relative to a probabilistic prospect. That preference can still be rational when survival resources have nonlinear value.', 0, ['Sell the claim unopened', 'Take a smaller guaranteed settlement.'], ['Open the live door', 'Keep exposure to both the prize and the blast.']),
  coreSpec('corpse', '🪦', "The Cartographer's Corpse", 'Endowment, reciprocity, and moral preferences', 'A dead cartographer grips valuable charts. Taking them helps this run; stopping to bury him protects no one who can repay you.', 'Behavioral choices often include fairness, identity, and reciprocity even when material incentives predict pure appropriation.', 3, ['Take the annotated maps', 'Use what the dead delver can no longer use.'], ['Bury him and mark the grave', 'Spend time and supplies on an unrewarded norm.']),
  coreSpec('monty', '🐐', "The Rat's Three Doors", 'Conditional probability and the value of a claim', 'After your first door is chosen, the rat reveals a goat elsewhere. He offers cash for your current claim before you decide whether to exchange it.', 'The host’s informed reveal changes the value of the remaining closed door. Selling certainty can nevertheless be attractive when current resources matter more than expected value.', 7, ['Sell the original claim', 'Lock in the rat’s guaranteed offer.'], ['Exchange for the remaining door', 'Keep the larger conditional chance and accept its variance.']),
  coreSpec('prisoners', '⛓️', "The Prisoners' Bargain", 'Prisoner’s Dilemma and repeated reputation', 'You and another delver independently choose whether to share a cache. A scratched ledger shows how this stranger treated the previous crew.', 'One-shot incentives can favor defection while repetition, reputation, and uncertain opponent types can sustain cooperation.', 6, ['Offer cooperation', 'Expose yourself to betrayal while creating joint surplus.'], ['Seize your share first', 'Protect against exploitation while reducing mutual value.']),
  coreSpec('birthday', '🎂', 'The Birthday Crypt', 'Collision probability and social risk', 'A crowded memorial shares a jackpot if any two birth-runes match, but every attendee also consumes scarce provisions.', 'Pairwise opportunities grow much faster than the number of people. The practical choice still balances collision probability against participation cost.', 4, ['Join the crowded memorial', 'Pay provisions to share the collision wager.'], ['Host a smaller private vigil', 'Keep costs predictable and forgo the crowd jackpot.']),
  coreSpec('bayes', '🧪', "The Alchemist's Test", 'Base-rate updating and false positives', 'A sensitive Rot test marks you positive in a district where infection is rare. Immediate quarantine costs supplies; confirmation risks delay.', 'Posterior risk depends on prevalence, sensitivity, and false-positive rates. Acting early versus buying confirmation remains a genuine cost-of-information choice.', 1, ['Quarantine immediately', 'Pay the precautionary cost before confirmation.'], ['Seek a second independent test', 'Risk delay to reduce uncertainty.']),
  coreSpec('secretary', '📜', 'The Hiring Ledger', 'Optimal stopping', 'A capable torchbearer stands before you now. More applicants remain, but anyone rejected is gone permanently.', 'Stopping rules trade early options for information and later information for disappearing opportunities; the best threshold depends on stakes and horizon.', 5, ['Hire the current candidate', 'Secure known quality before the option disappears.'], ['Continue interviewing', 'Buy more comparison at the risk of losing this candidate.']),
  coreSpec('commons', '🍄', 'The Common Mushroom Bed', 'The tragedy of the commons', 'A shared mushroom bed can feed many future crews or be stripped for one expedition tonight.', 'Open access separates private benefit from shared depletion. Restraint, enforcement, and expectations about others all change the strategic choice.', 3, ['Take a sustainable share', 'Leave enough for regrowth and later crews.'], ['Strip the mature bed', 'Capture its current value before someone else does.']),
  coreSpec('matching', '🪙', 'Matching Pennies', 'Mixed strategies and exploitability', 'The merchant wins on matching faces and studies every habit you show. You may use a noisy private randomizer or trust a deliberate bluff.', 'No pure choice is safe in matching pennies. Randomization prevents exploitation, while a costly or imperfect randomizer can create a real tradeoff.', 7, ['Use the private randomizer', 'Sacrifice control to hide your pattern.'], ['Choose a deliberate bluff', 'Try to exploit what the merchant expects.']),
  coreSpec('sunkcost', '🕳️', 'The Bottomless Dig', 'Sunk cost and escalation of commitment', 'Three days of work are unrecoverable. One more shift has uncertain value, while leaving frees the crew for a modest known seam.', 'Past expenditure should not change future value, but new evidence, switching costs, and asymmetric upside can still make continuing rational.', 2, ['Move to the known seam', 'Abandon the old shaft and secure a modest return.'], ['Fund one final shift', 'Accept another cost for the remaining upside.']),
  coreSpec('auction', '🔨', 'The Sealed-Bid Auction', 'Private value, information, and bid shading', 'You know what a relic is worth to this run but not the rival bids. A capped bid protects the purse; a full-value bid wins more often.', 'In a second-price private-value auction truthful bidding is strategically robust, while liquidity constraints and uncertainty about value can change practical utility.', 5, ['Submit a conservative capped bid', 'Preserve gold and accept losing profitable purchases.'], ['Bid your full private value', 'Maximize winning chances without bidding above your value.']),
  coreSpec('ruin', '🎲', "The Gambler's Ruin", 'Repeated risk and absorbing ruin', 'The house offers another fair double-or-nothing round and can outlast any finite purse.', 'A fair individual wager can still lead a finite player toward eventual ruin when repeated without a stopping rule.', 7, ['Bank the current purse', 'End the sequence with a certain result.'], ['Play another round', 'Keep the upside while remaining exposed to ruin.']),
]);

function whole(value) { return Math.max(1, Math.round(value)); }
function signedGold(amount) { return amount >= 0 ? `gain ${amount} gold` : `pay ${Math.abs(amount)} gold`; }

export function createBehavioralEventState(event, context, rolls, gadgetKey = null, curseKey = 'claustrophobia', curseName = 'Claustrophobia') {
  const depth = Math.max(0, context.stratum || 0);
  const scale = 1 + depth * .22;
  const lowGold = whole((18 + rolls[0] * 12) * scale);
  const midGold = whole((34 + rolls[1] * 18) * scale);
  const highGold = whole((65 + rolls[2] * 30) * scale);
  const damage = whole((7 + rolls[3] * 7) * (1 + depth * .16));
  const heal = whole(Math.max(5, context.maxHp * (.12 + rolls[0] * .08)));
  const chance = Math.round((.36 + rolls[1] * .28) * 100) / 100;
  const infoCost = Math.min(Math.max(0, context.gold || 0), 4 + depth * 2);
  const infoDamage = infoCost > 0 ? 0 : 2 + depth;
  const investCost = Math.min(Math.max(0, context.gold || 0), whole(14 * scale));
  return {
    version: 1, stage: 'choice', observed: false, history: [], profile: event.profile || 0,
    hiddenRoll: rolls[4], secondRoll: rolls[5], lowGold, midGold, highGold, damage, heal, chance,
    infoCost, infoDamage, investCost, gadgetKey, curseKey, curseName,
  };
}

function profileOptions(state) {
  const pct = Math.round(state.chance * 100);
  const known = state.observed;
  const branch = (win, lose) => known
    ? (state.hiddenRoll < state.chance ? `Observation indicates: ${win}.` : `Observation indicates: ${lose}.`)
    : `${pct}%: ${win}. Otherwise: ${lose}.`;
  const profiles = [
    [
      { effect: { gold: state.lowGold }, stakes: `Certain: gain ${state.lowGold} gold.` },
      { effect: state.hiddenRoll < state.chance ? { gold: state.highGold } : { damage: state.damage }, stakes: branch(`gain ${state.highGold} gold`, `take ${state.damage} damage`) },
    ],
    [
      { effect: { heal: state.heal }, stakes: `Recover up to ${state.heal} HP; excess healing is lost.` },
      { effect: { gold: state.midGold, damage: Math.ceil(state.damage / 2) }, stakes: `Gain ${state.midGold} gold and take ${Math.ceil(state.damage / 2)} damage.` },
    ],
    [
      { effect: { gold: -state.investCost, maxHp: 2, heal: 2 }, stakes: `${signedGold(-state.investCost)}; gain 2 max HP and heal 2.` },
      { effect: { gold: state.midGold }, stakes: `Gain ${state.midGold} gold now; no lasting improvement.` },
    ],
    [
      { effect: { gold: state.lowGold, heal: Math.ceil(state.heal / 2) }, stakes: `Gain ${state.lowGold} gold and recover up to ${Math.ceil(state.heal / 2)} HP.` },
      { effect: { gold: state.highGold, curse: state.curseKey || 'claustrophobia' }, stakes: `Gain ${state.highGold} gold; ${state.curseName || 'Claustrophobia'} enters your deck.` },
    ],
    [
      { effect: { gold: state.midGold }, stakes: `Certain: gain ${state.midGold} gold.` },
      { effect: state.hiddenRoll < state.chance ? { maxHp: 3, heal: 3 } : { damage: state.damage }, stakes: branch('gain 3 max HP', `take ${state.damage} damage`) },
    ],
    [
      { effect: { gold: state.midGold }, stakes: `Take ${state.midGold} gold for the current run.` },
      { effect: { gold: -state.investCost, upgrade: true }, stakes: `${signedGold(-state.investCost)} and upgrade one random eligible card.` },
    ],
    [
      { effect: { heal: state.heal, gold: Math.ceil(state.lowGold / 2) }, stakes: `Recover up to ${state.heal} HP and gain ${Math.ceil(state.lowGold / 2)} gold.` },
      { effect: state.hiddenRoll < state.chance ? { gadget: state.gadgetKey } : { damage: state.damage, gold: Math.ceil(state.midGold / 2) }, stakes: branch('gain a gadget', `take ${state.damage} damage but gain ${Math.ceil(state.midGold / 2)} gold`) },
    ],
    [
      { effect: state.hiddenRoll < .72 ? { gold: state.midGold } : { damage: Math.ceil(state.damage / 2) }, stakes: known ? (state.hiddenRoll < .72 ? `Observation indicates a ${state.midGold}-gold gain.` : `Observation indicates ${Math.ceil(state.damage / 2)} damage.`) : `72%: gain ${state.midGold} gold; otherwise take ${Math.ceil(state.damage / 2)} damage.` },
      { effect: state.secondRoll < .34 ? { gold: state.highGold } : { damage: state.damage }, stakes: known ? (state.secondRoll < .34 ? `Observation indicates a ${state.highGold}-gold gain.` : `Observation indicates ${state.damage} damage.`) : `34%: gain ${state.highGold} gold; otherwise take ${state.damage} damage.` },
    ],
  ];
  return profiles[state.profile % profiles.length];
}

export function behavioralEventView(event, state) {
  const options = profileOptions(state);
  const canObserve = [0, 4, 6, 7].includes(state.profile % 8);
  const observationCost = state.infoCost
    ? `Spend ${state.infoCost} gold to reveal which uncertain branch is waiting.`
    : `No gold remains: lose ${state.infoDamage} HP to investigate personally.`;
  const choices = event.actions.map((action, index) => ({
    key: action.key, label: action.label,
    desc: state.observed ? options[index].stakes : '',
  }));
  if (canObserve && !state.observed) choices.push({ key: 'observe', label: 'Gather one more observation', desc: observationCost });
  return {
    text: state.observed ? `${event.text} Fresh scratches inside the mechanism expose what each passage will release.` : event.text,
    choices,
    stageLabel: state.observed ? 'Mechanism inspected' : 'Decision',
  };
}

export function resolveBehavioralEvent(event, state, key) {
  if (state.stage === 'resolved') return null;
  if (key === 'observe' && !state.observed && [0, 4, 6, 7].includes(state.profile % 8)) {
    state.observed = true;
    state.stage = 'informed-choice';
    state.history.push('observe');
    return {
      done: false,
      effect: state.infoCost ? { gold: -state.infoCost } : { damage: state.infoDamage },
      note: '',
    };
  }
  const index = event.actions.findIndex(action => action.key === key);
  if (index < 0) return null;
  const option = profileOptions(state)[index];
  state.history.push(key);
  state.stage = 'resolved';
  return {
    done: true, effect: option.effect, stakes: option.stakes, action: event.actions[index],
    title: event.title,
  };
}
