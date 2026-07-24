# CryptSweeper presentation review

Current-state review, updated 2026-07-24.

## What now works well

### Mobile battle readability

The battle header keeps core resources visible without a horizontally
scrolling stat strip. The menu occupies its own row. Enemies and items begin as
compact summaries and expand on demand, while cards stay behind a prominent
button until needed.

The board now has an explicit inspection mode for touch users. Inspection
reveals the same contextual information available to mouse users without
accidentally digging or flagging. Board tiles are real focusable buttons with
arrow-key navigation, `Enter`/`Space` activation, `F` to flag, and `I` to
inspect.

Safe-area insets protect controls from Android status and navigation bars, and
rotation is locked for the native mobile experience.

### Feedback

Digging, flags, scans, card actions, damage, mines, invalid actions, victory,
and other high-value actions have distinct synthesized sounds. Haptics cover
digging, flagging, damage, mines, invalid actions, and victory on supported
devices. Invalid card actions shake the card and explain the failure. Critical
health adds a pulse and restrained red edge treatment.

Motion remains subordinate to state: tile reveals, detonations, card/deck
changes, damage, rewards, and modal transitions are legible, and reduced-motion
preferences disable nonessential motion.

### Music

The soundtrack supports both direct track playback and the infinite jukebox.
Home/delve playback and the standalone jukebox have separate editable
parameters. Master, music, and SFX volumes are independent. Recorded MP3s are
encoded at 96 kbps and lazy-resolved on first use, cutting the installed audio
weight roughly in half and keeping soundtrack requests out of initial startup.

The app suspends music when backgrounded or locked and resumes according to the
active screen and saved settings.

### Navigation and learning

The home screen now presents the core decisions first: continue/new run and
challenges. Learn, Archive, and Settings form a smaller secondary tier. Archive
contains indexes, achievements, Graveyard, saves, jukebox, and speedruns,
instead of exposing all of them at the same visual level.

The tutorial is progressive. The guided first delve comes first; focused labs
unlock after it. Labs use representative battle UI, icons, focus movement, and
interactive questions. Searchable How to Play and the alphabetical rules index
define highlighted mechanics.

## Remaining presentation risks

1. The global stylesheet and primary screen orchestrator are still large.
   Archive/stat panels have been split out, but the Graveyard and several
   screen-specific sections should continue moving into isolated modules as
   they change.
2. Dynamic code chunks should be reviewed after every major feature addition.
   Soundtrack files are lazy-loaded, but the core gameplay JavaScript remains a
   meaningful first-load payload.
3. Touch targets and board density need regression checks on a small 360 px
   phone, a tall modern phone, and a tablet. Automated unit tests cannot judge
   thumb reach or visual crowding.
4. Haptic intensity and music/SFX balance need physical-device review; browser
   emulation cannot reproduce either accurately.
5. The game has extensive English rules text and authored fiction but no
   localization pipeline.
6. Some large generated card families retain templated phrasing and visual
   similarity. The curated reward pools reduce their visibility, but bespoke
   presentation would improve class identity further.

## Release review checklist

- Run `npm test`, then `npm run build`; deployment CI enforces this order.
- Complete one standard run, one daily/challenge run, and one Vein transition.
- Confirm a victory grave and a later Vein death can both be inspected.
- Confirm eligible records land in the correct speedrun category and Test Lab
  runs never appear.
- Test reveal, flag, inspect, Chord, target selection, and tooltips using touch
  only, then repeat using keyboard only.
- Background/lock the Android app during home, delve, and jukebox playback.
- Check critical health, invalid actions, haptics, and reduced-motion mode.
- Verify all safe-area edges in gesture-navigation and three-button-navigation
  modes.
