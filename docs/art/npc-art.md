# Cryptsweeper — NPC & Boss Character Art

Design brief for non-Delver characters: the recurring **Rat Merchant**, the three **boss
characters** as they appear in cutscene portraits, and guidance for adding future NPCs.
Inherits [art-direction.md](art-direction.md).

---

## 1. The Rat Merchant *(the one true NPC)*

The only friendly face in the Undermine. A hunched, hooded anthropomorphic rat who runs a
stall of scavenged gear — greedy, wry, and weirdly reassuring. He appears in the **shop
cutscene** (`getScene('shop')` in `src/ui/Cutscene.jsx`) and his portrait is the shop art.

- **Asset:** `src/assets/npcs/rat-merchant.webp` — 4:3 landscape, currently AI-generated.
- **Who he is:** a fence, not a friend — the last commercial instinct in a dead place. He
  buys what delvers strip from corpses and sells it back to the next one down. He is greedy,
  wry, and — precisely because he only wants your gold — oddly *reassuring* in a mine where
  everything else wants your life.
- **Build & face:** a hunched, hip-high anthropomorphic brown rat, mangy but shrewd, whiskers
  twitching. One ear torn and notched; yellowed incisors bared in a sly, appraising grin;
  small black eyes bright with arithmetic. Long clawed fingers heavy with cheap mismatched
  rings; a naked pink tail curled possessively around a strongbox or stool-leg.
- **Wardrobe & gear:** a patched, many-layered hood and a deep-red brocade waistcoat gone
  threadbare, fastened with brass buttons that don't match. A ring of keys, a jeweler's loupe
  on a cord, a coin-scale, and fat coin-pouches at the belt. Everything on him was clearly
  someone else's first.
- **The stall behind him (keep this):** a cramped nook of scavenged wonders — a hanging
  lantern, corked bottles and vials, rolled scroll-cases, a leaning pickaxe, a mortar and
  pestle, a set of scales — warmly lit, receding into cool stone dark.
- **Signature beat:** he holds a single **gold coin** out toward the viewer between claw-tips,
  catching the lantern light — the whole image reads "commerce" in a heartbeat.
- **Personality to read:** *"Easy now, delver. Nothing on my shelves bites unless you
  haggle."* A shopkeeper who has outlived braver customers and finds that funny. Sly, warm in
  a transactional way, never cute.
- **Framing:** 4:3, chest-up, face upper-center with the **offered coin/hand as the secondary
  focal point** in the lower third. He must brighten when "speaking" (the cutscene highlights
  the main art), so keep the key light firmly on his face and the coin.
- **Spec:** 4:3, master 1280×960 PNG + source; ship WebP (q~82, < 150 KB); filename stays
  `rat-merchant.webp`. This canonical version ships to every player.

## 2. Boss characters

Bosses are **enemies**, but they get full cutscene "character" art for their intro and
aftermath scenes (`BOSS_SCENES` in `src/ui/Cutscene.jsx`). These double as cutscene
backgrounds — so they are dramatic full-frame creature/environment portraits, not clean
character cutouts. Each is a menacing 16:9-ish establishing shot of the boss in its lair.

| Boss | Stratum | Asset | One-line read |
|---|---|---|---|
| **The Collapser** | 1 — Topsoil Crypts | `cutscenes/collapser.webp` | A colossus of stacked crypt-stone with a furnace-eyed ring for a maw. Tectonic dread. |
| **The Fogfather** | 2 — Fog Galleries | `cutscenes/fogfather.webp` | A drowned bell-ringer of silver mist. A sound you can't place. |
| **NN-99** | 3 — Machine Seam | `cutscenes/nn99.webp` | A machine-saint survey engine with a single red lens. Cold, inhuman authority. |

