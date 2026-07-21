# Cryptsweeper complete icon atlas

The complete-set template is a **10-column × 9-row** uniform atlas. Every tile is **128 × 128 pixels**, giving a final canvas of **1280 × 1152 pixels**.

- Use `complete-icon-atlas-guide.webp` to see the required placement.
- Draw into `complete-icon-atlas-blank.svg`, or create a transparent 1280 × 1152 canvas in your art tool.
- Do not leave labels, grid lines, padding, or gutters in the exported artwork.
- Export as WebP or SVG without changing the canvas size or tile positions.
- In the app choose **Complete set**, **10 columns**, and **9 rows**.
- The final cell is unused because the complete catalog currently contains 89 icons.

`complete-icon-atlas-manifest.csv` contains the same ordering in a format suitable for art pipelines and scripts. Regenerate all template sources with:

```powershell
node scripts/generate-icon-atlas-template.mjs
magick src/assets/icon-atlas/complete-icon-atlas-guide.svg -quality 92 src/assets/icon-atlas/complete-icon-atlas-guide.webp
magick -size 1280x1152 canvas:none -define webp:lossless=true src/assets/icon-atlas/complete-icon-atlas-blank.webp
```

## Rendered sets

`sets/main-icons.svg` is the artist-authored primary icon set. It is registered
as **Main Icons** and is the default map, enemy, interface, camp, and item art
for new installs. Keep its filename, 10 × 9 layout, and 1280 × 1152 canvas
stable when replacing its artwork.

`sets/main-icons-color.svg` is the fully coloured variant of the main sheet,
registered as **Main Icons (Colour)**. Every icon carries hand-authored colour
layers (underpaint fitted beneath the line work plus tints and shading), all
defined per icon in the generator script. Never hand-edit the output; after
replacing `main-icons.svg` artwork, re-tune the layers there and regenerate:

```powershell
node scripts/generate-color-main-icons.mjs
```

`sets/main-icons-emoji.svg` is the emoji-styled variant, registered as
**Main Icons (Emoji)**: the same drawings with candy-saturated fills, a glossy
top-light, and line work recoloured to a darker shade of each icon's dominant
colour. It is produced by the same generator run, derived automatically from
the coloured spec plus a few per-icon contrast overrides.

`sets/main-icons-line.svg` is the clean line-art variant, registered as
**Main Icons (Line Art)**: pure strokes with no fills or shading, each icon's
line work in one colour derived from its dominant material and
lightness-clamped for the dark board. Also emitted by the same generator run.

`sets/sigil-icons.svg` is an original icon family registered as **Sigils** —
89 geometric monoline drawings designed from scratch (not derived from the
main sheet), authored as primitives in `scripts/generate-sigil-icons.mjs`:

```powershell
node scripts/generate-sigil-icons.mjs
```

`sets/marks-icon-atlas.webp` holds the finished hand-drawn Delver's Marks sheet,
on the same 10 × 9 grid and transparent 1280 × 1152 canvas as the template.
Native emoji families are rendered directly and do not keep duplicate
atlas-backed entries.

`src/ui/atlasSets.js` picks these up with a glob and registers each one as a
selectable set named `<Label> (atlas)`, so the set list offers both the native
and the atlas-backed rendering of every set. Adding or removing a sheet changes
the list — no code edit needed. Vite emits each sheet as its own asset, so none
are fetched at launch; they load when a screen actually paints from them.

They also work as a reference for what a slot is meant to depict, and as a
starting layer to trace or paint over. Regenerate them with:

```powershell
node scripts/generate-icon-set-atlases.mjs
```

Every tile is resolved through the game's own icon code, so generated sheets
show exactly what a set looks like in play. Item and camp tiles use their native
resolvers rather than the generic interface-role fallback.

## Emoji review sheets

Render the eight native emoji families for visual review with:

```powershell
node scripts/generate-icon-set-atlases.mjs --review-emoji
```

The resulting WebPs are written to `review/emoji/`. That folder is not loaded by
the app, so review sheets never create duplicate selectable icon sets.

Render the complete Delver's Marks sheet into its own review folder with:

```powershell
node scripts/generate-icon-set-atlases.mjs --review-marks
```

This writes `review/marks/marks-icon-atlas.webp` without changing the app-loaded
atlas.
