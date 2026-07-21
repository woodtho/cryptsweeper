# CryptSweeper presentation review

Audiovisual feedback, music, animation, and settings audit. Everything below was
verified against the code on 2026-07-20 (`src/engine/sfx.js`, `music.js`,
`engine.js`, `src/ui/*`, `src/styles.css`); file:line references point at the
trigger sites. Items marked **verify** could not be confirmed from static
reading and are in the test plan.

---

## 1. Presentation inventory

### 1.1 Sound effects — `src/engine/sfx.js`

Fully synthesized WebAudio (no assets), lazy AudioContext inside gesture stacks,
master gain 0.4, per-name 60 ms cooldown (`lastPlayed`) de-stacks burst calls.
Mute persisted as `cs_muted`. All are short (≤0.5 s except jingles), non-blocking,
freely overlapping across names.

| Name | Trigger (engine.js) | Character | Essential? | Repetition risk |
|---|---|---|---|---|
| `dig` | safe reveal, chain < 4 (592) | soft thud + noise, 70 ms | essential | low — quiet, short |
| `cascade` | chain ≥ 4 (592) | rising 4-note arpeggio | essential | low |
| `flag` | flag toggle (1542), auto-verify (802) | square chirp 660→990 | essential | **medium — brightest frequent sound** |
| `scan` | scan resolves (731) | double sonar ping | essential | low |
| `entomb` | tile entombed (761) | low slam | essential | low |
| `boom` | mine detonates (666, 702) | noise sweep + 110→38 Hz, 0.5 s | essential | low (rare, deserved) |
| `chord` | deduction payoff (783) | 4-note triad | reward | low |
| `boardattack` | enemy lays mines / fog / scramble / misc (956, 970, 985, 1005, 1054) | dual sawtooth growl | essential | medium — can fire several times in one enemy turn |
| `draw` | cards drawn (1121) **and cutscene beat advance** (Cutscene.jsx:156) | highpass tick | essential | low |
| `play` | card played (1486) | tick + rising triangle | essential | low |
| `hit` | enemy damaged (1197) | square knock + noise | essential | low |
| `death` | enemy dies (1208) | sawtooth fall | essential | low |
| `hurt` | player damaged (1132) | sawtooth 150→80 | essential | low |
| `block` | gain block (1066, 1138) | short triangle | essential | low |
| `plating` | gain plating (1067) | two square taps | essential | low |
| `fullclear` | board fully cleared (831) | 5-note fanfare | reward | low |
| `coin` | gold gain/spend (1579) | two-tone chime | essential | low |
| `turn` | end turn (1372), run start (323) | filtered noise whoosh | essential | low |
| `defeat` | run lost (1156) | descending 4 notes | essential | n/a |
| `victory` | run won (1665) | ascending 5 notes | essential | n/a |

**No sound exists for:** healing, invalid/unaffordable action, card
upgrade/removal/transform, reward or shop selection apart from `coin`, gadget
use, camp actions, unlocks, menu/UI navigation, low-health threshold, puzzle
interactions, event outcomes.

### 1.2 Music — `src/engine/music.js`

One generative system, own AudioContext (suspends with `visibilitychange`,
separate from sfx). Layers: 3-oscillator drone with breathing LFO, looped wind
noise with its own LFO, echo-delay plucks random-walking a mood scale, random
cave drips, distant bell, heartbeat pulse (combat/boss only). Master ramps in
over 4 s; gesture-armed. Off state persisted (`cs_music_off`).

Eight moods (`title, delve, camp, shop, combat, boss, defeat, victory`), chosen
purely from `ui.screen` in App.jsx:84-94; boss detected via `run.combat.kind`.
Stratum transposes delve/combat/boss down a semitone per depth. Mood changes
glide via `setTargetAtTime` (~1–2 s) — no hard cuts.

- Not screen-mapped: events, rewards, puzzles, cutscenes fall into `delve`
  (or keep the previous mood during cutscenes).
- Music reads **no hidden state** — no information leak. It also reads no
  *public* state (low HP, near-clear), so tension never escalates within a fight.
- No stingers; `defeat`/`victory` moods overlap with the sfx jingles.

### 1.3 Animations — `src/styles.css` (26 keyframes) + component logic

