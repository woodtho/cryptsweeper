# Cryptsweeper — Art Direction Bible

The shared foundation for all character, NPC, and cutscene art. Read this first;
the per-domain docs ([delver-portraits](delver-portraits.md), [npc-art](npc-art.md),
[cutscene-art](cutscene-art.md)) inherit everything here and only add specifics.

---

## 1. The world in one paragraph

Cryptsweeper is a roguelite deckbuilder fused with Minesweeper. You are a **Delver**
descending through three strata of the **Undermine** — a living mine that grows hexed
charges in its own stone. It is a place of pick-marks and old graves, drowned archives
and buried clockwork, lit by hand-carried flame. The tone is **grim but not gory,
adventurous but doomed** — a lantern held up in a vast dark that does not care about you.
Think *Darkest Dungeon*'s dread and *Slay the Spire*'s grubby fantasy, rendered with the
weight of oil-painted key art rather than flat illustration.

## 2. Rendering style

- **Painterly, semi-realistic dark fantasy.** Visible brushwork and material texture, not
  cel-shaded or vector-flat. Faces and hands read as real; costume and stone read as heavy.
- **Chiaroscuro is the whole game.** One dominant warm light source (a lantern, a fuse
  spark, a candle) carving a subject out of deep shadow. Let 50–60% of every frame fall to
  near-black. Rim-light the silhouette so it separates from the ground.
- **Grounded materials.** Brass, iron, worn leather, wet stone, cracked bone, tallow wax,
  frayed rope. Everything looks used, patched, and slightly corroded.
- **Restraint on saturation.** The world is desaturated stone and shadow; saturated color
  is an *event* — a flame, a blood-red ribbon, a glowing rune. Never a rainbow.
- **No modern, cute, or clean.** No flat mobile-game gloss, no chibi proportions, no bright
  gradients, no lens flares, no visible UI in the art itself.

## 3. Palette

The art palette is the game's UI palette, so characters and scenes sit inside the
interface without clashing. Build every piece from these families.

| Role | Name | Hex | Use |
|---|---|---|---|
| Ground (deepest) | Abyss | `#06070a` / `#0b0d11` | The dark everything falls into |
| Stone | Stone | `#12151b` · `#191d25` · `#222733` | Walls, armor, mid-values |
| Carved line | Etch | `#2b3140` | Edges, grout, cool separation |
| Ink / flesh light | Bone | `#cfc9b8` (dim `#847f71`) | Parchment, skin highlights, cloth |
| **Key light** | **Candle** | `#c9973b` | The warm flame that lights every scene |
| **Danger accent** | **Blood** | `#b3372c` / hot `#e0503f` | Mines, ribbons, wounds, threat |
| Verdigris | Moss | `#5aa072` | Damp copper, poison, the Fog stratum |
| Hex glow | Violet | `#8f76d6` | Arcane numbers, hexes, the uncanny |
| Cold glow | Deep blue | `#6c96e8` | Cavern depth, cool crystal, distance |

**The formula:** warm **Candle** key + **Blood** accent, read against a cool
**Abyss/Etch** ground, with cyan crystal glints for depth. Each Delver additionally owns
**one signature accent** from this list, tied to their mechanic (see the Delver doc).

## 4. Lighting & staging rules

- **Warm/cool split.** Foreground subject lit warm (candle); background depth reads cool
  (abyss blue). This is the single most important consistency rule.
- **Light has a source in frame** wherever possible — a lantern, a fuse, a rune. Motivated
  light, not a floating studio key.
- **Faint red life.** A small blood-red note (a ribbon, a bell cord, an eye) somewhere in
  most frames keeps the danger present.
- **Negative space is intentional.** Let the dark be empty and heavy. Do not fill corners.

## 5. Technical export specs

All final art ships as **WebP** (quality ~82, target < 150 KB each) into `src/assets/`.
Provide layered source (PSD/PROCREATE) + a lossless PNG master per piece for future crops.

| Domain | Aspect | Master resolution | Ships to |
|---|---|---|---|
| Delver portrait | **3:4 portrait** (see note) | 1024×1365 | `src/assets/delvers/` |
| NPC portrait | 4:3 landscape | 1280×960 | `src/assets/npcs/` |
| Cutscene background | 16:9 landscape | 1600×900 | `src/assets/cutscenes/` |

> **Portrait aspect — action needed.** The current portraits are 1:1 (768×768), and the game
> shows portraits in **two** crops: a
> landscape card banner and a **3:4 vertical inset** in cutscenes (`object-position: center 25%`).
> Commission new portraits at **3:4** with the face/bust in the **upper-center third** and
> ~15% headroom, composed so a centered square and a landscape band both crop cleanly. See
> the Delver doc's framing diagram.

**Naming:** lower-kebab, matching the engine keys in `src/engine/data.js` and the imports in
`src/ui/portraits.js` / `src/ui/Cutscene.jsx`. Do not rename existing files without updating
those imports.

## 6. Canonical art pipeline

Cryptsweeper ships one complete art set to every player. There are no free/paid visual
tiers and no alternate-art entitlement. A finished delivery replaces its canonical WebP
directly in `src/assets/delvers/`, `src/assets/npcs/`, or `src/assets/cutscenes/`.

Commissioned work targets Delver portraits first, then NPCs and cutscenes. Match — and
elevate — the established mood without reinventing the characters.

## 7. Consistency checklist (every delivery)

- [ ] Warm candle key light, cool abyss background, ~50%+ in shadow.
- [ ] Built only from the §3 palette; saturation reserved for light/danger.
- [ ] A small blood-red note present.
- [ ] Rim-lit silhouette separates from ground.
- [ ] Materials worn, patched, corroded — nothing clean or modern.
- [ ] Correct aspect + safe framing for its domain; exports as WebP < 150 KB.
- [ ] Filename matches the engine key; no UI or text baked into the art.
