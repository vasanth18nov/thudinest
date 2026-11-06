# Thudi Nest No. 2 — Thudiyalur, Coimbatore

A landing page for **Thudi Nest No. 2**, a cozy container home on MTP Road, Poombuhar Nagar, Thudiyalur, Coimbatore — with a built-in game hub for guests.

## Live Site

Deployed via Netlify → add your Netlify URL here.

## What's Inside

- **Landing page** — Property details, photo gallery, amenities, house rules
- **Game Hub** — Indian Rummy, Chess (Hard AI), Ping Pong with power-ups, and
  14 more games including **Bazooka Man** (`/bazooka-man/`), a standalone
  physics-puzzle game, and **Floodlit Over** (`/cricket/`), a 3D cricket
  batting game, **Guest Rush** (`/guest-rush/`), a 3D homestay game, and
  **Rally Point** (`/bm/`), a 3D badminton game, and **Final Whistle**
  (`/football/`), a 3D football game — see below.

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
Auto play (the Auto button, or A) hands your job to the computer, batting
or bowling, until you tap it again to take over.
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

**Realistic players** — every player, on every side, is one of eleven
realistic Mixamo characters (no fantasy or cartoon ones), used exactly as
downloaded (no kit, pads, helmet or gloves): Ch01, Pete, Josh, Adam, Steve,
Ch42, James, Remy, the footballer, the SWAT officer and the racing driver.
Each side shuffles them once per page load and deals one to each player of
its XI, so no two players in a team look alike (the same character can turn
out for both sides). Both umpires are The Boss. Claire, with pom-poms, is the
cheerleader on all four stages, dancing Mixamo's Salsa Dancing (she never
plays; `DANCERS` in `buildBodies`). The models
are `cricket/players/*.glb` (about 20 MB in all; `gltf.js` is three.js r149's
GLTFLoader as a plain script). The drawn rigs still do all the posing; each
frame a model copies its rig's joints, with IK putting the hands on the bat
or ball and the feet on the ground, and on the bat the thumbs wrap the
handle. The keeper is always someone bareheaded (Ch01, Josh, Adam, Ch42, Remy
or the footballer), so no hat or hood hides where the ball pitches. The models play
Mixamo clips where one fits (`cricket/players/moves.json`, built from the
downloads by `~/thudinest-assets/tools/build-clips.mjs`): the keeper's takes
(Goalkeeper Catch, Football Catch for a bouncer, Goalkeeper Diving Save, a
Goalkeeper Sidestep first for one a little wide); the fielders' stops, dives
and catches (Goalkeeper Catch, Football Catch, Receiver Catch for a skier),
the Goalkeeper Overhand Throw back, Running, Breathing Idle and a Victory
Idle after a catch; and for the batter, Golf Chip turning his body through a
lofted drive (his arms stay on the bat, the impact on the contact), Golf Putt
Failure's frustrated straighten-up after a swing and a miss, and Silly
Dancing, bat in hand, for a milestone (from 50 the cheerleaders dance too; a
25 is his dance alone). Takes and catches are timed so the catch comes as the ball
arrives and steered so the hands meet it.

**Grounds** — the start card picks the stadium (stands, floodlights,
cheerleaders) or the gully ground: a dusty neighbourhood maidan with a mud
pitch, a whitewashed compound wall with painted ads and kids sitting on it,
houses with water tanks, coconut palms, electric poles and a temple tower,
in afternoon light, played with a red tape ball that shows against the dust.
The field is the same size, so the game plays the same.
The choice is remembered (`floodlit.venue`).

On a phone-sized screen the cameras close in (a tighter lens, the batsman
camera nearer, aimed so the bowler's end clears the scorecard; `PHONE_CAM`,
separate for portrait and landscape) and the ball is drawn a quarter bigger,
so the players read at that size. Gameplay is unchanged.

Add `?classic` to the address to play with the drawn players only;
the game also falls back to them if the models fail to load. The Mixamo
downloads and the build scripts live outside the repo, in
`~/thudinest-assets/`.

**Changing a squad or adding a side** — edit `SQUADS` near the top of the
script in `cricket/index.html` (name, shirt number, skin tone, look) and the
side's entry in `HOME_TEAMS` (name, shirt text, kit colours, anthem file);
the start card builds its squad buttons from them. A new side also needs a
`data-team` button in the start card, and its players' commentary clips.

## Guest Rush (`/guest-rush/`)

