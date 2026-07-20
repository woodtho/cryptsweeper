# Cryptsweeper — Cutscene Art

Design brief for the narrative **cutscene** backgrounds. Inherits
[art-direction.md](art-direction.md). Cutscenes are how the run's story is told between
combats — an establishing image, a typed line of dialogue, an active Delver portrait, and a
"mark" badge. This doc covers the **background plates**; the Delver inset comes from the
[portrait doc](delver-portraits.md) and the shop/merchant plate from the [NPC doc](npc-art.md).

---

## 1. How a cutscene is composed (this dictates the framing)

The cutscene component (`src/ui/Cutscene.jsx`) layers, over your background plate:

```
┌───────────────────────────────────────────────┐
│ [MARK badge]                        · · ·      │ ← top-left badge + progress dots
│  (icon +                                       │
│   LABEL)              FOCAL INTEREST           │
│                        upper-center            │
│                                                │
│                                  ╭──────────╮  │
│                                  │  active  │  │ ← Delver portrait inset
│                                  │  Delver  │  │   (3:4, brightens when speaking)
│                                  ╰──────────╯  │
├───────────────────────────────────────────────┤
│  Speaker name                                  │
│  Typed dialogue line…                          │ ← dialogue panel (drawn by UI)
└───────────────────────────────────────────────┘
```

**Safe-zone rules for every plate:**
- **Canvas 16:9** (`.cutscene-visual`), but it re-crops to **4:3 on mobile** — keep all
  critical content within a **center 4:3 safe area**; let the outer sides be atmosphere.
- The image is `object-fit: cover`, `object-position: center 32%` — compose the focal point
  **slightly above center**.
- **Reserve the bottom-right quarter** (Delver inset) and **top-left corner** (mark badge):
  keep those zones darker and uncluttered so the overlays read.
- A **vignette + bottom gradient** are added by the UI — you don't need to paint them, but do
  let edges fall to shadow so the composite blends.
- **No text, no UI, no characters' dialogue** baked into the plate.

## 2. Scene inventory

Twelve scenes, from `getScene()` and `BOSS_SCENES` in `src/ui/Cutscene.jsx`. Boss plates are
covered in the [NPC doc](npc-art.md); the shop plate is the Rat Merchant portrait.

| Scene id(s) | Title | Mark | Plate asset | Type |
|---|---|---|---|---|
| `opening` | The Mouth of the Undermine | DESCEND | `cutscenes/opening.webp` | Environment |
| `camp` | A Candle in the Dark | RESPITE | `cutscenes/camp.webp` | Environment |
| `descent-1` | The Sunk Archives | STRATUM II | `cutscenes/sunk-archives.webp` | Environment |
| `descent-2` | The Clockwork Depths | STRATUM III | `cutscenes/clockwork-depths.webp` | Environment |
| `finale` | The Seam Is Silent | FOR NOW | `cutscenes/finale.webp` | Environment |
| `shop` | The Rat Merchant | — | `npcs/rat-merchant.webp` | NPC → see NPC doc |
| `boss-intro-0` / `-aftermath-0` | The Collapser | BOSS AHEAD / DEFEATED | `cutscenes/collapser.webp` | Boss → see NPC doc |
| `boss-intro-1` / `-aftermath-1` | The Fogfather | BOSS AHEAD / DEFEATED | `cutscenes/fogfather.webp` | Boss → see NPC doc |
| `boss-intro-2` / `-aftermath-2` | NN-99 | BOSS AHEAD / DEFEATED | `cutscenes/nn99.webp` | Boss → see NPC doc |

> One plate serves both a boss's intro and aftermath scene, so it must read as ominous but
> not mid-explosion — the "defeated" beat reuses the same image with different dialogue.

## 3. Environment plate briefs

Establishing shots that sell each stratum's identity. Warm foreground light, cool cavernous
depth, heavy shadow, a small red note.

**`opening` — The Mouth of the Undermine** *(keep the established plate's read)*
The threshold where the maps begin lying. A chained iron cage-lift / carved stone platform in
warm lantern light in the foreground; beyond and below, a vast cool-blue cavern of gothic
buttresses, hanging chains, and a fragile rope-and-plank bridge descending into cyan-lit
depth. Awe and threshold-dread. *Line it sets up: "One way left to go."*

**`camp` — A Candle in the Dark** *(RESPITE)*
The game's one moment of warmth. A dry ledge with an old fire-ring, a bedroll, a propped
pack; a single small fire is the whole light source, pooling gold against surrounding black.
Cozy in the way a match is cozy in a cathedral. Quiet, safe, temporary. *Keep it intimate
and low — this is the exhale between horrors.*

**`descent-1` — The Sunk Archives** *(Stratum 2, Fog Galleries)*
Flooded scholarship. Drowned bookshelves and filing racks leaning into a corridor half-full
of black water, silver-green fog rolling low, catalogue tags and swollen ledgers floating.
Cold, moss-green and blue, hushed. Someone catalogued this place and was afraid to name what
they found. *Introduce the fog motif that stratum 2 lives in.*

**`descent-2` — The Clockwork Depths** *(Stratum 3, Machine Seam)*
Where stone gives way to brass. Cave walls seamed with buried machinery — cogs the size of
doors, punch-card reels, pressure gauges glowing faint red, oily condensation on iron. Warm
sparks against cold metal. The mine stops being natural and starts *counting.* *Foreshadows
NN-99.*

**`finale` — The Seam Is Silent** *(FOR NOW)*
Aftermath and unease. The wreckage of NN-99's chamber gone dark and still, dust drifting
through a single shaft of pale light, one red lens finally dead. But a low fissure in the
floor breathes faint warmth from far below — the First Mine, still counting. Bittersweet;
not a triumphant sunrise. *Ends the run on "not the bottom, just the end of this map."*

## 4. Adding a new cutscene

1. Paint a **16:9 plate** to the §1 safe-zone rules; export WebP (q~82, < 150 KB) into
   `src/assets/cutscenes/`.
2. Import it in `src/ui/Cutscene.jsx` and add a branch to `getScene(id)` with `title`,
   `art`, a `markLabel`/`iconName` (or `enemyKey` for a boss), `finalLabel`, and the
   `lines` (speaker + text).
3. Queue it from the engine with `queueCutscene('<id>', …)` at the right story beat
   (`src/engine/engine.js`).
4. Run the art bible's §7 checklist and preview it on a phone-width viewport (the 4:3
   re-crop) before final.

## 5. Consistency note

All plates are viewed back-to-back across a run, so they must feel like **one descent**:
the same painterly hand, the warm-key/cool-depth split, and a legible progression of palette
by stratum — earthen crypt → moss-green fog → brass-and-red machine → dead-dark finale.
Lay them in run order and check the journey reads at a glance.
