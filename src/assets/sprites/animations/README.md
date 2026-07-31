# Cutscene animation sheets

Cutscenes use a common **6 columns × 4 rows** sprite-sheet contract. Runtime
sheets are transparent, lossless **768×512 WebP** images, giving every frame a
**128×128** cell. Generated chroma-key masters remain in `sources/`; the app
only imports the smaller files in `sheets/`.

## Rows

Delvers and NPCs:

1. idle loop;
2. walk loop;
3. speaking loop;
4. signature action.

Enemies and bosses:

1. idle loop;
2. movement loop;
3. attack or special action;
4. damage-to-defeat sequence.

Every row contains six left-to-right frames. All cells must preserve identity,
equipment sides, anatomy, scale, and ground line. A subject may crouch or slump,
but must never be replaced by an effect.

## Normalization pipeline

Run `python scripts/normalize-animation-sheets.py --write` after adding or
replacing a chroma-key master. The asset tool requires Pillow and NumPy.

The processor:

- detects whether the generated master contains six or seven columns;
- samples six complete frames when a generator returned seven;
- separates subjects before applying cell boundaries, preserving tools and
  effects that cross a nominal source boundary;
- removes disconnected spill belonging to adjacent frames;
- aligns the primary silhouette to a consistent horizontal anchor and ground
  line with one shared character scale across every animation row;
- reserves a four-pixel transparent gutter inside every 128×128 runtime cell;
- rebuilds `review/cutscene-animation-sheets.webp`; and
- fails if a cell is empty, the runtime dimensions differ from 768×512, or
  visible pixels enter a neighboring cell's gutter.

Run the command without `--write` for an audit. Use `--preview` to produce
`review/normalized-preview.webp` without changing runtime assets. Use
`--verify-existing` to validate the checked-in WebPs without rebuilding them.

## Runtime integration

`src/ui/cutsceneSprites.js` is the cast manifest. Add a sheet import to its
character entry; `CutsceneActor.jsx` automatically selects the correct row,
actor-specific frame sequence, rate, playback mode, and horizontal stage
offset for idle, speaking, threatening, offering, and defeated states. If a
sheet is absent, the coordinated full-body sprite remains a supported
static-motion fallback.

`SpriteAnimation.jsx` supports three playback modes:

- `loop`: repeat the selected sequence;
- `once`: play once, then return to its first pose; and
- `hold`: play once and remain on the final pose.

The test-lab Animation Studio can export a
`flag-the-deep.animation-edit/v1` JSON correction. That file records the
requested frame order, timing, playback, facing, per-source-frame transforms,
comparison reference, preview background, and notes without mutating the
shipped assets.

The animated library covers the complete cast:

- all ten Delvers;
- the Rat Merchant;
- all eleven regular enemies;
- The Collapser, The Fogfather, and NN-99.

## Production checks

- canvas is exactly 768×512 after runtime processing;
- alpha channel exists and all four corners are transparent;
- every cell retains a four-pixel transparent sampling gutter;
- every one of the 24 cells contains the intended subject;
- no missing or duplicated limbs, weapons, tools, bells, lanterns, or effects;
- loops do not change camera, scale, palette, or baseline;
- pixel edges remain readable with `image-rendering: pixelated`;
- reduced-motion mode leaves a clear first frame rather than hiding the actor.

The combined review is
`review/cutscene-animation-sheets.webp`.
