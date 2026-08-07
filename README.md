# Thudi Nest No. 2 — Thudiyalur, Coimbatore

A landing page for **Thudi Nest No. 2**, a cozy container home on MTP Road, Poombuhar Nagar, Thudiyalur, Coimbatore — with a built-in game hub for guests.

## Live Site

Deployed via Netlify → add your Netlify URL here.

## What's Inside

- **Landing page** — Property details, photo gallery, amenities, house rules
- **Game Hub** — Indian Rummy, Chess (Hard AI), Ping Pong with power-ups, and
  14 more games including **Bazooka Man** (`/bazooka-man/`), a standalone
  physics-puzzle game — see below.

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
no build step, no dependencies. Aim a bazooka (click/tap-drag or keyboard),
blast crates, explosive barrels, glass panels and enemy bots across 10
levels, earn up to 3 stars per level. Progress and the mute setting are
saved in the browser via `localStorage`; there is no server or database.

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

## Files

```
index.html      ← main site (landing page + game hub, all in one)
bazooka-man/    ← Bazooka Man game (standalone static page, own JS/CSS)
images/         ← add your property photos here
README.md       ← this file
```
