# Full-body sprite set

Static full-body 2D sprites for every playable Delver, regular enemy, elite,
boss, and the Rat Merchant. They extend the established coarse pixel portraits
without replacing them.

## Layout

- `delvers/` — ten playable Delvers.
- `enemies/` — eleven regular/elite enemies and three bosses.
- `npcs/` — the Rat Merchant.
- `sheets/` — transparent high-resolution generated roster sheets.
- `sources/` — original flat-magenta generation outputs retained for recropping.
- `review/fullbody-roster.png` — all 25 exports on one labelled review board.

Every individual runtime-ready file is a transparent, lossless **384×512 WebP**
with a consistent bottom anchor. The apparent body scale varies intentionally:
Wisps remain slight, the Merchant remains short, and bosses retain monumental
silhouettes.

## Rebuild

Run:

```powershell
python scripts/process-fullbody-sprites.py
```

The crop manifest lives at the top of that script. Adjust its boundaries if a
source sheet is regenerated. Background removal is deliberately a separate
step using Codex's installed image-generation chroma-key helper.

## Generation direction

Five coordinated sheets were generated with the built-in image-generation
tool:

1. Sapper through Gambler, using their existing coarse portraits as identity references.
2. Chirurgeon through Revenant, using their existing coarse portraits as identity references.
3. Topsoil/Fog enemies: Grubber through Tunneler Grub.
4. Machine/elite enemies: Clockwork Sapper through Detonata.
5. Rat Merchant and all three bosses, using their established artwork as identity references.

All prompts required isolated full bodies, even baselines, hard 16-bit pixel
clusters, no scenery or labels, and a flat removable chroma background.
