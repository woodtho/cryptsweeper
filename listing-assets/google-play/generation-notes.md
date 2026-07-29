# Image generation notes

Generated with OpenAI's built-in image generation tool on 2026-07-20. The unmodified high-resolution outputs are preserved in `source/`.

## Redesigned app emblem

Use case: logo / brand.

Prompt direction: Create the Flag the Deep emblem as a bold square mobile icon combining a carved octagonal crypt tile, a dark circular mine or ring-maw centre, and one diagonal brass pick. Add a subtle eight-neighbour grid in the stone. Use simplified, centred, large forms with a safe margin and strong readability at 48 px. Use charcoal blue-black, antique gold, a restrained ember-red core, and a cold teal rim. Do not include words, letters, numbers, skulls, faces, UI, badges, platform marks, watermarks, mockups, or rounded-square borders.

References: the previous app emblem and the game's existing cutscene artwork.

## Store key art

Use case: advertising / marketing.

Prompt direction: Create text-free, wide cinematic key art that accurately represents Flag the Deep: the Sapper delver on the left, a readable numbered stone Minesweeper board with a single glowing red mine in the centre, and the ring-bodied Collapser boss on the right inside a cold blue crypt. Match the game's painterly character and cutscene artwork, using warm lantern light against a haunted blue-black environment. Do not add a logo, marketing copy, UI, border, watermark, or unrelated fantasy elements.

References: the existing opening cutscene, Sapper portrait, and Collapser cutscene art.

## Pixel-art conversion

The handheld branch uses a deliberately coarse, shared production standard:

- Delver and NPC portraits are composed on a 96 × 128 logical canvas, limited
  to 16 colours, and scaled 4× with nearest-neighbour sampling.
- Cutscenes are composed on a 160 × 90 logical canvas, limited to 24 colours,
  and scaled 6× with nearest-neighbour sampling.
- Store key art uses a 240 × 120 logical canvas and 32-colour ceiling.
- The app emblem uses a 64 × 64 logical canvas and 12-colour ceiling.
- Every generated image preserves the subject and composition of its original
  reference while removing embedded labels, UI fragments, and watermarks.

The original high-resolution and first-pass pixel sources remain beside
`*-pixel-coarse` siblings for future art direction changes. Runtime imports and
ready-to-upload listing graphics use the coarse versions.
