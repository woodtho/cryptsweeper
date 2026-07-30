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

## Runtime integration

`src/ui/cutsceneSprites.js` is the cast manifest. Add a sheet import to its
character entry; `CutsceneActor.jsx` automatically selects the correct row for
idle, speaking, threatening, offering, and defeated states. If a sheet is
absent, the coordinated full-body sprite remains a supported static-motion
fallback.

The animated library covers the complete cast:

- all ten Delvers;
- the Rat Merchant;
- all eleven regular enemies;
- The Collapser, The Fogfather, and NN-99.

## Production checks

- canvas is exactly 768×512 after runtime processing;
- alpha channel exists and all four corners are transparent;
- every one of the 24 cells contains the intended subject;
- no missing or duplicated limbs, weapons, tools, bells, lanterns, or effects;
- loops do not change camera, scale, palette, or baseline;
- pixel edges remain readable with `image-rendering: pixelated`;
- reduced-motion mode leaves a clear first frame rather than hiding the actor.

The combined review is
`review/cutscene-animation-sheets.webp`.
