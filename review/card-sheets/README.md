# Card sheets

These review sheets are rendered from Flag the Deep's live `CardView` component
and current card catalog, so card wording, costs, rarity, targeting, and visual
style match the app.

- Sheets 01–10 cover each Delver.
- Each Delver sheet shows the exact starter deck (including duplicates), its
  curated reward pool, and any additional class cards in the catalog.
- Sheet 11 covers neutral, Status, and Curse cards.
- `manifest.json` records the generated filenames and dimensions.

Regenerate every PNG after card or style changes with:

```sh
npm run cards:render
```
