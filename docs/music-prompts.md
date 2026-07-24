# CryptSweeper music generation prompts

Implementation note (2026-07-24): delivered masters in
`src/assets/music/raw/` are normalized to consistent kebab-case names,
compressed to 96 kbps MP3 for the app, and lazy-loaded by the recorded
soundtrack player. Keep lossless masters outside the shipped asset folder when
re-exporting or revising a track.

One prompt per track from the soundtrack plan (see the track table discussed in
review follow-up). Written to work both as AI-generator prompts (Suno/Udio
style-text) and as composer briefs.

## Shared rules — append to every prompt

> dark fantasy dungeon ambient, subterranean, candlelit, hybrid of soft analog
> synth and sparse acoustic instruments, spacious cavern reverb, instrumental,
> no vocals, no drum kit, no bright major-key melodies

**Key: everything roots on A** (A minor / A phrygian). The game's existing
generative layer drones on A1 (55 Hz) and will play *underneath* these tracks —
staying in the A family means the drone always harmonizes. **Tempo: match the
game's heartbeat pulses** — regular combat pulses at ~57 BPM, boss at ~77 BPM.

Tracks marked *reprise* should quote the existing main theme's motif: use your
generator's audio-reference/cover feature with the main theme uploaded, or hand
the motif to the composer.

---

## 1. Delve — The Topsoil Crypts (Stratum 1 map + combat)

> Slow subterranean ambient at 60 BPM in A minor. A deep breathing drone under
> sparse, hesitant plucked notes — waterlogged harp and muted music box —
> with long silences between phrases. Earthy, rootbound, patient: freshly dug
> soil, wooden coffins, shallow graves. Melody appears only in fragments,
> never a full tune. Texture over theme. Very low dynamic range, calm but
> uneasy, loopable without a noticeable seam.

- 3–4 min seamless loop. Most-heard track in the game — restraint is the spec.
- Stems: **bed** (drone+texture) / **pulse** (soft 60 BPM heartbeat-thump and
  low ostinato) / **tension** (dissonant high strings-and-air layer). Map plays
  bed; combat adds pulse; low HP adds tension.

## 2. Delve — The Fog Galleries (Stratum 2 map + combat)

> The same slow subterranean ambient language at 60 BPM in A minor, but
> drowned in fog: washed-out pads with blurred attacks, notes that arrive
> late and smeared, a distant detuned bell tolling irregularly, faint choir-like
> air with no words. Everything slightly further away than it should be.
> Damp stone galleries, zero visibility, sounds with no visible source.
> Sparse, seamless loop, texture over melody.

- Same structure and stem contract as #1 — deliberately a *deeper version of
  the same piece*, not a new song. Reuse #1's chord skeleton if possible.

## 3. Delve — The Machine Seam (Stratum 3 map + combat)

> The same slow subterranean ambient language in A minor, now contaminated by
> machinery: soft mechanical ticking, ratchet clicks and slow clockwork
> gears used as percussion at 60 BPM, oxidized metallic resonances, a low
> electrical hum joining the drone. Organic cave sounds being gradually
> replaced by mechanical ones. Cold, precise, patient. Sparse, seamless
> loop, no drum kit — the machines ARE the percussion.

- Same stem contract; the clockwork ticking belongs in the **pulse** stem so
  the map stays quiet and combat brings the machines closer.

## 4. Boss theme — "The Wardens Below" (Collapser & Fogfather)

> Menacing slow-burn boss music at 77 BPM in A phrygian. The heartbeat
> becomes a war drum — deep taiko-like hits, sub-bass swells, grinding
> low strings, short aggressive phrases answered by silence. Claustrophobic
> and inevitable rather than fast or heroic. A 10-second rumbling intro
> swell, then a 2-minute seamless loop that stays threatening without
> exhausting the listener.

- Two mixes, same recording: **Collapser** = extra sub-bass and stone-rumble
  layer; **Fogfather** = the fog-wash pads from #2 layered over it. Deliver
  those two layers as stems and both mixes are free.

## 5. NN-99 (final boss)

> Final boss theme at 77 BPM: a broken machine playing a funeral march in
> A minor with wrong notes. Detuned and bitcrushed synth leads, stuttering
> clockwork percussion, alarms softened into musical tones, a melody that
> keeps almost resolving and glitching before it can. *(Reprise: quote the
> main theme motif, detuned a quarter-tone and played in a cold machine
> timbre.)* Grand, tragic, mechanical — a god-machine that has been counting
> alone in the dark. 15-second powering-up intro, then a 2–3 minute loop
> with two alternating intensities.

- The soundtrack's centerpiece and the one track that earns full melody.

## 6a. Victory stinger

> A short 12-second victorious resolution in A major arriving from A minor:
> *(reprise: the main theme motif)* rising once through struck bells,
> warm low brass-like synth, and a final open sustained chord that decays
> naturally into cave reverb and silence. Triumphant but weary — a survivor's
> victory, not a parade. Not a loop; a single gesture with a clean tail.

## 6b. Defeat stinger

> A short 10-second descending lament in A minor: three falling notes on a
> muted music box over a collapsing drone, ending on a low unresolved-but-
> settled tone that fades into dripping-cave silence. Somber but gentle —
> an ending that invites another attempt, never a punishment or a joke.
> Not a loop; a single gesture with a clean tail.

## 7. Camp — "A Candle's Worth of Safety"

> Warm, intimate rest music at 60 BPM in A minor with soft major-color
> moments. *(Reprise: the main theme motif slowed to half speed.)* Music box
> and plucked dulcimer over a distant soft drone, crackling-ember texture,
> tiny hopeful phrases with long gentle pauses. The one safe pool of light
> in a dark place. 90-second to 2-minute seamless loop, quiet enough to
> think over.

## 8. The Rat Merchant (shop)

> A sly, jaunty-but-hushed merchant theme at 90 BPM in A minor. Plucked
> pizzicato and a wheezy hurdy-gurdy-like drone, a tiptoeing bassline,
> sneaky grace notes, the occasional coin-like glockenspiel glint. Charming
> and slightly untrustworthy — a deal that is probably fine. Keeps the
> subterranean palette: dry, close, candlelit, no drum kit. 60–90 second
> seamless loop.

- The one track allowed personality over atmosphere; still no bright pop tone.

## 9. Finale reprise (finale cutscene + credits)

> A full arrangement of the main theme *(reprise: use the original as direct
> reference)* — beginning as the sparse waterlogged plucks of the crypt,
> gathering the fog pads, then the clockwork ticking, and finally opening
> into a complete, unhurried statement of the theme in A minor ending on a
> single sustained resolved chord. The whole descent remembered in ninety
> seconds. Not a loop: a beginning, a journey, and an ending.

- Structurally: quote #1 → #2 → #3 textures in order. If stems from those
  tracks exist, the composer can literally reuse them.

---

## Production notes (all tracks)

- Deliver loop-ready with sample-accurate loop points (used via Web Audio
  `loopStart`/`loopEnd`); stingers and #9 need clean tails instead.
- Loudness: beds ≈ −16 LUFS, bosses/stingers ≈ −14, so game sfx stay audible.
- Leave the low-mids uncluttered — the in-game generative drone (A1) and
  drip/bell ambience play underneath everything.
- AI generators rarely export true stems: either prompt the same track twice
  ("bed only" / "full") with the same seed where supported, or run a stem
  splitter afterward; verify the layers still sum cleanly.