### The Collapser *(Stratum 1 boss)*
A cave-in that decided to walk. A colossus assembled from stacked, ill-fitting crypt-masonry
— sarcophagus lids, keystones, and grave-slabs bound with rusted chain — moving with the slow
inevitability of a landslide. It has no face: where a head should be sits a great hollow
**ring-maw** of fitted stone, and deep inside it a smouldering **orange** furnace-glow, the
only warmth in the frame. Chained arms drag and fling rubble; smaller stones orbit and
crumble from its bulk as it moves. In play it *devours the board's outer ring*, so it should
feel like architecture turning predatory — the room itself closing in. Ember-orange and
blood over crypt-grey and cold shadow. *Its line: "Every brace breaks. Every roof comes
down."*

### The Fogfather *(Stratum 2 boss)*
A drowned thing that rings for the lost and answers from behind you. A vast, robed,
half-transparent figure that is more weather than body — a bell-ringer's silhouette resolving
out of, and dissolving back into, rolling silver-green fog. A great cracked **bronze bell**
is his head, or hangs in one dripping hand; a frayed rope trails from it. Where a face would
be, only mist and two dim cold lights. Waterline stains, floating catalogue-tags, and drowned
archive-debris drift around his hem. He unmakes the map — fogging cleared tiles, scrambling
what you knew — so he should read as *disorienting and grief-heavy*, a sound you can't source.
Moss-green damp and drowned cold-blue, with the bronze bell as the one warm-metal note. *His
line: "Maps are only promises made by the lost."*

### NN-99 *(Stratum 3 boss)*
A machine-saint, and the mind the whole mine has been counting toward. A vast, unfolding
construct of brass and blackened iron — part cathedral organ, part census engine — suspended
in its own clockwork halo of gears, gauge-clusters, and reels of punch-card "scripture" that
spool and re-read endlessly. It has no face but a **single red lens** that fixes on the
viewer like a verdict, ringed by smaller gauge-eyes. Steam bleeds from its seams; its
gestures are precise, liturgical, unhurried. It only takes damage on turns you dig
aggressively, so it should read as *cold, exact, inhuman authority* — a bureaucracy that has
decided you are a fault to be corrected. Red lens and gauge-glow over cold brass and
machine-oil dark. *Its line: "FAULT DETECTED. DELVER CONFIDENCE EXCEEDS SAFE LIMIT."*

**Boss art rules:**
- **Scale is the point** — frame low, looking up; the Delver should feel tiny. The cutscene
  overlays the active Delver portrait bottom-right, so **keep the boss's focal menace
  upper-center-left** and leave the lower-right quarter readable/darker for that inset.
- Each boss leans on **one accent over the shared palette:** Collapser = ember **orange/blood**;
  Fogfather = **moss + cold blue**; NN-99 = **red lens on brass**.
- Same painterly chiaroscuro as everything else — these are the AI cutscene backgrounds'
  established looks; elevate craft, keep the read.
- **Spec:** 16:9, master 1600×900, ship WebP (q~82, < 150 KB), filenames unchanged.

## 3. Smaller enemies (not commissioned as portraits)

The 14 regular enemies (`ENEMIES` in `src/engine/data.js` — Grubber, Minelayer Imp, Stone
Warden, Fog Wisp, etc.) are represented **in combat by icons**, not painted portraits, and
have their own icon-set pipeline (`src/ui/enemyIcons.jsx`, the Beasts/vector families). They
are **out of scope for this doc** — do not commission full illustrations for them unless a
future "enemy codex" feature is greenlit. If it is, they'd follow the NPC 4:3 spec.

## 4. Adding a future NPC

If a new NPC is introduced (a second merchant, a questgiver, a hermit at a Camp):

1. Design to the **4:3 chest-up portrait** spec above with a clear held prop that states
   their function in silhouette.
2. Give them a **single signature accent** and a motivated warm light on the face.
3. Drop the WebP in `src/assets/npcs/`, add the import + export in `src/ui/portraits.js`,
   and reference it from a new scene in `getScene()` (`src/ui/Cutscene.jsx`). See the
   [cutscene doc](cutscene-art.md) for how scenes are wired.
4. Run the art bible's §7 consistency checklist.

**Golden rule:** the Undermine has exactly one friend. New NPCs should feel like exceptions
that prove how alone the Delver is — transactional, strange, or desperate, never cozy.
