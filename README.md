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

A standalone 3D cricket game: your side against a **World XI**, as a T20 under floodlights (2, 5, 10 or 20 overs, coloured kits,
white ball) or a Test match in daylight (15, 30 or 90 overs, or until all
out; whites, red ball, white sightscreens, a slip cordon, bowlers in spells).
A coin toss decides who bats first: call it, and if you win, choose to bat
or bowl. When your side bats you play the shots; when it fields you bowl:
pick the line and length (arrow keys, or tap the pitch), the variation
(outswinger, inswinger, seam or slower ball; the spinners' stock ball, arm
ball and wrong'un) and the bowler, then stop the release meter in the gold.
The computer bats against you, reading the ball and the match situation.
When your side bats first, the World XI chase can instead be batted by a
friend on the same device or played out by the computer. The game gives
the result (won by runs or wickets, tie, or a draw in a timed Test). The
side is chosen on the start card: **Thudinest Coimbatore** (blue and gold;
a 13-player squad of Kavin, Harsha, Sabari, Thananjay, Vikrant Sahoo,
Vasanth, Pooja, Jay, Venkatesh, Govind, Sundarraj, Durai and Kumma),
**Team AMH** (green and orange; Pandi, Narayanan, Babu, Veera, Anantha,
Renault Prem, Senra, Karthik, Rams, Ganesh and Azeez) or **Ragging Bulls**
(black and red; a 17-player squad of Vedu, Narayanan K, Sriram, Appandraj, Bharath,
Praveen, Deepak, Sathya, Ravi, Bruce, Ananth, Saran, Akshay, Sairam, Siddhu,
Ishaq and Parthiban), each with its own commentary
lines and crowd chant; each side has at least four left-handers (marked LH),
who stand, swing and get bowled at as left-handers, with the field mirrored.
The arrow keys always point at the side of the field on that side of the
screen, so they swap for a left-hander and for the view from behind the
bowler. The start screen picks which 11 bat (the first 11 by
default, remembered per browser). Read the length from the marker on the pitch, pick a shot with the arrow
keys (or the on-screen pad on phones), S to sweep, and time the swing with Space.

- Five bowlers (three pace, two spin) with their own deliveries, a
  natural run-up, gather, delivery stride and follow-through
- Live two-voice commentary: a lead caller who calls each ball as it
  happens (run-up, the stroke, the result) and an analyst who follows up
  (players' names, six distances, streaks, milestones, wides and free hits).
  The voices are expressive British-English recordings rendered offline with
  the open [Chatterbox](https://github.com/resemble-ai/chatterbox) model
  (MIT), the excitement dialled up for the big moments, in two voices based on
  [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache-2.0); they
  ship as three small MP3 banks in `cricket/voice/` and the crowd ducks under
  them. Toggle with V. If the banks cannot load, the browser's speech engine
  reads the written commentary instead
- The home crowd's anthem: an original terrace song (the crowd sings the tune,
  chants "Thu-di-nest!" with three claps, a bass drum and a brass band),
  first after the second over and again every few overs, with a Mexican wave
  round the stands. A wicket hushes it; switch it off on the start card
- Test cricket that feels like a Test: in a full day (90 overs, or until
  all out) there are lunch, tea and stumps every 30 overs with the light
  turning golden through the evening session; the ball swings when new, goes
  soft and then reverses, and a new ball is taken every 80 overs; spinners
  get more turn as the pitch wears, bowlers lose pace late in a long spell,
  and the captain crowds a new batter with catchers (slips, gully, short leg)
  and spreads the field for a set one. Test fields keep the catchers behind
  the bat and leave the drives open, with at most one fielder in front. You can declare (tap Declare twice)
- Wides and front-foot no-balls with the umpire's signals, a free hit after a
  T20 no-ball (you can't be bowled or caught), byes when the keeper fumbles,
  and extras and bowling figures on the scorecard
- A small field map (fielders, batters and the ball from above) under the
  speed gun; tap it to shrink it to a dot
- Athletic players: broad shoulders, a V-shaped torso and muscular arms and legs
- A pause button (or P); pausing also stops the crowd and the commentary
- Every 25 runs the team makes (25, 50, 75, 100...) the cheerleaders dance
  for eight seconds, longer at 100; the next ball waits for them
- Milestones (25, 50, 100, 150 and 200): the batter turns to the dressing
  room and raises his bat, the crowd stands, a DJ beat starts and
  cheerleaders dance on stages branded with the home side's name, with
  the cameras cutting to him and then to the stage
- Replays of sixes and wickets: the whole delivery is recorded and shown again
  in slow motion from a side-on camera (a stump camera for bowled); tap to skip
- Crowd cheers for boundaries and wickets, mixed below the commentary
- Strokes with real footwork: the batter strides to the pitch of the ball
  (or goes back and across) while it is in the air, the bat comes down
  straight with the hands leading, and each shot has its own held finish.
  Sweep mode puts the batter down on one knee for the sweep, slog sweep,
  paddle, scoop, reverse sweep and reverse ramp; flicks off the pads, hooks
  and late cuts are named by the line and height of the ball.
  Tap an arrow twice for the finer angle: the flick and square drive off the
  front foot, the glance and late cut off the back foot (with lofted
  versions: lofted flick, inside-out over cover, hook behind square, upper
  cut over the slips). Leave the ball and the batter shoulders arms
- Defend mode (D or the DEFEND button) makes Swing play a defensive shot; a
  well-timed defence is never out, only a mistimed one can edge or miss
- Batter confidence: well-timed shots and boundaries build it (and good
  leaves in Tests), misses and edges dent it. A confident batter gets
  slightly wider timing windows and more power, so lofted shots clear the
  rope more often; the meter sits in the shot panel
- A T20 field (four in the ring, four on the rope, slip or short leg), fair
  catching (a clean, well-timed stroke along the ground can't be caught) and
  return throws that go into the keeper's gloves
- Fast loading on phones, with a real loading percentage: the engine
  download is measured in bytes, then every build step, texture and shader;
  shaders are built one at a time so the page never freezes on a number, and
  materials share shaders (9 on phones), which is what a first visit spends
  most of its time on. A stalled download retries from a CDN, and a stage
  that stops reporting offers a reload. Tapping Start early shows a progress
  card and starts the innings at 100%
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

**Changing a squad or adding a side** — edit `SQUADS` near the top of the
script in `cricket/index.html` (name, shirt number, skin tone, look) and the
side's entry in `HOME_TEAMS` (name, shirt text, kit colours, anthem file);
the start card builds its squad buttons from them. A new side also needs a
`data-team` button in the start card, and its players' commentary clips.

## Files

```
index.html      ← main site (landing page + game hub, all in one)
bazooka-man/    ← Bazooka Man game (standalone static page, own JS/CSS)
cricket/        ← Floodlit Over 3D cricket game (one page + voice/ commentary banks)
images/         ← add your property photos here
README.md       ← this file
```
