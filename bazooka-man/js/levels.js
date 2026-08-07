// Bazooka Man — level data.
//
// Each level is a small descriptor: how much ammo the player gets, the star
// thresholds (shots-used cutoffs for 3★/2★, anything else that finishes the
// level is 1★), and a `build()` factory that returns a *fresh* array of
// entities (Entities.create*) for that attempt — levels are rebuilt from
// scratch on every retry rather than reset in place, so there's no risk of
// stale state leaking between attempts.
//
// Most levels place their `target` (the person to take out) behind or
// inside a small structure built from `wall` blocks (destructible brick,
// see entities.js) — break through, and the same blast usually catches the
// person standing just behind it too. `platform` pieces are indestructible
// and only used as structural floor/roof *support* (e.g. the base a 2-tier
// building's upper floor rests on), never as something blocking the shot.
//
// Every target position here is well within the bazooka's max range
// (~972px at full power/45deg — see the comment above MAX_SPEED in
// main.js); if you add a level with a target further than ~x=950, retune
// the physics constants together rather than placing something unreachable.
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
      Entities.createTarget(700, World.GROUND_Y - 22, 22),
    ],
  },
  {
    id: 'l2', name: 'Break the Door',
    hint: 'Smash the wall — the blast reaches whoever is behind it too.',
    rockets: { standard: 3 }, stars: { s3: 1, s2: 2 },
    build: () => [
      Entities.createWall(650, World.GROUND_Y - 70, 40, 70),
      Entities.createTarget(720, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l3', name: 'Boom Barrel',
    hint: 'Hit the red barrel — the chain blast takes them out too.',
    rockets: { standard: 3 }, stars: { s3: 1, s2: 2 },
    build: () => [
      Entities.createBarrel(700, World.GROUND_Y - 55, 40, 55),
      Entities.createTarget(790, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l4', name: 'Through the Window',
    hint: 'Glass shatters in one hit — punch through for a clean shot.',
    rockets: { standard: 4 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createGlass(700, World.GROUND_Y - 110, 50, 110),
      Entities.createTarget(800, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l5', name: 'Watchtower Roof',
    hint: 'They’re up on the roof — steepen your arc.',
    rockets: { standard: 4 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createPlatform(650, World.GROUND_Y - 140, 140, 24),
      Entities.createTarget(720, World.GROUND_Y - 164, 20),
    ],
  },
  {
    id: 'l6', name: 'Behind Cover',
    hint: 'They patrol past a wall — time your shot or break the cover.',
    rockets: { standard: 4 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createWall(700, World.GROUND_Y - 60, 30, 60),
      Entities.createTarget(700, World.GROUND_Y - 22, 22, {
        moveRange: { min: 600, max: 850, speed: 95 },
      }),
    ],
  },
  {
    id: 'l7', name: 'Twin Shacks',
    hint: 'Two shacks, two people — break through each.',
    rockets: { standard: 5 }, stars: { s3: 3, s2: 4 },
    build: () => [
      Entities.createWall(600, World.GROUND_Y - 70, 40, 70),
      Entities.createTarget(670, World.GROUND_Y - 20, 20),
      Entities.createWall(800, World.GROUND_Y - 70, 40, 70),
      Entities.createTarget(870, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l8', name: 'Lean-To',
    hint: 'Duck under with a bounce shot, or break the roof from above.',
    rockets: { standard: 2, bounce: 3 }, stars: { s3: 2, s2: 3 },
    build: () => [
      Entities.createWall(560, World.GROUND_Y - 60, 20, 60),
      Entities.createWall(680, 380, 160, 24),
      Entities.createTarget(760, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l9', name: 'Row Houses',
    hint: 'Two houses to clear — the barrel might help with the first.',
    rockets: { standard: 5 }, stars: { s3: 3, s2: 4 },
    build: () => [
      Entities.createWall(560, World.GROUND_Y - 70, 40, 70),
      Entities.createTarget(630, World.GROUND_Y - 20, 20),
      Entities.createBarrel(700, World.GROUND_Y - 55, 40, 55),
      Entities.createWall(800, World.GROUND_Y - 70, 40, 70),
      Entities.createTarget(870, World.GROUND_Y - 20, 20),
    ],
  },
  {
    id: 'l10', name: 'Final Stand',
    hint: 'Two floors, two people — mind the barrel and the glass.',
    rockets: { standard: 4, bounce: 2 }, stars: { s3: 4, s2: 5 },
    build: () => [
      Entities.createGlass(560, World.GROUND_Y - 90, 40, 90),
      Entities.createTarget(650, World.GROUND_Y - 20, 20),
      Entities.createBarrel(710, World.GROUND_Y - 55, 40, 55),
      Entities.createPlatform(780, World.GROUND_Y - 150, 140, 20),
      Entities.createTarget(830, World.GROUND_Y - 168, 18, {
        moveRange: { min: 800, max: 900, speed: 105 },
      }),
    ],
  },
];

function getLevelIndex(id) { return LEVELS.findIndex(l => l.id === id); }
