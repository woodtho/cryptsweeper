# Flag the Deep — Cutscene animation

The cutscene renderer separates environment plates from character actors.
`Cutscene.jsx` owns dialogue and scene state, `CutsceneActor.jsx` renders the
actor, and `cutsceneSprites.js` maps cast identities to full-body fallbacks and
optional 6×4 animation sheets.

## Stage behavior

- The active Delver stands on the right.
- A merchant or boss occupies the featured position on the left.
- Speaking selects row 3 of that actor's sheet.
- Merchant offer and boss defeat states select row 4.
- Boss introductions use the action row while the boss is not speaking.
- Narration leaves actors present but quieter.
- `prefers-reduced-motion` and the in-game Reduced Motion setting stop both
  frame playback and whole-character motion.

Environment art remains independent. In particular, the shop uses
`rat-merchant-shop-pixel-coarse.webp`, which contains no merchant; the animated
Rat Merchant is layered over it at runtime.

## Sheet contract

The generation master follows the production prompt's four rows and six
columns. Runtime sheets are normalized to 768×512 lossless WebP:

| Row | Delver/NPC | Enemy/Boss |
|---|---|---|
| 1 | Idle | Idle |
| 2 | Walk | Movement |
| 3 | Speak | Attack/special |
| 4 | Signature | Damage/defeat |

Each cell is 128×128. Keep the subject completely within the cell and use one
consistent baseline. Effects may overlap the silhouette but may not replace it.

## Prompt usage

Use the full-body sprite as an identity reference and run one character per
generation. Preserve the prompt's strict anatomy and equipment invariants.
After generation:

1. inspect all 24 frames at full size;
2. repair one bad cell at a time;
3. remove the sampled magenta background to alpha;
4. normalize to dimensions divisible by 6×4;
5. nearest-neighbour resize to 768×512;
6. save as lossless WebP and add it to `cutsceneSprites.js`;
7. inspect the combined review at mobile scale;
8. run the complete tests and production build.

Never accept a frame in which a character disappears behind an effect. Props
that define a silhouette—lantern, shield, bell, lens, construct, book, or
coin—must remain stable unless the action visibly and intentionally moves them.
