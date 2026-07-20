# Cryptsweeper — Delver Portrait Art

Design brief for the ten playable **Delvers**. Inherits everything in
[art-direction.md](art-direction.md). Portraits are the game's flagship art and top
commission priority. The canonical set ships to every player.

---

## Where portraits appear (drives the framing)

1. **Delver select cards** (`.delver-art` in the class grid) — shown as a wide banner at the
   top of each card.
2. **Cutscene speaker inset** (`.cutscene-player`) — a **3:4 vertical** frame, bottom-right,
   `object-position: center 25%`; it brightens/gilds when that Delver is speaking.

So each portrait must survive **both** a landscape band and a 3:4 vertical crop.

### Framing template (compose to 3:4, safe for both crops)

```
┌──────────────────────────┐  ← 3:4 canvas (1024×1365 master)
│        headroom ~15%     │
│      ╭────────────╮      │  ← FACE in the upper-center third
│      │   face     │      │     (survives the square + landscape crops)
│      │  + shoulders│     │
│   ╔══╧════════════╧══╗   │  ← chest / signature prop by mid-frame
│   ║  bust + key prop ║   │
│   ║   (blade / lamp) ║   │
│   ╚══════════════════╝   │
│  atmosphere / shadow     │  ← lower quarter can fall to dark; safe to crop
└──────────────────────────┘
   keep nothing critical in the outer ~8% margin
```

- **Bust / half-body**, three-quarter turn, looking toward the viewer or their tool.
- One **signature prop** held or worn, reading in silhouette.
- Motivated warm light on the face; cool dark behind. A small blood-red note somewhere.
- Neutral-to-grim expression with attitude — these are professionals of a lethal trade.

## Roster (canonical data from `src/engine/data.js`)

Each Delver owns **one signature accent** from the palette, tied to their mechanic — use it
as their costume/light spot color so players learn them by color.

| # | Key | Name | HP | Fantasy / role | Signature accent |
|---|---|---|---|---|---|
| 1 | `sapper` | The Sapper | 80 | Demolitions — *"a mine is ammunition"* | Blood + candle spark |
| 2 | `surveyor` | The Surveyor | 66 | Information engine — *"a mine is a fact"* | Cold blue / lens glint |
| 3 | `terraformer` | The Terraformer | 72 | Board editor — *"a mine is terrain"* | Violet + stone |
| 4 | `lamplighter` | The Lamplighter | 68 | Cascades & energy — *"bring your own dawn"* | Candle amber (bright) |
| 5 | `gambler` | The Gambler | 70 | Flags & wagers — *"the board always tells"* | Gold coin + blood |
| 6 | `chirurgeon` | The Chirurgeon | 76 | Pain conversion — *"nothing vital was hit"* | Moss green + bone |
| 7 | `warden` | The Warden | 82 | Block retention — *"stone remembers pressure"* | Stone grey + blue |
| 8 | `archivist` | The Archivist | 62 | Draw & exhaust — *"everything is evidence"* | Bone / parchment |
| 9 | `hexwright` | The Hexwright | 64 | Number magic — *"three is a weapon"* — **late unlock** | Violet hex-glow |
| 10 | `revenant` | The Revenant | 55 | Death defiance — *"already buried once"* — **late unlock** | Blood + grave-bone |

## Character briefs

Full direction for each Delver. Keep them recognizable against the AI placeholders already
in `src/assets/delvers/` (Sapper: goggled demolitionist in a red scarf; Warden: heavy armor;
Surveyor: silver-haired with a lens) — match silhouette and read, then elevate the craft.

Each entry gives **who they are**, then **build & face**, **wardrobe & gear**, **signature
prop**, **pose & attitude**, and a **palette & light** cue. The through-line: every Delver is
a working professional of a lethal trade, not a hero — competent, marked by the job, and
weirdly at home in the dark.

---

### 1. The Sapper — *demolitions · "a mine is ammunition"*
The roster's grinning pyromaniac. She doesn't fear the mine's buried charges; she treats them
as free ammunition, and she is happiest when the board is most dangerous.