| Animation | Where / trigger | Duration | Blocks input | Role |
|---|---|---|---|---|
| `screenin` | every screen mount | .32 s | no | transition |
| `modalin` | modals | .18–.22 s | no | transition |
| `mapsweep` + `nodedrop` | map entrance, staggered per row (75 ms) | rows × 75 ms | no | decorative+orienting |
| `beckon` | reachable map node | loop | no | guidance |
| `tilepop` | tile reveal | .16 s | no | essential |
| `craterflash` | mine detonation tile | .45 s | no | essential |
| `crumble` (screen shake) | `ui.shakeSeq` bump: boom (667), fullclear (832), scramble (1055), player hurt (1133); App.jsx re-triggers class, 400 ms timeout | .38 s | no | impact |
| `primedpulse` | primed tile | 1 s ∞ | no | **essential warning** |
| `telegraphpulse` + `teledrop` | incoming-mine column | 1.1–1.4 s ∞ | no | **essential warning** |
| `targetpulse` | targetable tiles | 1.2 s ∞ | no | essential |
| `willhitpulse` | enemies a hovered/targeting card will hit | 1 s ∞ | no | guidance |
| `shimmer` | Miscounter's lied number | 1.6 s ∞ | no | essential (hue-rotate + brightness) |
| `dealin` | new hand cards, 60 ms stagger | .34 s | no | feedback |
| `ghostplay` / `ghostdiscard` | departed hand cards fly out (CombatScreen ghosts, 650 ms cleanup) | .5 / .45 s | no | feedback |
| `hitflash` + `enemyjolt` | enemy damaged | .35 s | no | essential |
| `dmgrise` | floating damage/notes, max 12 queued, 3 x-offsets | .95 s | no | essential |
| `fadeout` | toast lifetime | 2.6 s | no | essential |
| `ember`, `cutscene-drift`, `mistdrift`, `markglow`, `cutscene-caret` | title/cutscene ambience | 3.4–26 s ∞ | no | decorative |

Ghost heuristic (CombatScreen.jsx:116): `removed.length > 2 ⇒ discard, else
played` — a 2-card end-of-turn discard animates as two cards "played" toward
the board; a card that discards 3+ as part of its effect animates as end-turn
discard.

**Nothing blocks input.** Cutscenes are tap-to-advance with skip; typewriter
text collapses to full line on first tap.

### 1.4 Other feedback systems

- **Toasts** (`engine.js:240`, Toasts.jsx): text, `bad` variant (red edge +
  color), 2.6 s CSS fade. Also mirrored into the combat **log** (persistent,
  scrollable, icon-decorated) — every audio cue has a text trail.
- **Damage floats** (`engine.js:173`): capped at 12 live, spread over 3 columns.
- **Tooltips**: `title` attributes everywhere on tiles (no touch equivalent;
  touch users get the tap-to-focus enemy popover, but **tile** titles are
  mouse-only).
- **Haptics: none.** No `@capacitor/haptics`; Android builds get no vibration.

### 1.5 Settings today

Title settings panel (screens.jsx:163-176): Sound effects, Music, Reduce
motion, High contrast, Large tiles, Large text, Compact cards, Left-handed,
Consistent emoji (bundled Noto), plus full icon-set pickers (map / enemy /
interface, mix & match, custom enemy faces). In-game menu (457-464): same
minus Large tiles and Left-handed. All persist to localStorage, apply
immediately, global scope.

