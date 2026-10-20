# Thudi Nest No. 2 — Thudiyalur, Coimbatore

A landing page for **Thudi Nest No. 2**, a cozy container home on MTP Road, Poombuhar Nagar, Thudiyalur, Coimbatore — with a built-in game hub for guests.

## Live Site

Deployed via Netlify → add your Netlify URL here.

## What's Inside

- **Landing page** — Property details, photo gallery, amenities, house rules
- **Game Hub** — Indian Rummy, Chess (Hard AI), Ping Pong with power-ups, and
  14 more games including **Bazooka Man** (`/bazooka-man/`), a standalone
  physics-puzzle game, and **Floodlit Over** (`/cricket/`), a 3D cricket
  batting game — see below.

## Adding Property Photos

Upload your actual photos to the `images/` folder and name them:

| File | What it shows |
|------|--------------|
| `images/exterior.jpg` | Outside / front view of the container home |
| `images/bedroom.jpg` | Bedroom interior |
| `images/bathroom.jpg` | Bathroom interior |
| `images/living.jpg` | Living area / kitchenette |

The page uses beautiful gradient fallbacks until real photos are added.

## Deploy to Netlify

1. Push this repo to GitHub
2. Go to [netlify.com](https://netlify.com) → New site from Git
3. Connect your GitHub repo
4. Build command: *(leave blank)*  
5. Publish directory: `/` (or `Downloads/` if deploying a subfolder)
6. Click Deploy

## Bazooka Man (`/bazooka-man/`)

A standalone, original 2D physics-puzzle game — plain HTML/CSS/vanilla JS,
no build step, no dependencies. Aim a bazooka (click/tap-drag or keyboard)
and break through destructible brick walls, glass panels and explosive
barrels to take out the people holed up in 1- and 2-tier buildings across
10 levels, earning up to 3 stars per level. Progress and the mute setting
are saved in the browser via `localStorage`; there is no server or
database.

**Local development** — this game (and the rest of the site) is plain
static files, so any static file server works. From the repo root:

```bash
python3 -m http.server 8080
# then open http://localhost:8080/bazooka-man/
```

(Opening `bazooka-man/index.html` directly via `file://` also works, since
every asset reference inside `/bazooka-man/` is relative to that folder.)

**Deployment** — this whole repo *is* the GitHub Pages site for
thudinest.com (see the `CNAME` file at the repo root). There's no build
step: commit and push, and `/bazooka-man/` is live at
`https://thudinest.com/bazooka-man/` once Pages redeploys. A link to it was
added as a new game card in the Play hub's `.game-cards` list in the root
`index.html`.

**Adding more levels** — level data lives in `bazooka-man/js/levels.js` as
a single `LEVELS` array; push a new object with a unique `id` and a
`build()` function that returns the level's entities (see the comments at
the top of that file). Level count, the level-select grid, and saved
progress all size themselves off that array automatically.

## Floodlit Over (`/cricket/`)

A standalone 3D cricket batting game: **Thudinest Coimbatore** bat a
ten-wicket T20 innings (2, 5, 10 or 20 overs) under floodlights. The
13-player squad is Kavin, Harsha, Sabari, Thananjay, Vikrant Sahoo,
Vasanth, Pooja, Jay, Venkatesh, Govind, Sundarraj, Durai and Kumma; the
start screen picks which 11 bat (the first 11 by default, remembered per
browser). Read the length from the marker on the pitch, pick a shot with the arrow
keys (or the on-screen pad on phones) and time the swing with Space.

- Five bowlers (three pace, two spin) with their own deliveries, a
  natural run-up, gather, delivery stride and follow-through
- Ball-by-ball broadcast-style commentary on screen, spoken in a native
  English voice (British first, then Australian, Irish/NZ or US; Indian
  English voices are skipped) through the browser's speech engine (toggle
  with V), plus crowd cheers for boundaries and wickets
- A loading percentage on the Start button; tapping it early shows a
  progress card and starts the innings at 100%. Textures and shaders are
  prepared in small steps before the first frame, so phones don't freeze
- "Thudinest Sixer / Four / Wicket" pop-ups, Thudinest boundary boards
  and outfield logos, and a full scorecard with a wagon wheel at the end

It's a single file, `cricket/index.html`: plain HTML/CSS/JS with
[three.js r149](https://threejs.org) loaded from the jsDelivr CDN, so it
needs an internet connection the first time. Best scores are saved in the
browser via `localStorage`; there is no server or database.

**Local development** — from the repo root run
`python3 -m http.server 8080` and open `http://localhost:8080/cricket/`.

**Deployment** — commit and push; `/cricket/` is live at
`https://thudinest.com/cricket/` once Pages redeploys. It's linked from a
game card in the Play hub's `.game-cards` list in the root `index.html`.

**Changing the squad** — edit the `SQUAD` array near the top of the script
in `cricket/index.html` (name, shirt number, skin tone, look), and the
matching name buttons inside `#squadGrid` in the start card.

## Files

```
index.html      ← main site (landing page + game hub, all in one)
bazooka-man/    ← Bazooka Man game (standalone static page, own JS/CSS)
cricket/        ← Floodlit Over 3D cricket game (single self-contained page)
images/         ← add your property photos here
README.md       ← this file
```
