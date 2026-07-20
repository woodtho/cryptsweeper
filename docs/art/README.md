# Cryptsweeper — Art Design Docs

The art bible for Cryptsweeper's characters, NPCs, and cutscenes. Start with the direction
doc; it holds the world, palette, lighting, style, and export specs that the other three
inherit.

| Doc | Covers |
|---|---|
| [art-direction.md](art-direction.md) | **Read first.** Shared style, palette, lighting rules, technical/export specs, and the per-delivery consistency checklist. |
| [delver-portraits.md](delver-portraits.md) | The ten playable Delvers — framing template, per-character briefs, and portrait production priorities. |
| [npc-art.md](npc-art.md) | The Rat Merchant, the three boss character/cutscene portraits, and guidance for future NPCs. |
| [cutscene-art.md](cutscene-art.md) | Narrative cutscene background plates — composition safe-zones, the twelve-scene inventory, and per-scene briefs. |

## Where the art lives in the code

- Portrait resolver: `src/ui/portraits.js` (`DELVER_PORTRAITS`, `delverPortrait()`).
- Cutscene scenes + dialogue: `src/ui/Cutscene.jsx` (`getScene`, `BOSS_SCENES`).
- Canonical character data (names, roles, passives): `src/engine/data.js` (`CLASSES`, `ENEMIES`).
- Assets: `src/assets/delvers/`, `src/assets/npcs/`, `src/assets/cutscenes/`.

## Commission priority

1. **Delver portraits** (ships incrementally, roster order).
2. NPC / boss portraits.
3. Cutscene environment plates.

Every piece ships as WebP into `src/assets/`, filename matching its engine key, and passes
the consistency checklist in the direction doc.
