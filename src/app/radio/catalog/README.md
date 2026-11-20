# Radio catalog and rotation

Audio files live in `public/audio/<folder>/`. The station scans all folders into
one shared pool; it no longer plays whole folders as blocks. Registered catalogs
in [index.js](index.js) add display metadata and related-track groups. Older audio
without a catalog entry is still discovered and receives the default weight.

The first 27 additions are in [2026.json](2026.json). Later additions are in
[development.json](development.json), whose year remains unset until confirmed.
The `mynameisjohn_continuation3.wav` export is stored as
`cc3_10_mynameisjohn_continuation3.mp3` and grouped with the other Captains Chair
tracks. `sourceFile` preserves its original name for later lookup.

The ten single episodes of Captains Chair season 2 are in [cc2.json](cc2.json)
(folder `cc2`). Their titles are provisional, their year is unset, and each links
to the season's YouTube playlist until it gets its own episode video
(`videoStatus: "unreviewed"`). The whole season as one piece is the older
`CCFiles/the_clusterfuck.mp3`; see "Cooldowns" below for how the two are kept
apart.

## Adjusting frequency

Edit [radio-rotation.json](../../../../radio-rotation.json) and restart the server.
All frequency settings live there, separately from listener-facing metadata.

| setting / track | starting value | meaning |
| --- | --- | --- |
| `defaultWeight` | `1` | weight for every file without an override |
| netrunner 2 / netrunner 4 | `0.1` each | rare |
| captains chair s2 (`CCFiles/the_clusterfuck.mp3`) | `0.02` | very rare |
| infinite polo (`PoloFiles/ip_1.mp3`) | `0.005` | especially rare |
| `repeatGap` | `12` | prefer twelve other songs before repeating a file |
| `relatedTrackGap` | `2` | prefer two other songs between related tracks |
| `cooldowns` | captains chair s2: 3h / 20min | see "Cooldowns" below |

A weight is the number of tickets a song gets **when eligible**, not a percentage
of the station or a promised interval. An eligible `0.1` song has one tenth the
odds of an eligible `1` song in that draw. Use `0` to disable a track. To override
another track, add its exact, case-sensitive `folder/filename.mp3` key under
`tracks`, for example:

```json
"development/hammeron_billie.mp3": { "weight": 0.5 }
```

Weights affect how often a song **starts**, not its playback speed, duration, or
volume. Long songs still play in full, which is why the two long compilations
have especially low weights. This is weighted random selection, so there is no
longer a guarantee that every song plays once before any song repeats.

History is shared across all folders. `rotationGroup` identifies related songs;
all Captains Chair season 3 tracks currently share a group, which also keeps
cc3_10, cc3_15, cc3_16, and cc3_23 variants apart. The netrunner tracks share their
own group. In a small or heavily restricted library, file-repeat spacing relaxes
first, then group spacing if necessary. A disabled or ineligible song is never
used as a fallback. Selection history and an unplayed reservation reset on a
server restart; weights remain in the config file.

## Cooldowns

Some songs contain others: `CCFiles/the_clusterfuck.mp3` is all of Captains Chair
season 2 in one piece, and `cc2/` holds the same episodes one at a time. A
`cooldowns` entry in [radio-rotation.json](../../../../radio-rotation.json) keeps
them from crowding each other. Each entry is one-way:

```json
{ "after": "captains-chair-s2-full", "wait": "captains-chair-s2", "hours": 3 },
{ "after": "captains-chair-s2", "wait": "captains-chair-s2-full", "minutes": 20 }
```

reads: after the full season starts, no single episode starts for 3 hours; after
an episode starts, the full season waits 20 minutes. `after` and `wait` are
`rotationGroup` names (the full season gets its group from its entry under
`tracks`). Give either `hours` or `minutes`. Episodes don't block each other this
way; `relatedTrackGap` spaces them as usual.

The two directions differ on purpose. Ten episodes at normal weight start about
every 27 minutes, so a long wait after *every* episode would almost never let the
full season play: simulated over 90 days, a 3-hour wait both ways played it zero
times, while 3 hours / 20 minutes keeps it at about 0.11 plays a day (0.13 before
the episodes were added). Like the spacing rules, a cooldown only relaxes if
nothing else could play. Cooldown history resets on a server restart, like the
rest of the selection history.

## Room for schedules

No time-based schedules are active. `timeZone` is explicitly `America/Phoenix`,
independent of the VM's local timezone. `RadioRotation` in
[radio-playlist.js](../../../../radio-playlist.js) accepts an `isEligible(track,
{ at, timeZone })` policy before applying weights. `at` is an epoch timestamp in
milliseconds, supplied by the server clock. A future overnight-only rule can
exclude infinite polo in this policy without changing playback or weighted draws.

The advance selection uses the intended **next track's start time**, rather than
the time of the five-second warning. A selected song stays reserved through the
transition, and only a successfully started song enters history. There are no
cron jobs, host-local date strings, or per-song timers in the selection layer.
Tests inject the clock, randomness, and eligibility policy. Future schedule work
should define local-time windows, daylight-saving behavior, and what happens
when no song is eligible; it should also decide whether history must persist
across restarts. The policy hook alone does not implement these scheduling rules.

## Track information

Find the original export using `sourceFile`, then edit:

- `displayName`: the title listeners see. Initial titles are provisional.
- `description`: the story behind this track. Empty descriptions show the
  collection's fallback: "made in the bowels of development."
- `youtubeLink`: the associated video URL; leave empty to hide it.
- `youtubeChannel` (optional): a collaborator's channel, shown separately as
  "collaborator’s youtube channel". This does not imply a making-of video exists.
- `videoStatus`: `unreviewed`, `linked`, or `none`. This private editorial note is
  not displayed and does not control whether a filled-in link appears.
- `rotationGroup` (optional): a shared identifier for related songs, such as
  `love-is-blue`, `yuey-n-me`, or `captains-chair-s3`.

Keep `file` unchanged unless you also rename the audio. A collection's `year`
applies to all its tracks; `null` hides the year instead of guessing it.
Descriptions, video URLs, and channel URLs can be filled in independently.

WAV exports have 320 kbps MP3 streaming copies at their original sample rate;
supplied MP3s are copied without re-encoding. Original exports are untouched.
Audio is gitignored and must be synced with `npm run media:push` before deploying
catalog changes. A server restart discovers new files and reloads rotation
settings. Metadata-only changes use the normal site build/deploy.