- **Build & face:** Mid-30s, wiry and hard-muscled, skin darkened with old soot and a shine
  of sweat. A close-cropped or tied-back crop of hair singed short at the ends. A burn-scar or
  two along the jaw or forearm; a scattering of tiny powder-burn freckles. Bright, slightly
  manic eyes.
- **Wardrobe & gear:** Welder's/blast goggles (smoked glass, brass rims, cracked strap)
  pushed up onto the brow. A red wool scarf wound at the throat — her one spot of pure color.
  A heavy leather apron and bandolier slung with stubby charges, coiled det-cord, spare fuses,
  and a striker. Fingerless gloves, forearms wrapped.
- **Signature prop:** A brass plunger-detonator gripped in one fist, or a single hissing fuse
  held close — the light source *is* the spark.
- **Pose & attitude:** Leaning forward, weight on the balls of her feet — someone trained to
  move fast right after lighting something. A crooked, unbothered grin that has plainly
  survived worse. She should look *pleased* to be surrounded by hazards.
- **Palette & light:** Fuse-spark as key — the hottest, most orange-lit face in the game.
  Blood-red scarf accent; everything else soot-black.

### 2. The Surveyor — *information engine · "a mine is a fact"*
The fragile genius who never guesses. Where the Sapper spends the board, the Surveyor *reads*
it — she converts every scanned tile into certainty, and she is the class most likely to
solve the whole grid.

- **Build & face:** Late 30s to 40s, slight and elegant, an ageless scholarly poise. Ash-blond
  or silver hair swept back off sharp cheekbones. Intelligent, faintly tired eyes; the calm of
  someone already three deductions ahead of you.
- **Wardrobe & gear:** A high-collared surveyor's coat of deep blue-grey, buttoned exactly. A
  bandolier of rolled charts; a plumb-bob on a fine chain; brass calipers; a fat notebook
  bristling with pinned annotations. Thin kid-leather gloves.
- **Signature prop:** A hinged jeweler's loupe or brass dowsing-lens rig over one eye on a
  little armature — turned slightly toward the viewer, as if measuring them.
- **Pose & attitude:** Still, composed, caught mid-thought — the deliberate opposite of the
  Sapper's motion. Physically the least armored Delver, yet utterly unrattled. Watchful.
- **Palette & light:** The one Delver lit more cool than warm — a blue rim-light and a bright
  cyan glint in the lens. Keep a small candle note so she still belongs to the world.

### 3. The Terraformer — *board editor · "a mine is terrain"*
The patient mason who treats the grid as clay — sealing tiles, swapping them, and building
constructs the dungeon has to work around. He is the fixed point the mine bends to, not the
other way around.

- **Build & face:** Late 40s, broad and heavy, built like the walls he shapes. Weathered
  brown skin, a greying beard, deep-set steady eyes under a heavy brow. Slow to move, slower
  to worry.
- **Wardrobe & gear:** Thick leather-and-plate gauntlets worn smooth at the knuckles; a
  stonemason's leather kilt/apron; a satchel of surveyor's stakes and shaped keystones. Dust
  ground permanently into every seam.
- **Signature prop:** A mason's hammer and chisel, and — his tell — a low construct of
  perfectly fitted stone beside him or a single carved block floating at his hand, its joints
  glowing faint **violet** where he has re-worked the rock.
- **Pose & attitude:** Unhurried and grounded, one hand resting on a chiseled block as though
  the mountain is simply awaiting instruction. Immovable to the point of stubbornness.
- **Palette & light:** Warm candle key on stone and skin; violet rune-seams in the worked
  stone as his signature accent.

### 4. The Lamplighter — *cascades & energy · "bring your own dawn"*
The keeper of flame, and the closest thing the Undermine has to hope. He turns broad safe
openings into bright cascades and extra energy — his whole fantasy is pushing the dark back
by force of will.

- **Build & face:** Lean, upright, purposeful; any age. A lined, resolute face, kind at the
  edges but set — hope worn as defiance, not naïveté. A little weary around the eyes.
