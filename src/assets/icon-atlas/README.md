# Cryptsweeper complete icon atlas

The complete-set template is a **10-column × 9-row** uniform atlas. Every tile is **128 × 128 pixels**, giving a final canvas of **1280 × 1152 pixels**.

- Use `complete-icon-atlas-guide.png` to see the required placement.
- Draw into `complete-icon-atlas-blank.svg`, or create a transparent 1280 × 1152 canvas in your art tool.
- Do not leave labels, grid lines, padding, or gutters in the exported artwork.
- Export as PNG or SVG without changing the canvas size or tile positions.
- In the app choose **Complete set**, **10 columns**, and **9 rows**.
- The final two cells are unused because the complete catalog currently contains 88 icons.

`complete-icon-atlas-manifest.csv` contains the same ordering in a format suitable for art pipelines and scripts. Regenerate all template sources with:

```powershell
node scripts/generate-icon-atlas-template.mjs
magick src/assets/icon-atlas/complete-icon-atlas-guide.svg src/assets/icon-atlas/complete-icon-atlas-guide.png
magick -size 1280x1152 canvas:none src/assets/icon-atlas/complete-icon-atlas-blank.png
```
