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

A standalone 3D cricket game: **Thudinest Coimbatore** against a **World
XI**, as a T20 under floodlights (2, 5, 10 or 20 overs, coloured kits,
white ball) or a Test match in daylight (15, 30 or 90 overs, or until all
out; whites, red ball, white sightscreens, a slip cordon, bowlers in spells).
Thudinest Coimbatore bat first; then the World XI chase, either batted by a
player (pass the device to a friend) or by the computer, and the game gives
the result (won by runs or wickets, tie, or a draw in a timed Test). The
13-player squad is Kavin, Harsha, Sabari, Thananjay, Vikrant Sahoo,
Vasanth, Pooja, Jay, Venkatesh, Govind, Sundarraj, Durai and Kumma; the
start screen picks which 11 bat (the first 11 by default, remembered per
browser). Read the length from the marker on the pitch, pick a shot with the arrow
keys (or the on-screen pad on phones) and time the swing with Space.

- Five bowlers (three pace, two spin) with their own deliveries, a
  natural run-up, gather, delivery stride and follow-through
- Live two-voice commentary: a lead caller who calls each ball as it
  happens (run-up, the stroke, the result) and an analyst who follows up
  (players' names, six distances, streaks, milestones). The voices are
  natural British-English recordings rendered offline with the open
  [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) model (Apache-2.0)
  and shipped as three small MP3 banks in `cricket/voice/`; the crowd ducks
  under them. Toggle with V. If the banks cannot load, the browser's speech
  engine reads the written commentary instead
- Crowd cheers for boundaries and wickets, mixed below the commentary
- Strokes with real footwork: the batter strides to the pitch of the ball
  (or goes back and across) while it is in the air, the bat comes down
  straight with the hands leading, and each shot has its own held finish
- Defend mode (D or the DEFEND button) makes Swing play a defensive shot; a
  well-timed defence is never out, only a mistimed one can edge or miss
- Batter confidence: well-timed shots and boundaries build it (and good
  leaves in Tests), misses and edges dent it. A confident batter gets
  slightly wider timing windows and more power, so lofted shots clear the
  rope more often; the meter sits in the shot panel
- A T20 field (four in the ring, four on the rope, slip or short leg), fair
  catching (a clean, well-timed stroke along the ground can't be caught) and
  return throws that go into the keeper's gloves
- Fast loading on phones: the start screen and loading percentage paint
  first, the engine downloads in parallel (preloaded) and the stadium is
  built in steps; shaders and textures are prepared before the first frame,
  and phones get a lighter render profile (1.5x resolution, standard cloth
  materials, smaller shadow map). Tapping Start early shows a progress card
  and starts the innings at 100%
- "Thudinest Sixer / Four / Wicket" pop-ups, Thudinest boundary boards
  and outfield logos, and a full scorecard with a wagon wheel at the end

It's one page, `cricket/index.html`, plus the voice banks in `cricket/voice/`
and [three.js r149](https://threejs.org) (`cricket/three.min.js`, MIT, served
from this site): plain HTML/CSS/JS. Best scores are saved in the
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
cricket/        ← Floodlit Over 3D cricket game (one page + voice/ commentary banks)
images/         ← add your property photos here
README.md       ← this file
```