Reduce-motion: user class forces `animation-duration:.001ms; iteration:1;
delay:0` (delay reset is deliberate so staggered reveals don't hide elements);
OS `prefers-reduced-motion` kills animation entirely. Both leave static
outlines/icons behind for primed/telegraph/target warnings.

---

## 2. Coverage matrix

✓ good · ◐ partial · ✗ missing · — n/a. Columns: Visual, Audio, Music,
Interface, Accessibility, Settings, Variation.

| Situation | V | A | M | UI | Acc | Set | Var |
|---|---|---|---|---|---|---|---|
| **General flow** |
| Start new run | ◐ screenin only | ✓ `turn` | ✓ delve | ✓ | ✓ | — | ✗ |
| Enter combat/board | ✓ map→combat | ✗ | ✓ combat mood | ✓ | ✓ | — | ✗ |
| Begin/end turn | ◐ no begin cue | ✓ `turn` | ✓ heartbeat | ✓ | ✓ | — | ✗ |
| Opening hand | ✓ dealin stagger | ✓ `draw` | ✓ | ✓ | ✓ | — | ◐ stagger only |
| Draw / discard / exhaust | ◐ ghosts misclassify ≤2 discards | ◐ draw only | — | ✓ piles | ✓ | — | ✗ |
| Add/remove/upgrade/transform card | ✗ | ✗ | — | ◐ text only | ◐ | — | ✗ |
| Shuffle | ✗ | ✗ | — | ◐ pile counts | ◐ | — | ✗ |
| Menus open/close | ✓ modalin | ✗ | ✓ (mood holds) | ✓ | ✓ | — | — |
| Pause/resume, focus loss | — | ✓ ctx suspend | ✓ suspend | ✓ | ✓ | ✗ no "mute unfocused" (is implicit) | — |
| Save/load | ✗ | ✗ | — | ✓ buttons/toasts | ✓ | — | — |
| Win / lose run | ✓ screens + cutscene | ✓ jingles | ✓ moods | ✓ | ✓ | — | ✗ same every time |
| Unlocks / progression | ◐ list screens | ✗ | ✗ | ✓ | ✓ | — | ✗ |
| **Cards** |
| Hover/focus card | ◐ (verify hover CSS) + willhit preview on enemies | ✗ | — | ✓ | ◐ | — | — |
| Select / targeting | ✓ selected + hint bar + targetpulse | ✗ | — | ✓ cancel link | ✓ | — | — |
| Play valid card | ✓ ghostplay | ✓ `play` | — | ✓ | ✓ | — | ✗ |
| Play invalid/unaffordable | ◐ dimmed card | ✗ (**verify** toast) | — | ◐ | ◐ | — | — |
| Cost paid / refund | ◐ energy number | ✗ | — | ✓ | ✓ | — | — |
| Multi-target / sequence | ◐ floats + log | ◐ per-effect sfx | — | ✓ log | ✓ | — | — |
| Conditional fires/fails | ◐ log only | ✗ | — | ◐ | ◐ | — | — |
| Exceptional result | ✗ nothing special | ✗ | ✗ | — | — | — | ✗ |
| Curse/status enters deck | ◐ toast | ✗ | — | ✓ | ✓ | — | ✗ |
| Rare card appears | ◐ rarity frame color | ✗ | — | ✓ | ◐ color-led | — | ✗ |
| **Board** |
| Tile hover | **verify** | — | — | ✓ cursor | ◐ | — | — |
| Safe reveal / number | ✓ tilepop | ✓ dig | — | ✓ | ✓ | — | ✗ single sound |
| Chain reveal | ✓ pops | ✓ cascade | — | ✓ | ✓ | — | ◐ 2 tiers |
| Flag / unflag | ✓ icon | ✓ same both ways | — | ✓ | ✓ | — | ✗ |
| Verified flag | ◐ color class + tooltip | ✓ flag+chord | — | ✓ | ◐ **color-only vs normal flag** | — | — |
| Mine triggered | ✓ crater + shake | ✓ boom | — | ✓ log | ✓ shake respects RM | — | ✗ |
| Mine prevented/moved/defused | ◐ toasts | ◐ boardattack for enemy moves; nothing for player saves | — | ✓ | ✓ | — | ✗ |
| Deduction confirmed | ✓ | ✓ chord | — | ✓ | ✓ | — | ✗ |
| Full clear | ✓ shake | ✓ fanfare | — | ✓ | ✓ | — | ✗ |
| Near-complete board | ✗ (safe-left counter only) | ✗ | ✗ | ✓ counter | ✓ | — | — |
| Contradictory board (Miscounter lie) | ✓ shimmer | ✗ | — | ✓ | ◐ shimmer is color/brightness | — | — |
| Rapid reveals / huge chains | ✓ | ✓ 60 ms de-stack | — | ✓ | ✓ | — | ◐ |
| Off-screen effects | ◐ toasts + log; column telegraph has ▼ edge marker | ✓ | — | ✓ | ✓ | — | — |
| **Resources / damage** |
| Gold gain/spend | ✓ number | ✓ coin | — | ✓ | ✓ | — | ✗ |
| Can't afford | ◐ disabled styling | ✗ | — | ◐ | ◐ | — | — |
| Damage taken | ✓ shake + floats | ✓ hurt | — | ✓ | ✓ | — | ✗ |
| Block/reduce | ✓ floats | ✓ block/plating | — | ✓ | ✓ | — | ✗ |
| Healing | ◐ number only | ✗ | — | ✓ | ◐ | — | ✗ |
| Low / critical health | ✗ | ✗ | ✗ | ◐ number | ✗ | — | — |
| Rewards / shop / camp | ✓ screens | ◐ coin only | ✓ shop/camp moods | ✓ | ✓ | — | ✗ |
| **Edge cases** |
| Many effects at once | ✓ float cap 12, sfx de-stack | ✓ | ✓ | ✓ | ✓ | — | — |
| Rapid clicking | ✓ nothing blocks | ✓ cooldown | — | ✓ | ✓ | — | — |
| Reduced motion | ✓ two mechanisms | — | — | ✓ | ✓ | ✓ | — |
| Muted audio | ✓ all cues have text/visual twin | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Focus loss / resume | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | — |
| Low-end hardware | ✓ CSS-only, no particles engine | ✓ synth | ✓ | ✓ | ✓ | ✗ no quality dial (likely unneeded) | — |
| Localization | — English-only, no setting | — | — | — | — | ✗ | — |

---

## 3–4. Clarity, feel, and animation-design findings

**What already works well**
- Latency: `tilepop` .16 s, `modalin` .18 s, sfx fire synchronously in the
  input stack — the game feels immediate. Nothing blocks input, ever.
- Hierarchy exists and is mostly right: routine (dig/tick) < reward
  (chord/cascade) < event (boom + shake + crater) < run-level (jingles + moods).
- Warnings are the best-produced feedback in the game (primed, telegraph with
  off-screen ▼ marker, willhit preview on hover — genuinely good deduction UX).
- The float/log/toast triple means muted or reduced-motion players lose polish,
  not information.

**Defects (ordered by severity)**

1. **No invalid-action channel.** Unaffordable cards are dimmed, but clicking
   one produces no sound and (verify) possibly no toast. A soft "dud" buzz +
   card head-shake (reuse `enemyjolt` mirrored, 3 px amplitude) is the single
   highest-value addition in this review.
2. **Low/critical health is silent.** HP is public info; nothing changes at
   3 HP. Recommended: persistent subtle treatment on the health stat (reuse
   `primedpulse` palette), heartbeat pulse rate +20% via a music `danger` flag —
   no new composition needed.
3. **Ghost misclassification** (CombatScreen.jsx:116): pass the actual cause
   (played vs discarded) from the engine instead of inferring from count. The
   engine knows; the UI guesses.
4. **Healing has no sfx** while its mirror (hurt) does — asymmetric feedback
   for the same stat. One inverted-contour tone (reuse `hurt` recipe reversed,
   150→290 triangle) closes it.
5. **Verified flag vs annotation flag is color-only** (`.flag.verified`).
   Add a shape cue (e.g. filled vs outline flag, or a tick badge — `safetile`
   check mark already exists in the marks set).
6. **Deck changes are invisible.** Upgrade/remove/add/transform happen in
   shop/camp/reward screens with instant list updates. Reuse `dealin` on the
   changed card and `chord` (upgrade) / `entomb` (removal) — zero new assets.
7. **Card-play sameness.** Every play is `ghostplay` + `play`. Cheap variation:
   scale ghost duration/size by card rarity or cost (CSS var), and give
   Curse/Status plays the `ghostdiscard` path + a dull thud so burdens *feel*
   bad. Powers deserve a brief glow on the powers row.
8. **Float column overlap**: >3 simultaneous floats on one enemy share 3
   x-offsets; extend to 4–5 offsets + 80 ms stagger for large AoE turns.
9. **Chain tiers stop at 4.** `cascade` for ≥4 is flat for a 30-tile flood.
   Scale arpeggio note-count/pitch with `count` (log₂), and stagger `tilepop`
   outward from the click by ~12 ms/ring for big chains (CSS delay var,
   reduce-motion collapses it safely).

**Animation-hierarchy notes:** easing is consistent (ease-out entries, one
overshoot on `dealin` — appropriate); shake is reserved for genuinely large
events; no hit-stop (fine at this scale); infinite pulses are the only
long-runners and all carry information except title/cutscene ambience.

---

## 5. Music findings

The generative approach is the right call for hundreds of runs — it can't
"loop badly," transitions glide, stratum darkening gives run progression a
sound. Gaps:

1. **In-fight statics.** Combat sounds identical at full HP vs 1 HP, turn 1 vs
   turn 12. Add a `danger` parameter (public info only: player HP fraction)
   mapping to pulse period −20% and cutoff +150 Hz. Two lines in `applyMood`.
2. **No stingers.** Victory/defeat rely on sfx jingles colliding with mood
   cross-fade. Promote the jingles into the music context (so they duck the
   drone) or add a 2 s drone swell on mood entry. Low effort, high polish.
3. **Events/rewards/puzzles inherit `delve`.** Events would benefit from a
   sparser variant (drop density to .06, raise bell chance) — a MOODS row, not
   new music. Puzzles: `camp` fits ("safe concentration").
4. **Quiet is under-used as a tool.** A 1-beat drone dip on `boom` (sidechain
   the master for 400 ms) would make mines land harder for free.
5. **No leak risk found**: mood inputs are screen, boss-kind, stratum — all
   public. Keep it that way; do *not* tie music to mine density.
6. **Only on/off control** — see settings.

## 6. Sound findings

- Palette is coherent (all synth, dark, short). Distinctness is good except
  `block` vs `plating` (both mid triangles/squares ~500–620 Hz; acceptable).
- **`flag` is the fatigue risk**: brightest waveform (square, 660→990) on one
  of the most frequent actions, identical both directions. Recommend: ±4%
  random detune per play (one line in `tone()` — actually give *every* recipe
  optional jitter), and a falling variant (990→660) for un-flagging so state
  direction is audible.
- **`boardattack` reused for four different enemy ops** (lay/fog/scramble/…).
  It's the "enemy did a board thing" family sound — fine — but fog vs lay
  matter differently. Layer one distinguishing partial (lay = +tick per mine,
  fog = +filtered noise wash) over the shared growl.
- Cutscene beat-advance reusing `draw` is thematically wrong (it's a page
  turn); a 30% quieter `dig` reads better. Trivial.
- Stacking rules already exist (per-name 60 ms). Two additions: a global
  concurrent-voice ceiling (~8) and `boom` priority-ducking `dig/cascade` in
  the same frame — chains ending in a mine currently smear.
- Variation pools: jitter (above) covers dig/flag/draw/hit at near-zero cost;
  don't build multi-sample pools for a synth game.

---

## 7. Settings review

Present and correct (all apply live, persist, sensible defaults): sfx on,
music on, reduce motion, high contrast, large tiles, large text, compact
cards (default **on**), left-handed, Noto emoji (default on), icon sets.

**Recommended additions** (defaults in bold; all live-apply, global,
available mid-run, no restart):

| Setting | Importance | Choices | Notes |
|---|---|---|---|
| Music volume | **essential** | 0–100 slider, **60** | wire to music `master.gain`; slider granularity matters more than sfx's |
| Sound volume | **essential** | 0–100, **70** | wire to sfx `master.gain` (0.4 ≙ 70) |
| Screen shake | high-value | on / **on** / off | separate from Reduce motion — shake-sensitive players currently must give up *all* motion to drop it; gate `ui.shakeSeq` class add |
| Long-press flag delay | high-value | 300 / **420** / 550 ms | motor accessibility; constant already exists (`LONG_PRESS_MS`) |
| Flag mode toggle (tap = flag) | high-value | **off** / on | one-handed play; `ui.flagMode` already exists in engine — expose it in settings/HUD |
| Haptics (Android) | high-value | **on** / off | requires `@capacitor/haptics`; light tick = reveal, medium = boom, double = victory |
| Combat hints | already in prefs (`showCombatHints`) but **not in either settings panel — verify and expose or delete** | | |
| In-game panel parity | optional | | add Large tiles + Left-handed to InGameMenu (arbitrary omission) |
| Animation speed | optional | **1×** / 1.5× / 2× | single `--anim-scale` CSS var; only if players ask — nothing blocks today, so pressure is low |

**Not recommended**: resolution/display/vsync/framerate (browser/Capacitor
handles it), graphics presets (CSS-only pipeline), ambient/interface split
volumes (only two buses exist), input remapping (two shortcuts total —
document E/Esc in settings instead), dynamic range (synth output is already
narrow), language (no localization yet — when it comes, timing is unaffected;
typewriter speed is per-character).

## 8. Accessibility findings

Pass: numbers are text glyphs + per-count colors (shape+color, colorblind-safe
in practice); every sound has a text/visual twin (toast/log/float); reduce
motion honors both OS and in-app paths and leaves static warning outlines;
tap-to-focus enemy popover mirrors hover info; aria-labels on enemy tokens;
nothing input-blocking; no strobe-class flashing (`craterflash` is one .45 s
decay, `hitflash` one pulse — within safe limits).

Failures / gaps:

1. **Verified-flag distinction is color-only** (finding §3.5).
2. **Tile `title` tooltips are mouse-only** — touch players never see
   "PRIMED — flag, defuse, or reveal!" prose. The icons carry most of it, but
   primed/grub/telegraph deserve a one-line strip above the board on touch
   (reuse the targeting `hint` bar) when such a tile exists.
3. **Keyboard play is incomplete**: tiles are divs with click handlers — no
   tabIndex, no Enter/Space activation, no arrow-key board navigation. Combat
   is currently pointer-only. This is real work (roving tabindex on the grid)
   but is the difference between "has a11y settings" and "playable."
4. **Focus visibility unaudited** on custom buttons — add `:focus-visible`
   outlines to `.btn`, `.tile`, `.home-action` and verify (test plan).
5. Reduce-motion collapses `dealin` stagger to 0 delay *by design* — confirmed
   safe (elements never stay hidden).
6. No setting currently *removes* information — good baseline.

---

## 9. Making it more fun (clarity-safe, reuse-first)

1. **Chain-reveal escalation** (§4.9) — the core fantasy moment; ripple delay +
   scaled arpeggio. *Communicates chain size; joy; scales with rarity of event.*
2. **Curse personality**: Curse/Status cards land in hand with a heavier
   `dealin` (longer, lower overshoot) and a dull thud; playing one uses the
   discard ghost. *Communicates "this is a burden" without text.*
3. **Boss entrances**: boss combat already darkens the mood; add a 1-beat
   drone swell + the boss's `enemyjolt` on mount. Cheap, memorable.
4. **Near-clear tension**: when safe-left ≤ 3, let the safe counter breathe
   (reuse `beckon` scale pulse). Public info only; heightens endgame without
   music leaking anything.
5. **Lucky/unlucky beats**: revealing a scanned-safe tile that a `Miscounter`
   lied about, or surviving at 1 HP — one toast line with personality
   ("The crypt blinks first.") — text only, no new systems.
6. **Victory that reflects the run**: victory screen already exists; sort the
   stats reveal with 60 ms `dealin` stagger and fire `chord` per line —
   reuses everything.
7. **Defeat that invites retry**: defeat mood + bones are suitably grim; add
   the run's best stat ("Deepest: Stratum 3") with the same stagger so the
   last feeling is progress, not punishment.

## 10. Prioritized recommendations

Column key: Imp = importance, Cx = complexity, A11y/Perf/Rep = impact/risk.

| # | Situation | Current | Change | Reuses | Imp | Cx | A11y | Perf | Rep |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Invalid action | dim only | buzz sfx + 3 px head-shake + (if absent) toast | enemyjolt, tone() | essential | low | + | none | low |
| 2 | Low/critical HP | nothing | HP stat pulse + heartbeat rate via `danger` param | primedpulse, applyMood | essential | low | + | none | low |
| 3 | Volume sliders ×2 | mute toggles | wire both master gains to sliders | existing masters | essential | low | + | none | — |
| 4 | Keyboard board play | pointer-only | roving tabindex + Enter/Space/F | — | essential | high | ++ | none | — |
| 5 | Heal sfx | silent | inverted hurt contour | tone() | high | low | + | none | low |
| 6 | Ghost cause | count heuristic | engine passes cause | ghost system | high | low | 0 | none | — |
| 7 | Verified flag shape | color class | filled vs outline / tick badge | safetile mark | high | low | ++ | none | — |
| 8 | Deck-change feedback | list updates | dealin + chord/entomb on change | both | high | low | + | none | low |
| 9 | Chain escalation | 2 sfx tiers, simultaneous pops | ripple delay + scaled arpeggio | tilepop, cascade | high | med | 0 (RM-safe) | low | low |
| 10 | Flag variation + direction | identical chirp | ±4% jitter; falling un-flag | tone() | high | low | 0 | none | fixes one |
| 11 | Touch warning strip | title-only | hint bar when primed/telegraph exists | hint bar | high | low | ++ | none | low |
| 12 | Screen-shake setting | inside reduce motion | separate toggle | shakeSeq gate | high | low | ++ | none | — |
| 13 | Curse presentation | same as any card | heavy deal + thud + discard ghost | dealin, ghosts | high | low | 0 | none | low |
| 14 | Stingers / boom duck | sfx over mood | 400 ms drone duck; entry swells | music master | high | low | 0 | none | low |
| 15 | Haptics | none | Capacitor haptics, 3 intensities, setting | — | high | med | + | none | low |
| 16 | Event/puzzle moods | delve fallback | 2 MOODS rows | MOODS table | optional | low | 0 | none | low |
| 17 | boardattack variants | one growl ×4 ops | layered partial per op | noise()/tone() | optional | low | + | none | low |
| 18 | Focus-visible audit | unknown | outlines on btn/tile/action | CSS | essential | low | ++ | none | — |
| 19 | Float columns | 3 offsets | 5 offsets + stagger | dmgfloat | optional | low | 0 | none | low |
| 20 | Victory/defeat stat stagger | static screens | dealin stagger + chord per line | both | optional | low | 0 | none | low |

### Deliverable lists

**Missing coverage (complete):** invalid action · heal · low/critical HP ·
card add/remove/upgrade/transform · shuffle · save/load cue · unlocks ·
reward-pick cue · gadget use · camp actions · menu nav sounds (deliberately
omittable) · run-start flourish · combat-entry cue · near-clear state ·
conditional-effect fail · exceptional-play treatment · haptics (whole channel).

**Inconsistent/misleading:** ghost play-vs-discard heuristic · hurt-without-heal
asymmetry · `draw` as cutscene page-turn · flag toggle symmetric both ways ·
`boardattack` covering four distinct ops · settings panels differing between
title and in-game.

**Repetition risks:** `flag` chirp (brightest+frequent) · toast stacking during
multi-op enemy turns · `boardattack` ×3 in one turn · title `ember`/cutscene
drift are fine (ambient, slow).

**Minimum viable pass:** items 1, 2, 3, 5, 6, 7, 10, 18 — all low complexity,
no new asset classes, closes every "essential" gap except keyboard play.

**Full polish pass:** MVP + 4, 8, 9, 11–15, then 16–20.

**Settings checklist:** §7 table. **Accessibility checklist:** §8 list.

**Music-state map:**
```
title ─gesture─▶ (armed) ─▶ title
  └ new run ▶ delve(stratum) ─▶ combat(stratum) ─▶ boss(stratum)
                │                │ victory-of-fight ▶ delve
                ├ camp ├ shop ├ [proposed: event, puzzle]
                ▼ gameover ▶ defeat        ▼ run won ▶ victory
transitions: all glide 1–2 s (setTargetAtTime); visibility ⇒ suspend/resume;
stratum darkens delve/combat/boss −1 semitone each; proposed: danger flag
(public HP only) ⇒ pulse/cutoff; boom ⇒ 400 ms master duck.
```

**Priority hierarchy (loudest/biggest → quietest):** run outcome (jingle+mood)
→ mine boom / full clear (shake+0.5 s sfx) → boss entrance → player hurt
(shake+saw) → enemy death → chain cascade (scaled) → card play / enemy hit →
dig / draw / flag / coin (ticks) → ambient (ember, drips, bells). Warnings
(primed/telegraph) sit outside the loudness ladder: persistent, pulsing,
never louder than events.

### Test plan

1. **Routine**: reveal, flag both directions, play/discard cards, end turn —
   sounds fire once, ≤60 ms latency, no double-triggers under rapid clicking.
2. **Verify-items**: does clicking an unaffordable card toast today? does a
   tile hover style exist? is `showCombatHints` reachable from any panel?
   focus-visible on all interactive elements?
3. **Overlap**: 20+ tile chain ending on a mine (boom must dominate); enemy
   turn with lay+fog+scramble (toast stack readable, ≤3 growls); 6+ floats on
   one enemy.
4. **Interrupt**: open menu mid-float/ghost; end combat mid-cascade (engine
   already guards board-reseal, engine.js:603); skip cutscene mid-typewriter;
   change each setting mid-combat.
5. **Reduced/muted**: full run with reduce motion — confirm primed/telegraph/
   target info persists statically; full run muted — confirm toasts+log carry
   every event; both at once.
6. **Suspend**: background the app mid-combat (Android + tab), resume —
   music resumes, no sfx backlog burst.
7. **Scale**: largest board size at 26 px tiles on a 360 px viewport —
   pulses/telegraph legible; large-text + compact-cards together.
8. **Repetition**: 30-minute session; log any sound you start to hate
   (predict: flag) and any toast you stopped reading.