A single-file 3D game (`guest-rush/index.html`, no build step). You are the
host of a tropical homestay at sunset. Guests arrive at the gate one at a
time with a request: carry their bags from the car up to their room, find a
lost phone charger in the house, water the droopy plants with the hose,
fetch a cold drink from the kitchen fridge, or guide a lost friend back to
the gate. Each job scores points (more for speed and streaks) and a host
tip; timers shrink as the evening goes on, and three missed guests end it.

Controls: WASD / arrows to move (Shift walks), Space to pick up or drop,
E to interact, C for follow / top-down camera, M to mute, P or Esc to pause.
On phones: a joystick on the left half, and Interact / Camera buttons.

Three.js r170 and its add-ons load from jsDelivr. The characters are the
Ready Player Me and Michelle glTF models from the three.js examples,
re-dressed at load time (batik shirts, pelekat sarongs, songkok, tudung).
Their idle, walk, run, carry, pick-up and wave clips are baked for the rig by
a small pose solver, so any Mixamo-style humanoid works: change `MODEL_URL`
(and optionally `MODEL_URL_ALT`) at the top of the script. If a model fails
to load, a simple placeholder is used and a warning is logged. Textures are
painted procedurally except the hardwood, water normals and the sunset HDR
environment, which come from the three.js examples on jsDelivr. Sound is all
Web Audio synthesis. `?debug` exposes `window.__gr` for test bots.

## Rally Point (`/bm/`)

3D singles badminton at the "Thudinest Open": you against the computer at
three levels (Club, National, World Tour), a quick game to 11, one game to
21 or best of three, with rally scoring, service courts, intervals, game and
match point, and the chair umpire's calls. Watch it in the **broadcast** view
(high behind your baseline, as on television) or the **side** view
(courtside at the net), and switch at any time.

Controls: three shots, each meaning what fits the shuttle's height. **Clear**
(J) goes high and deep, or lifts from low down. **Drop** (K) plays short, or
a net shot near the net. **Smash** (L) hits down from overhead, or drives,
pushes or kills lower down. Press just before the shuttle arrives; the ring
under your feet (and the buttons on a phone) light up for a Perfect. With
auto-run on, your player runs to the shuttle and the stick or WASD aims;
with it off, the stick moves you. C switches the camera, P pauses. Touch
screens get a floating stick and three buttons. A gamepad works too.

How it works:

- `bm/js/sim.js` is the game with no graphics: the shuttle flies with real
  quadratic drag (terminal speed 6.8 m/s, so clears hang and smashes die), a
  solver aims every shot to land where it was meant to, players plan where
  to meet the shuttle, the computer picks shots and makes mistakes by level,
  and BWF rules keep the score. It runs in Node for test matches.
