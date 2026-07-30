/*
 * Public release notes shown by the website.
 *
 * REQUIRED: update the "Next" entry with every player-facing change before the
 * change is considered complete. Keep player-facing language here;
 * implementation details belong in commit messages and development documents.
 */
export const CHANGELOG_ENTRIES = [
  {
    version: 'Next',
    date: 'In development',
    title: 'Sharper puzzles and clearer play',
    sections: [
      {
        label: 'New',
        items: [
          'Each Delver now has a class-locked signature relic that amplifies their signature mechanic — Daisy Chain, Bottomless Ledger, Coolant Cell, Everburning Wick, Two-Headed Coin, Leech Kit, Master Index, Spiked Aegis, Cinderbrand, and Second Shroud.',
          'While you do not yet own your Delver’s signature relic, every shop reserves a slot that offers it.',
          'The Delver index now tracks your total time played across all real runs.',
          'Cards whose Health cost would end your run — like the Revenant’s Crypt Debt — now show a red “Lethal” warning in hand.',
          'Crosswords now use different answers for their numbered rows and columns.',
          'A Row/Column selector and direction-aware cursor make crosswords comfortable on touchscreens and keyboards.',
          'The public changelog is now available from the main menu.',
          'Abandoning any Honest Puzzle now reveals its solution before you leave.',
          'Every Delver, enemy, boss, and the Rat Merchant now has a coordinated full-body 2D pixel sprite.',
          'Cutscenes now stage animated full-body Delvers, bosses, and the Rat Merchant over their environments.',
          'The Rat Merchant has a dedicated character-free shop backdrop and a corrected two-arm lantern animation.',
        ],
      },
      {
        label: 'Improved',
        items: [
          'Crossword cells highlight the line currently being answered.',
          'Tapping the selected crossword cell switches between its row and column.',
          'Crossword row and column numbers now align correctly, with the active axis and R/C number marked directly on the board.',
          'Cutscene speakers animate while talking, defeated bosses remain visibly slumped, and reduced-motion mode freezes every actor on a clear pose.',
        ],
      },
    ],
  },
  {
    version: '0.1.5',
    date: 'July 2026',
    title: 'Delvers of the Deep',
    sections: [
      {
        label: 'New',
        items: [
          'Ten Delvers now have distinct card mechanics, class resources, decks, and signature relics.',
          'The endless Vein adds looping maps, roaming bosses, records, challenges, and achievements.',
          'Interactive tutorials, mechanic labs, searchable rules, and expanded puzzle variants teach the full game.',
        ],
      },
      {
        label: 'Improved',
        items: [
          'Battle UI, card presentation, mobile controls, icon sets, sound, haptics, and accessibility received a broad mobile-first pass.',
          'Bosses react to Delver mechanics, and boss rewards remain useful during long Vein runs.',
          'Run history, the Graveyard, eligible speedrun records, challenges, and daily descents were consolidated and expanded.',
        ],
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026',
    title: 'The first descent',
    sections: [
      {
        label: 'Released',
        items: [
          'A minesweeper roguelite combining tactical boards, cards, enemies, events, shops, camps, and bosses.',
          'Four strata, persistent progression, indexes, saves, music, and mobile Android support.',
        ],
      },
    ],
  },
];
