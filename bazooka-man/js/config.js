// Bazooka Man — shared world constants.
// A fixed logical resolution keeps physics tuning (gravity, speeds, blast
// radii) consistent regardless of the device's actual pixel size; the canvas
// is scaled to fit the screen in engine.js.
'use strict';

const World = {
  W: 960,
  H: 540,
  GROUND_Y: 486, // top surface of the ground strip
  PLAYER_X: 70,
  PLAYER_Y: 486,
};
