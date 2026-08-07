// Bazooka Man — level data.
//
// Each level is a small descriptor: how much ammo the player gets, the star
// thresholds (shots-used cutoffs for 3★/2★, anything else that finishes the
// level is 1★), and a `build()` factory that returns a *fresh* array of
// entities (Entities.create*) for that attempt — levels are rebuilt from
// scratch on every retry rather than reset in place, so there's no risk of
// stale state leaking between attempts.
//
// To add a new level: push another object onto LEVELS with a unique `id`.
// Nothing else in the game needs to change — level count, level-select grid
// and progress storage all size themselves off this array.
'use strict';

const LEVELS = [
  {
    id: 'l1', name: 'First Shot',
    hint: 'Drag back from the bazooka, then let go to fire.',
    rockets: { standard: 3 }, stars: { s3: 1, s2: 2 },
    build: () => [
      Entities.createTarget(760, World.GROUND_Y - 22, 22),
    ],
  },
  {
    id: 'l2', name: 'Crate Wall',
    hint: 'Arc your shot over the crate.',
    rockets: { standard: 3 }, stars: { s3: 1, s2: 2 },
    build: () => [
      Entities.createCrate(520, World.GROUND_Y - 90, 60, 90),
      Entities.createTarget(800, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l3', name: 'Boom Barrel',
    hint: 'Hit the red barrel — it takes anything nearby with it.',
    rockets: { standard: 3 }, stars: { s3: 1, s2: 2 },
    build: () => [
      Entities.createBarrel(680, World.GROUND_Y - 60, 40, 60),
      Entities.createTarget(760, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l4', name: 'Glass Shield',
    hint: 'Glass shatters in one hit — punch through it.',
    rockets: { standard: 4 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createGlass(700, World.GROUND_Y - 110, 50, 110),
      Entities.createTarget(800, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l5', name: 'High Ground',
    hint: 'This one is up on a ledge — steepen your arc.',
    rockets: { standard: 4 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createPlatform(650, World.GROUND_Y - 140, 140, 24),
      Entities.createTarget(720, World.GROUND_Y - 164, 20),
    ],
  },
  {
    id: 'l6', name: 'Patrol Bot',
    hint: 'It won’t sit still — lead your shot.',
    rockets: { standard: 4 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createTarget(700, World.GROUND_Y - 22, 22, {
        moveRange: { min: 600, max: 850, speed: 95 },
      }),
    ],
  },
  {
    id: 'l7', name: 'Double Trouble',
    hint: 'Two targets, one crate in the way.',
    rockets: { standard: 5 }, stars: { s3: 3, s2: 4 },
    build: () => [
      Entities.createCrate(700, World.GROUND_Y - 70, 50, 70),
      Entities.createTarget(600, World.GROUND_Y - 20, 20),
      Entities.createTarget(830, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l8', name: 'Under the Ledge',
    hint: 'Try a low, fast bounce shot to skim under the overhang.',
    rockets: { standard: 2, bounce: 3 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createPlatform(680, 380, 160, 20),
      Entities.createTarget(760, World.GROUND_Y - 20, 20),
      Entities.createCrate(560, World.GROUND_Y - 60, 40, 60),
    ],
  },
  {
    id: 'l9', name: 'Chain Yard',
    hint: 'One barrel can take out more than one target.',
    rockets: { standard: 5 }, stars: { s3: 3, s2: 4 },
    build: () => [
      Entities.createCrate(500, World.GROUND_Y - 80, 50, 80),
      Entities.createTarget(585, World.GROUND_Y - 20, 20),
      Entities.createBarrel(640, World.GROUND_Y - 55, 40, 55),
      Entities.createBarrel(720, World.GROUND_Y - 55, 40, 55),
      Entities.createTarget(800, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l10', name: 'Final Stand',
    hint: 'Everything you’ve learned, all at once.',
    rockets: { standard: 4, bounce: 2 }, stars: { s3: 4, s2: 5 },
    build: () => [
      Entities.createPlatform(520, World.GROUND_Y - 150, 120, 20),
      Entities.createTarget(580, World.GROUND_Y - 168, 18),
      Entities.createGlass(560, World.GROUND_Y - 90, 40, 90),
      Entities.createTarget(650, World.GROUND_Y - 20, 20),
      Entities.createBarrel(710, World.GROUND_Y - 55, 40, 55),
      Entities.createTarget(800, World.GROUND_Y - 18, 18, {
        moveRange: { min: 760, max: 900, speed: 105 },
      }),
    ],
  },
];

function getLevelIndex(id) { return LEVELS.findIndex(l => l.id === id); }
