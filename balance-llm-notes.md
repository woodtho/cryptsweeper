# LLM playtest notes

These notes are from decisions made through the public JSON `state` / `actions` / `act`
interface, without revealing hidden mines. They complement the repeatable automated control
report; they are not presented as a statistically meaningful win-rate sample.

## `llm-balance-1` — Surveyor

- Used all four opening picks on two scanned-safe tiles, one logically proven safe tile, and the
  visible Grubber burrow. Four picks felt active without resolving the board for free.
- Derived mine locations from the revealed 1–3 clues, flagged them, and used Scan on ambiguous
  lair tiles rather than guessing.
- Sequenced Field Notes, Triangulate, Probe, and Brace around the visible 9-damage intent. The
  fight ended on turn two at 62/66 HP.
- Chose Sightline (3 Plating) over additional scans or damage because the starter deck already
  had enough information and needed persistent mine protection.
- Found a presentation bug during play: the Grubber asked the player to reveal its burrow, but
  that burrow was not rendered. The tile now displays the burrow and the JSON state exposes it.

## Balance conclusions

- Keep four base picks. The fourth created an additional inference/reveal decision and reduced
  dead turns without replacing card play.
- Extra picks should be earned through deck/trinket choices, not granted without limit. Each
  Delver pool now has a pick-generating scan card pattern and upgraded scan/draw pattern;
  Climber's Pitons provides a recurring fifth pick.
- Do not buff Surveyor based on the old fixed-policy 0% result: deliberate sequencing performed
  substantially better than that policy.
- Warden was the clear structural outlier in the automated control samples (5/5 wins before its
  first reduction and 6/10 afterward). Hold Fast now retains one quarter rather than half of
  Block, Warden starts at 82 HP, and Ward Plate starts at 2 Plating.
