# Battle-scale sprites

These compact sheets are generated from the approved cutscene animation
library by `scripts/build-battle-sprites.py`.

- Four columns × two rows
- 48×48 runtime cells on a 24×24 logical pixel grid
- Row 1: idle loop
- Row 2: attack/special loop
- Fully opaque subject pixels with a one-logical-pixel dark outline

Run `python scripts/build-battle-sprites.py` after changing a source animation
sheet. Run it with `--verify` to validate the checked-in outputs.
