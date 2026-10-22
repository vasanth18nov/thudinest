# CricketHub

A mobile-first web app for running cricket clubs: teams and squads, fixtures with availability
RSVPs and playing XIs, scorecards with career stats, and tournaments with auto-drawn fixtures,
a live points table with net run rate, and a knockout bracket.

**Live:** https://thudinest.com/crickethub/ (served from the `crickethub/` folder of this repo;
the separate Floodlit Over game stays at `/cricket/`).

- React 19 + TypeScript + Vite 8, Tailwind CSS 4, React Router 8
- Firebase Authentication (Google only) and Cloud Firestore — works on the free Spark plan
- Installable PWA with offline support; light and dark themes

---

## Contents

1. [Quick start: try it with demo data](#quick-start-try-it-with-demo-data)
2. [Firebase setup](#firebase-setup)
3. [Run, test and build](#run-test-and-build)
4. [Deploy to thudinest.com](#deploy-to-thudinestcom)
5. [Features](#features)
6. [Roles and permissions](#roles-and-permissions)
7. [Data model](#data-model)
8. [Project structure](#project-structure)
9. [Optional extras](#optional-extras): email notifications, link previews, seeding a real project
10. [Troubleshooting](#troubleshooting)

---

## Quick start: try it with demo data

Needs Node 22.22+ and Java 21+ (for the Firebase emulators). No Firebase project needed.

```bash
cd cricket_app
npm install
npm run dev:demo
```

This starts local Auth and Firestore emulators, seeds demo players, two teams, fixtures with
RSVPs and scorecards, a league (*Sunday League 2026*) and a knockout cup (*Floodlit Knockout Cup*),
then serves the app at **http://localhost:5173/crickethub/**.

On the sign-in page, tap any **demo player** to sign in without Google, or create a brand-new
test player to try onboarding, invitations and joining from a second browser window.
The emulator dashboard is at http://localhost:4005. Data resets each time you restart.

---

## Firebase setup

1. **Create a project** at https://console.firebase.google.com (the free Spark plan is enough).
2. **Add a web app:** Project settings → General → *Your apps* → Web (`</>`). Copy the config values.
3. **Enable Google sign-in:** Authentication → Sign-in method → **Google** → Enable → set a support email → Save.
4. **Authorise your domains:** Authentication → Settings → **Authorized domains** → add
   `thudinest.com` (and `www.thudinest.com` if you use it). `localhost` is there by default.
5. **Create Firestore:** Firestore Database → Create database → *Production mode* → pick a region close to your players.
6. **Configure the app:**
   ```bash
   cp .env.example .env    # then paste the values from step 2
   ```
7. **Deploy the security rules and indexes** (one-off, and again whenever they change):
   ```bash
   npx firebase login
   cp .firebaserc.example .firebaserc   # put your project id in it
   npm run deploy:rules
   ```
   Composite indexes take a few minutes to build. Until they finish, some lists show
   an error state.

> The Firebase web config in `.env` is not secret — it identifies the project, and every read and
> write is checked by `firestore.rules`. Admin credentials (service-account keys) are only ever used
> by the seed script on your own machine and are git-ignored.

---

## Run, test and build

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server against the project in `.env` → http://localhost:5173/crickethub/ |
| `npm run dev:demo` | Emulators + demo data + dev server (no Firebase project needed) |
| `npm test` | Unit tests: points table, NRR, fixture generation, stats, CSV (Vitest) |
| `npm run test:rules` | Security-rules tests against the Firestore emulator |
| `npm run typecheck` | TypeScript checks for the app, scripts and tests |
| `npm run build` | Type check + production build into `dist/` with base path `/crickethub/` |
| `npm run preview` | Serve the production build locally |
| `npm run seed` | Seed demo data into running emulators (see *Seeding a real project* below) |
| `npm run deploy` | Build and copy into the site folder (see below) |
| `npm run deploy:rules` | Deploy `firestore.rules` and `firestore.indexes.json` |

The base path comes from `VITE_BASE_PATH` (default `/crickethub/`). Vite, the router, the PWA
manifest and the deploy script all read it, so changing it in `.env` moves the whole app.

---

## Deploy to thudinest.com

thudinest.com is GitHub Pages serving this repository's `main` branch. CricketHub's source lives in
`cricket_app/`; the built site is copied into `crickethub/` next to the other site folders.

```bash
cd cricket_app
npm run deploy
```

The script:

1. Checks `.env` (and that emulator mode is off), runs the unit tests, type check and build.
2. Copies `dist/` into `../crickethub/`. It **refuses to write into any existing folder it did
   not create**, so `/cricket/` and the homestay pages can't be overwritten.
3. Adds a site-wide `404.html` that redirects deep links (e.g. `/crickethub/teams/abc`) into
   the app, because GitHub Pages has no single-page-app fallback. Other unknown URLs get a plain
   "page not found". If the site ever gets its own `404.html`, the script leaves it alone and
   tells you what to add.
4. Prints the git commands. It never commits or pushes: review the changes in VS Code, then from
   the repo root:

```bash
git add crickethub 404.html cricket_app
git commit -m "CricketHub: deploy"
git push
```

GitHub Pages rebuilds in about a minute. Nothing outside `crickethub/`, `cricket_app/` and
`404.html` is touched.

---

## Features

**Players**
- Google sign-in; first login asks for name, batting style, bowling style, primary role and shirt number (photo comes from Google).
- Profile and player pages with career batting and bowling stats, recent matches and teams.

**Teams**
- Create a team with a name, short name, home ground, colours and an uploaded logo (resized in the browser; otherwise an initials shield in the team colours).
- Add players three ways: a shareable **join link** (resettable), **search** by name or exact email, or **invite by email** (waits in their inbox until they sign in with that address; optionally emailed).
- Invitations are accepted or declined from the **Inbox**.
- Roles: owner, admin, captain, vice-captain, player. Change roles, remove players, leave a team, hand over ownership, delete the team.
- Squad page with player cards and each player's matches, runs and wickets for the team; W/L/T/NR record; activity log.

**Fixtures**
- Date, time, venue, overs, match type (T20 / ODI / custom), notes; opponent is a team on CricketHub or any typed name; home or away.
- List view (upcoming / past / all) and month calendar view; export to CSV; printable sheet; add to phone calendar (.ics).
- **Availability RSVP** (available / maybe / unavailable) with a captain's summary, a "who said what" breakdown and one-tap reminders to non-responders.
- The captain picks the **playing XI**, sorted by availability; selected players are notified.
- Edit or cancel with a reason that players see; reinstate.

**Results and stats**
- Innings totals with automatic winner and margin ("by 23 runs" / "by 6 wickets (8 balls left)"), tie, no result or walkover; super-over / tie-break winner for knockouts; player of the match.
- Optional full scorecard: runs, balls, 4s, 6s, not out; overs, maidens, runs, wickets. Squad members autocomplete so figures count towards their careers.
- Career stats calculated automatically: matches, runs, average, strike rate, highest score, 50s/100s, wickets, economy, bowling average, best figures.
- **Undo last result entry**: restores the previous version, or clears the result. Stats, tables and knockout progression roll back with it.

**Tournaments**
- Any signed-in player can create one: name, dates, format, overs, max teams, entry rules, venue, points per result.
- Formats: **league** (single or double round robin), **knockout** (top seeds get byes), **groups then knockout** (snake-drafted groups; group winners meet other groups' runners-up).
- Add teams from CricketHub or as external teams, order the seeding, then **generate fixtures** in seed order or **shuffled**, with configurable dates. Regenerate any time before results are in.
- **Live points table** with P/W/L/T/NR/Pts/**NRR** and recent form; qualification line for groups; CSV export; print view.
- **Bracket** view; knockout winners move into the next round automatically.
- Co-admins (chosen by the owner) can edit fixtures and enter results.
- **Public page:** anyone with the link sees fixtures, table, bracket, teams, rules and activity without signing in.

**Everywhere**
- Public, shareable team, fixture and tournament pages (native share sheet on phones).
- In-app notifications for new, changed or cancelled fixtures, reminders, XI selection and results, with optional email copies.
- Search across players, teams and tournaments.
- Offline: the last loaded fixtures, tables and teams stay available (Firestore's IndexedDB cache plus a service worker for the app shell), with an offline banner.
- Installable PWA (Add to Home Screen). Light, dark and system themes.
- Accessible: skip link, keyboard-navigable tabs and segmented controls (arrow keys), labelled form fields with inline errors, live-region toasts, visible focus rings, reduced-motion support, and AA-contrast colours in both themes.

### How the points table works

`src/lib/pointsTable.ts`, unit-tested in `pointsTable.test.ts`:

- NRR = (total runs scored ÷ total overs faced) − (total runs conceded ÷ total overs bowled), aggregated across the tournament, not averaged per match.
- A side bowled out counts as having faced its full quota of overs.
- No-result matches give points but don't count towards NRR. Ties do count. Results entered without scores (walkovers) give points only.
- Ranking: points, then NRR, then wins, then name.

---

## Roles and permissions

| Action | Owner | Admin | Captain / vice | Player | Signed-in visitor | Anyone |
| --- | :-: | :-: | :-: | :-: | :-: | :-: |
| View team, fixtures, results, tournaments | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit team details, invite, change roles, remove players | ✓ | ✓ | | | | |
| Hand over ownership, delete team | ✓ | | | | | |
| Create/edit/cancel team fixtures, pick XI, enter results, send reminders | ✓ | ✓ | ✓ | | | |
| RSVP, view squad availability and activity | ✓ | ✓ | ✓ | ✓ | | |
| Create a tournament | ✓ | ✓ | ✓ | ✓ | ✓ | |

Tournaments: the owner and co-admins edit fixtures and enter results; only the owner changes
the co-admin list or deletes the tournament.

All of this is enforced in `firestore.rules`, not just hidden in the UI. Every write is also
shape-checked (allowed fields, types, lengths). The checks mirror the client-side zod schemas in
`src/lib/validation.ts`. Notification links must be in-app paths, and the email queue only
accepts template emails tied to a real invitation or notification. `tests/rules/` covers each
role.

---

## Data model

| Collection | Document | Notes |
| --- | --- | --- |
| `users/{uid}` | Public profile: name, photo, styles, role, shirt number, search tokens | Readable by signed-in users |
| `userPrivate/{uid}` | Email address | Owner only (and the email extension) |
| `userEmails/{email}` | `{ uid }` | Exact-email lookup; get only, never listed |
| `teams/{teamId}` | Name, short name, logo (data URL ≤150 KB), ground, colours, owner | Public |
| `teams/{id}/private/invite` | Join-link code | Admins only |
| `teams/{id}/activity/{id}` | Activity log | Members only |
| `teamMembers/{teamId}_{uid}` | Role plus roster copies of name/photo/shirt | Public roster |
| `invitations/{id}` | Team, inviter, invitee uid **or** email, status | Invitee, inviter, team admins |
| `fixtures/{id}` | Sides, `teamIds`, time, venue, overs, type, status, cancel reason, tournament `stage`, result summary | Public |
| `fixtures/{id}/lineups/{teamId}` | Playing XI | Public |
| `availability/{fixtureId}_{uid}` | RSVP status | Team members |
| `matchResults/{fixtureId}` | Winner, margin, innings, scorecard, player of the match, revision | Public |
| `matchResults/{id}/history/{rev}` | Earlier versions, for undo | Organisers |
| `playerStats/{fixtureId}_{uid}` | One player's figures in one match | Public; careers are summed from these |
| `tournaments/{id}` | Settings, format, points rules, owner, `adminUids`, status | Public |
| `tournaments/{id}/activity/{id}` | Activity log | Public |
| `tournamentTeams/{id}` | Entry: in-app `teamId` or external name, colour, group, seed | Public |
| `notifications/{id}` | Recipient, type, title, body, in-app link, read flag | Recipient only |
| `mail/{id}` | Email queue for the Trigger Email extension | Write-only, template-based |

Design notes:
- **Career stats are never stored as running totals.** Each result writes one `playerStats`
  line per player, in the same atomic batch as the result. Careers, team records and points tables
  are calculated on read. Corrections and undo are therefore exact, and the rules can tie every
  stat line to a fixture its writer is allowed to manage.
- **Search** uses lower-cased word prefixes (`searchTokens`) with `array-contains`, which is free and
  needs no search service.
- **Logos** are stored inline on the team document, so the app needs no Cloud Storage. Cloud
  Storage now requires the paid Blaze plan for new projects.
- Indexes for every query are in `firestore.indexes.json`. Large fields (logos, scorecards, notes)
  are excluded from indexing.

---

## Project structure

```
cricket_app/
├── index.html              App shell, theme bootstrap, deep-link restore, default OG tags
├── vite.config.ts          Base path, PWA manifest and service worker
├── firestore.rules         Security rules
├── firestore.indexes.json  Composite indexes
├── firebase.json           Emulator and deploy config
├── .env.example            Firebase config template (copy to .env)
├── .env.emulator           Config for npm run dev:demo (safe to commit)
├── public/                 Icons, favicon, Open Graph image
├── scripts/
│   ├── deploy.sh           Build → ../crickethub/ and 404.html
│   ├── spa-404.html        Deep-link fallback template
│   └── seed.ts             Demo data (emulators or a real project)
├── og-worker/              Optional Cloudflare Worker for per-page link previews
├── tests/rules/            Security-rules tests
└── src/
    ├── main.tsx, App.tsx   Entry point and routes (lazy-loaded pages)
    ├── firebase.ts         Firebase initialisation (+ emulators, offline cache)
    ├── index.css           Design tokens, textures, light/dark themes, print styles
    ├── lib/                Pure logic, unit-tested: cricket maths, points table and NRR,
    │                       fixture generation, stats, validation, text and CSV helpers
    ├── data/               Firestore reads and writes, one module per area
    ├── hooks/              Auth context, live queries, inbox, tournament data, theme, toasts
    ├── components/         UI kit and feature components (fixture card, calendar, points
    │                       table, bracket, scorecard, availability and XI panel…)
    └── pages/              One file per route
```

---

## Optional extras

### Email notifications

In-app notifications always work. To also send email:

1. Upgrade the project to the **Blaze** plan (Firebase extensions need it; light use stays within the free quota).
2. Install the **Trigger Email from Firestore** extension (`firebase/firestore-send-email`) with an SMTP provider. Set:
   - *Email documents collection*: `mail`
   - *Users collection*: `userPrivate` (used to look up addresses for `toUids`)
   - *Templates collection*: `templates`
3. Create the two templates: run the seed script once (it writes `templates/team-invite` and
   `templates/notification`), or copy them from `scripts/seed.ts`. Keep `{{ }}` (escaped)
   placeholders, never `{{{ }}}`.
4. Set `VITE_ENABLE_EMAIL=true` in `.env` and redeploy.

Players then see an "Email me copies of notifications" option on their profile, and email
invitations are sent automatically. Without the extension, the invite page offers a button that
opens your own mail app with the invite text and link.

### Link previews (Open Graph)

`index.html` carries a CricketHub preview card (`public/og-image.png`) for every shared link.
For **page-specific** previews ("Royal Strikers v Village XI · Sat 10:00 · Riverside Oval"),
deploy the worker in `og-worker/`. thudinest.com already runs through Cloudflare:

```bash
cd og-worker
# edit wrangler.toml: FIREBASE_PROJECT_ID and FIREBASE_API_KEY (same as .env), TIME_ZONE
npx wrangler deploy
```

It runs only on `thudinest.com/crickethub/*`. It reads public Firestore documents through the REST API
and rewrites the title and `og:` tags. It also serves the app for deep links directly, instead of
via the 404 redirect. If anything fails, the unmodified page is served.

### Seeding a real project

```bash
# Firebase console → Project settings → Service accounts → Generate new private key
export GOOGLE_APPLICATION_CREDENTIALS=$PWD/service-account.json   # git-ignored
npm run seed -- --prod --owner=<your uid from Authentication → Users>
```

This creates the demo teams and tournaments owned by you, with the demo players as roster entries.
They can't sign in, but they show up on rosters and scorecards. Delete the key afterwards.

---

## Troubleshooting

- **"This domain is not authorised for sign-in"**: add the domain under Authentication → Settings → Authorized domains.
- **Sign-in popup blocked** (some in-app browsers, such as Instagram or Facebook): the app falls back to a redirect. If that also fails, open the link in Safari or Chrome.
- **A list shows "Something went wrong" right after deploying rules**: indexes are still building (Firestore console → Indexes). Wait a few minutes.
- **"The query requires an index"** in the browser console: run `npm run deploy:rules` to deploy `firestore.indexes.json`.
- **A blank page or old version after deploying**: the service worker updates in the background. Reload once, or close and reopen the installed app.
- **Deep links 404 on GitHub Pages**: check that `404.html` exists at the repo root (written by `npm run deploy`).
