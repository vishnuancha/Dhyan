# Dhyan Web

The Dhyan brain-training and meditation app, rebuilt as a static website. Six games,
guided breathing sessions, habit tracking and progress stats — installable as a PWA and
fully offline after the first visit.

**Nothing on this site talks to a server.** There are no keys, tokens, trackers or
third-party scripts. Your name, results, habits and Zip progress live in your browser's
`localStorage` and never leave the device.

## Run it locally

The app is plain HTML, CSS and ES modules — there is no build step.

```bash
# from this folder
python3 -m http.server 8080
# then open http://localhost:8080
```

Opening `index.html` directly from the file system will **not** work: ES modules and the
service worker need an `http(s)` origin.

## Publish

The site is served straight from the repository root by GitHub Pages:

1. Push to `main`.
2. Repository → Settings → Pages → Source: `Deploy from a branch`, branch `main`, folder `/`.
3. The site appears at `https://<owner>.github.io/dhyan-web/`.

Every path in the app is relative, so it works from a project subpath without changes.

## Layout

```
index.html            app shell
manifest.webmanifest  PWA metadata
sw.js                 offline cache
css/                  design tokens, layout, components (ported from the app's theme)
js/core/              dates, XP maths, difficulty ramp, feedback, DOM helpers, icons
js/state/store.js     localStorage data layer (replaces Room + DataStore)
js/screens/           Games · Meditate · Habits · Stats · Settings
js/games/             game screens; zip/ holds the solver, generator and canvas board
js/data/              meditation library, sudoku puzzles, Zip campaign levels
audio/                six guided meditation tracks
```

Game rules, scoring formulas and on-screen copy are ported from the Android app
(`core/util/Scoring.kt`, `DifficultyProgression.kt`, `features/games/*`) so progression
matches the app: difficulty ramps from the number of distinct days you have played each
game.

The Zip daily board is generated from a date-seeded PRNG, so every visitor gets the same
puzzle on a given day.

## Adding a service worker note

`sw.js` precaches the shell and caches other assets on first use. Bump `CACHE`
(`dhyan-v1` → `dhyan-v2`) whenever you change cached files.