- **Wardrobe & gear:** A long travel-coat hung with a dozen small lamps, oil flasks, wicks,
  and matchboxes, cuffs scorched from a lifetime of trimming flame. A striker-tool at the hip.
- **Signature prop:** A great warded lantern carried on a hooked pole — the largest, brightest
  light source in the game, held up and slightly forward.
- **Pose & attitude:** Raising the lantern to throw the widest warm pool of any portrait,
  driving shadow to the frame's edges. Steady, quiet, unbowed.
- **Palette & light:** Amber is his entire palette — the warmest, brightest portrait in the
  roster; the background all but swallowed by the dark he holds at bay.

### 5. The Gambler — *flags & wagers · "the board always tells"*
A cardsharp who took the worst bet of his life coming down here — and is still sure he'll
come out ahead. He makes deliberate wagers on hidden tiles and cashes correct reads into
cards.

- **Build & face:** 30s–40s, handsome in a frayed, dissipated way. A day's stubble, a knowing
  half-lidded gaze, a duelist's easy smile. The confidence of a man who reads tells for a
  living.
- **Wardrobe & gear:** A blood-red brocade waistcoat under a travel-worn frock coat; gold
  rings, a watch-chain, a battered hat with cards or small flags tucked into the band. Cuffs a
  little too worn for the fine cloth.
- **Signature prop:** A marked coin flicking across his knuckles (catch it mid-spin,
  gold-lit), and a fan of pinned flags/markers at his belt — his wagers on the board.
- **Pose & attitude:** Relaxed and insolent, weight cocked to one side, appraising the viewer
  as a mark he already likes his odds against.
- **Palette & light:** Twin accents — a warm gold coin-glint and the blood-red waistcoat —
  over a candle-lit, gambling-den warmth.

### 6. The Chirurgeon — *pain conversion · "nothing vital was hit"*
A battlefield surgeon who never stopped working — even once the patients turned into monsters
and the wounds became her own. She converts the first wound each turn into armor; pain is just
another resource to allocate.

- **Build & face:** 40s, spare and precise, exhausted competence in the eyes. A grim, level
  mouth (or a cloth mask pulled down to the chin). Steady hands that never fumble.
- **Wardrobe & gear:** A heavy apron darkened with old blood over a field-kit harness bristling
  with clamps, a bone-saw, curved needles and catgut, tourniquets, and small **moss-green**
  tincture bottles. One forearm already neatly bound in fresh linen.
- **Signature prop:** A threaded surgical needle or a bloodied bone-saw, used with total
  unconcern — ideally cinching a bandage on her *own* arm without looking down.
- **Pose & attitude:** Calm, clinical, mid-procedure. Unbothered by blood, including her own.
  Competence as armor in a place designed to hurt people.
- **Palette & light:** Moss-green tinctures and bone-white linen against a blood-dark apron;
  a warm key that runs a touch cooler and more sterile than the rest of the cast.

### 7. The Warden — *block retention · "stone remembers pressure"*
The immovable one. He builds defenses that persist between turns until he *is* part of the
wall — then turns all that accumulated stone into crushing board control.

- **Build & face:** Enormous and broad, geological in stillness. A scarred, weathered face
  under a helm pushed back off the brow, grey-stubbled, one eye clouded pale. Patient past the
  point of speech.
- **Wardrobe & gear:** A tower of dented plate armor — and his tell: retained defense reads as
  *literal* accretion, rock and pale crystal crusting the pauldrons and shield as though he is
  slowly fossilizing into the mine he guards.
- **Signature prop:** A vast tower shield grounded before him, and a maul braced at his side —
  a door that has held worse than you.
- **Pose & attitude:** Planted four-square, shield forward or set into the floor. Utterly
  unhurried; a landslide that hasn't decided to happen yet.
- **Palette & light:** Stone-grey and cold blue over the armor, with a single warm candle glow
  catching the scarred face. The least colorful, most monumental silhouette in the roster.

