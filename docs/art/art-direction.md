# Flag the Deep — Art Direction Bible

The shared foundation for all character, NPC, and cutscene art. Read this first;
the per-domain docs ([delver-portraits](delver-portraits.md), [npc-art](npc-art.md),
[cutscene-art](cutscene-art.md)) inherit everything here and only add specifics.

---

## 1. The world in one paragraph

Flag the Deep is a roguelite deckbuilder fused with Minesweeper. You are a **Delver**
descending through three strata of the **Undermine** — a living mine that grows hexed
charges in its own stone. It is a place of pick-marks and old graves, drowned archives
and buried clockwork, lit by hand-carried flame. The tone is **grim but not gory,
adventurous but doomed** — a lantern held up in a vast dark that does not care about you.
The final treatment is an original late-1990s handheld dark-fantasy game: chunky,
tile-readable pixel clusters carrying the weight and material grime of the concept art.

## 2. Rendering style

- **Hand-pixeled, semi-realistic dark fantasy.** Deliberate 1–2 pixel clusters at the
  logical resolution, crisp stair-stepped silhouettes, compact dithered shading, and no
  anti-aliasing. It must look authored as pixel art, never like a mosaic filter.
- **Chiaroscuro is the whole game.** One dominant warm light source (a lantern, a fuse
  spark, a candle) carving a subject out of deep shadow. Let 50–60% of every frame fall to
  near-black. Rim-light the silhouette so it separates from the ground.
- **Grounded materials.** Brass, iron, worn leather, wet stone, cracked bone, tallow wax,
  frayed rope. Everything looks used, patched, and slightly corroded.
- **Restraint on saturation.** The world is desaturated stone and shadow; saturated color
  is an *event* — a flame, a blood-red ribbon, a glowing rune. Never a rainbow.
- **No modern, cute, or clean.** No flat mobile-game gloss, chibi proportions, smooth
  gradients, lens flares, painterly blur, vector curves, or visible UI in the art itself.

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

All final art ships as lossless **WebP**, nearest-neighbour scaled from a very small
logical canvas. Keep original high-resolution references and the first-pass
`*-pixel.webp` artwork beside the `*-pixel-coarse.webp` runtime files so future
conversions can return to a detailed source rather than a scaled copy.

| Domain | Aspect | Logical canvas | Runtime export | Palette |
|---|---|---:|---:|---:|
| Delver / NPC portrait | **3:4 portrait** | 96×128 | 384×512 WebP | ≤16 colours |
| Cutscene background | 16:9 landscape | 160×90 | 960×540 WebP | ≤24 colours |
| Store key art | 2:1 landscape | 240×120 | 1920×960 PNG | ≤32 colours |
| App emblem | 1:1 square | 64×64 | 512×512 WebP/PNG | ≤12 colours |

Portraits still appear in a landscape card band and a **3:4 vertical inset** in
cutscenes (`object-position: center 25%`). Keep the face and signature prop in the
upper-center safe area so both crops remain readable.

**Naming:** lower-kebab, matching the engine keys in `src/engine/data.js` and the imports in
`src/ui/portraits.js` / `src/ui/Cutscene.jsx`. Do not rename existing files without updating
those imports.

## 6. Canonical art pipeline

Flag the Deep ships one complete art set to every player. There are no free/paid visual
tiers and no alternate-art entitlement. Runtime art uses the canonical
`*-pixel-coarse.webp` files in `src/assets/delvers/`, `src/assets/npcs/`, and
`src/assets/cutscenes/`; the first-pass `*-pixel.webp` files remain source references.

Commissioned work targets Delver portraits first, then NPCs and cutscenes. Match — and
elevate — the established mood without reinventing the characters.

## 7. Consistency checklist (every delivery)

- [ ] Warm candle key light, cool abyss background, ~50%+ in shadow.
- [ ] Built only from the §3 palette; saturation reserved for light/danger.
- [ ] A small blood-red note present.
- [ ] Rim-lit silhouette separates from ground.
- [ ] Materials worn, patched, corroded — nothing clean or modern.
- [ ] Correct logical canvas, palette ceiling, aspect, and safe framing for its domain.
- [ ] Nearest-neighbour scaling only; no softened or half-width pixel blocks.
- [ ] Filename is `<engine-key>-pixel-coarse.webp`; no UI or text baked into the art.