- `bm/js/game.js` draws and films it with three.js r170 (bundled into
  `bm/vendor/three.js`, served from the site, no CDN). The players are the
  sporty Mixamo characters from the cricket game (`bm/players/*.glb`, copies,
  so the two games don't depend on each other) and Josh umpires in his
  blazer. Footwork comes from the cricket game's motion-capture clips
  (`bm/players/moves.json`: idle, run, sidestep, cheer, miss, dive); the
  strokes are drawn on top with two-bone IK so the racket's strings meet the
  shuttle at the contact. Smash winners and long rallies get slow-motion
  replays, and close line calls get a shuttle review. Sound is synthesised
  with Web Audio; the umpire speaks through the device's speech voices.
- `bm/players/faces/*.jpg` are the menu portraits (`?faces` renders them
  again from the models). `?debug` exposes `window.__bm` for test bots.

Build tools and the headless tests (Playwright on the Mac's GPU, and Node
match simulations) are in `~/thudinest-assets/bm/`.

## Final Whistle (`/football/`)

A standalone 3D football game on a full-size 105 x 68 m pitch under the floodlights. The menu offers four modes:

- **Quick match**: your saved side against a random opponent, medium difficulty, 2½-minute halves
- **Player vs AI**: pick both sides (Thudinest Coimbatore, Team AMH, Ragging Bulls, World XI, the sides and names
  from Floodlit Over), the difficulty (easy, medium, hard), the half length (2, 3, 5 or 7½ minutes, shown as two
  45-minute halves) and the team size (11 a side, or 7 a side, the default on phones)
- **Penalty shootout**: five each at the same goal, then sudden death; you take your side's kicks and keep goal
  for theirs (push a side as he runs up to choose your dive)
- **Practice**: you and a striker partner against two defenders and a keeper; the ball resets after a goal or when
  it goes out (R for a new ball)

Controls. Keyboard: WASD or arrows move (as the camera sees it), Shift sprints, Space held and released shoots (the
longer, the harder; push a side to pick a corner, a weak shot is placed and curled), J passes to the teammate you push
toward (without the ball it switches player), K plays a through ball into space, L tackles (sprinting or from further
away, a slide; on the ball, a cross), E switches to the player nearest the ball, C changes the camera, Esc or P
pauses. Touch: a floating stick on the left half of the screen and Shoot (hold), Pass / Switch, Thru, Sprint (hold)
and Tackle / Cross buttons, their labels following the play. A restart (kick-off, throw-in, corner, goal kick, free
kick, penalty) waits for your button; the hint at the top says which.

The match. Every player is the footballer from the cricket game (`cricket/players/footballer.glb`, the rigged Mixamo
Ch38 character, converted from its FBX), wearing his team's kit: his white kit is recoloured texel by texel by
garment, the shirt, shorts and socks found from the mesh's own skin weights (`js/kit.js`), so skin, face, hair and
boots stay as they are. He plays the Mixamo clips in `cricket/players/moves.json` (Running, Breathing Idle, the
sidestep for moving across or backward, Goalkeeper Diving Save, catches and the overhand throw, a victory cheer for a
goal, Silly Dancing for the winners at full time and a frustrated straighten-up for the losers), blended by speed
with the run's rate matched to his pace; kicks, passes, slide and standing tackles, headers and the keeper's ready
crouch are laid over the clips on the same skeleton (`js/rig.js`, after Rally Point's retargeting). The ball
(`js/ball.js`) has drag, spin and the Magnus force (struck shots curl and dip), bounces that lose pace on the grass,
rolling resistance, posts and a crossbar it rebounds from, and nets that catch it and bulge. Passes and shots are
solved against that physics (`js/kicks.js`), so a pass arrives at the feet it was meant for. The laws: kick-offs,
goals, throw-ins, corners, goal kicks, fouls from a mistimed tackle (a free kick, or a penalty in the box), two halves
with the ends changed, and stats (possession, shots, on target, passes, tackles, corners, fouls).

The AI (`js/ai.js`): each side holds a 4-3-3 (or a 2-3-1 at seven a side) that shifts with the ball; the player
who gets to a loose ball first chases it; the nearest defender presses goal-side of the man on the ball and tackles
when it is there to win, the next covers; in possession two teammates offer angles and the forwards run in behind.
On the ball a player weighs a shot, every pass (progress, how open the receiver is, the lane), a through ball for a
runner who gets there first, a cross from wide, a clearance under pressure, or a dribble into space. The keeper
narrows the angle, reads where a shot will cross the line, steps or dives (the save's chance falls with the pace of
the shot), comes off his line one on one, claims loose balls in his box and gives the ball back out, thrown short or
kicked long. Difficulty changes reaction times, tackling, accuracy, the keepers and the pace.

Cameras: the broadcast view from the near touchline (default; closer in on a phone), a view from behind the play
(C), one behind the penalty taker, and a slow orbit round the scorer after a goal. The ground: mown stripes and FIFA
markings, goals with nets, corner flags, scrolling LED boards, four stands with an instanced crowd that jumps for a
goal, floodlight towers and a dusk sky (`js/stadium.js`). The crowd sounds are Rally Point's recordings
(`bm/sfx`, CC0); the kicks, the referee's whistle, the woodwork and the net are synthesised (`js/audio.js`).

Files: `football/index.html` (HUD, menus, styles), `football/js/main.js` (boot, menus, loop, drawing),
`sim.js` (the match), `ai.js`, `rig.js`, `kit.js`, `ball.js`, `kicks.js`, `stadium.js`, `camera.js`, `input.js`,
`audio.js`. It uses the three.js r170 bundle from Rally Point (`bm/vendor/three.js`) and the cricket game's player
model and clips, so it adds no new 3D assets. Add `?lite` for the lighter renderer (no bloom, a smaller crowd and
shadow map; automatic on phones), `?play=quick`, `?play=shootout` or `?play=practice` to skip the menu, and `?debug`
for `window.__fw` (the match, `shot(n, camera)` to step and draw a moment, `perf()` for the cost of a frame).

**Changing a squad** — edit `TEAMS` at the top of `football/js/main.js` (name, short name, colours, kit and
keeper's kit, and the XI in order: keeper, four defenders, three midfielders, three forwards).

## Files

```
index.html      ← main site (landing page + game hub, all in one)
bazooka-man/    ← Bazooka Man game (standalone static page, own JS/CSS)
cricket/        ← Floodlit Over 3D cricket game (one page + voice/ commentary banks + players/ model)
guest-rush/     ← Guest Rush 3D homestay game (one self-contained page)
bm/             ← Rally Point 3D badminton (page, js/sim.js + js/game.js, vendor/three.js, players/)
images/         ← add your property photos here
README.md       ← this file
```