### 8. The Archivist — *draw & exhaust · "everything is evidence"*
The scholar who mistook the Undermine for a library and cannot stop cross-referencing it. He
cycles furiously through a fragile deck, finding the exact tool and burning the rest for more.

- **Build & face:** The youngest-feeling Delver — thin, ink-stained, over-caffeinated. Wide
  restless eyes behind cracked spectacles; hair escaping its tie; certain the answer is *in
  here somewhere*.
- **Wardrobe & gear:** Draped in bandoliers of brass scroll-cases and index cards on split
  rings; a portable writing-lectern strapped to the chest with a small clipped reading-lamp;
  a quill behind each ear; ink smudged to the wrist.
- **Signature prop:** A fistful of documents caught mid-flutter around him — and, his tell, a
  few card-edges *already catching fire* (Exhaust made visible), curling to orange ash.
- **Pose & attitude:** Caught mid-lunge for the one right page, papers whirling — the busiest,
  most kinetic silhouette. Brilliant, frazzled, and physically the frailest (lowest HP).
- **Palette & light:** Bone-and-parchment palette under a warm reading-lamp key, with tiny
  orange flame-edges on the burning cards as the danger note.

### 9. The Hexwright — *number magic · "three is a weapon"* — **late unlock**
The number-sorcerer, who reads the whole board as a live equation and detonates the answer.
Revealing a high number is, for her, an incantation completing.

- **Build & face:** The overtly arcane one, faintly inhuman in stillness. Hooded or
  shaven-headed; skin **tattooed with glowing violet numerals** that visibly crawl, shift, and
  re-sum across the flesh. Eyes lit from within.
- **Wardrobe & gear:** Layered ritual robes over delver's practicality; a rune-etched focus —
  a bone slate, an abacus of finger-bones, or a floating glyph — in one hand. The numeral
  **"3"** recurs as a motif in the tattoos, buckles, and hem.
- **Signature prop:** A single violet numeral igniting at her raised fingertips as a revealed
  number becomes a weapon.
- **Pose & attitude:** Hand lifted, calm the way a solved theorem is calm — the most magical
  and unsettling figure in the cast.
- **Palette & light:** Violet hex-glow as the dominant accent, self-lit by the crawling
  numerals; keep a warm candle note so she still sits inside the world.

### 10. The Revenant — *death defiance · "already buried once"* — **late unlock**
The one who came back. He walks closest to disaster and refuses one lethal blow each combat,
because death already tried once and lost. Neither zombie nor villain — a person who simply
declined to stay dead.

- **Build & face:** Ashen grey skin over a thin, spent frame (the lowest HP in the game).
  Sunken but open, clear eyes. The look of someone who dug *out* before they ever dug down.
- **Wardrobe & gear:** Grave-dirt and torn shroud-wrappings layered over ordinary delver's
  gear; a cracked **grave-bell** at the belt — the bell that failed to summon help when he was
  buried.
- **Signature prop:** A mortal wound at the chest or throat that will not close, lit faintly
  from within by a dull **blood-red ember** — the one warm light on an otherwise cold figure.
- **Pose & attitude:** Unhurried, hollow-calm, one hand resting at the grave-bell. Patient and
  quietly defiant — the most haunting portrait in the roster.
- **Palette & light:** Ash-grey and grave-bone throughout, with that single red inner glow at
  the death-wound; a cold, dim key broken only by that ember.

## Deliverables & specs

- **One portrait per Delver:** the canonical shipped file lives at
  `src/assets/delvers/<key>.webp` and is available to every player.
- **Aspect 3:4**, master 1024×1365 PNG + layered source; ship WebP (q~82, < 150 KB).
- **Filenames must equal the engine key** (`sapper.webp`, `hexwright.webp`, …) so
  `DELVER_PORTRAITS` in `src/ui/portraits.js` resolves without code changes.
- **Deliver in roster order** (Sapper → Revenant). Each finished file replaces its
  placeholder the moment it lands.
- **Consistency:** run the §7 checklist in the art bible on every portrait, and place all ten
  side-by-side before final — they must read as **one cast**, distinct by silhouette and
  signature accent, unified by light and palette.
