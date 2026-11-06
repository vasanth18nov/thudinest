/* Final Whistle: boot, menus, the loop, and drawing the match (players posed from the sim, the ball, the camera, the
   HUD). The simulation is sim.js + ai.js; the players' bodies rig.js; the stadium stadium.js. */
import { THREE, V3, P, $, clamp, lerp, rand, pick, store, LITE, COARSE, DEBUG, params, fmtClock } from './util.js';
import { buildStadium } from './stadium.js';
import { calibrate, setClips, Body } from './rig.js';
import { kitMaterials } from './kit.js';
import { Match, DT } from './sim.js';
import { Cam } from './camera.js';
import { Input, initInput, pollInput, consumeTaps } from './input.js';
import { Sound } from './audio.js';

window.__booted = true;
const loadBar = (p, step) => { $('loadBar').style.transform = `scaleX(${clamp(p, 0.04, 1).toFixed(3)})`; if (step) $('loadStep').textContent = step; };

/* ------------------------------------------------------------------ the teams (the Thudinest sides from Floodlit Over) */
const pl = (name, num, o = {}) => Object.assign({ name, num, short: name.includes('. ') ? name.split('. ')[1] : name.split(' ')[0] }, o);
const TEAMS = {
  thudinest: {
    id: 'thudinest', name: 'Thudinest Coimbatore', short: 'THU', color: '#3b6ff0', alt: '#ffc53d',
    kit: { shirt: 0x2350b8, shorts: 0x1b3a80, socks: 0xffc53d, trim: 0xffc53d }, gkKit: { shirt: 0x19a85a, shorts: 0x101418, socks: 0x19a85a, trim: 0x0b3a24 },
    squad: [pl('Durai', 1, { gk: true }), pl('Sabari', 45), pl('Vihaan', 33), pl('Govind', 9), pl('Thananjay', 10), pl('Harsha', 7), pl('Vikrant Sahoo', 23, { short: 'Sahoo' }), pl('Pooja', 27), pl('Vasanth', 18), pl('Kavin', 11), pl('Dhyaan', 3)],
  },
  amh: {
    id: 'amh', name: 'Team AMH', short: 'AMH', color: '#1f9a5d', alt: '#ff9f1c',
    kit: { shirt: 0x17784a, shorts: 0xeeeeee, socks: 0xff9f1c, trim: 0xff9f1c }, gkKit: { shirt: 0x7b3fd1, shorts: 0x15121c, socks: 0x7b3fd1, trim: 0x2b1655 },
    squad: [pl('Azeez', 1, { gk: true }), pl('Babu', 18), pl('Rams', 9), pl('Anantha', 23), pl('Veera', 45), pl('Narayanan', 10), pl('Karthik', 17), pl('Senra', 33), pl('Ganesh', 27), pl('Pandi', 7), pl('Renault Prem', 11, { short: 'Prem' })],
  },
  bulls: {
    id: 'bulls', name: 'Ragging Bulls', short: 'BUL', color: '#d6162f', alt: '#1f1f27',
    kit: { shirt: 0x1f1f27, shorts: 0x16161c, socks: 0xd6162f, trim: 0xd6162f }, gkKit: { shirt: 0xf2c51a, shorts: 0x15151a, socks: 0xf2c51a, trim: 0x6b5400 },
    squad: [pl('Sairam', 1, { gk: true }), pl('Appandraj', 45), pl('Parthiban', 66), pl('Ravi', 9), pl('Sathya', 33), pl('Vedu', 4), pl('Praveen', 23), pl('Bharath', 18), pl('Deepak', 77), pl('Narayanan K', 10, { short: 'Narayanan' }), pl('Siddhu', 99)],
  },
  world: {
    id: 'world', name: 'World XI', short: 'WXI', color: '#e9ecf5', alt: '#14254f',
    kit: { shirt: 0xf0f0f0, shorts: 0x14254f, socks: 0xf0f0f0, trim: 0x14254f }, gkKit: { shirt: 0xff7a1a, shorts: 0x1a1a1a, socks: 0xff7a1a, trim: 0x6b2a00 },
    squad: [pl('H. Ashby', 1, { gk: true }), pl('F. Lund', 3), pl('C. Boateng', 30), pl('V. Rao', 44), pl('I. Kowalski', 17), pl('G. Pereira', 10), pl('O. Mensah', 22), pl('R. Ortega', 15), pl('D. Mason', 8), pl('W. Thorne', 25), pl('N. Iqbal', 61)],
  },
};
const TEAM_IDS = Object.keys(TEAMS);

/* ------------------------------------------------------------------ renderer and scene */
if (COARSE) document.body.classList.add('touch-ui');
const canvas = $('scene');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !LITE || devicePixelRatio < 2, powerPreference: 'high-performance', stencil: false }); }
catch (e) { window.__fatal('This device could not start 3D graphics (WebGL 2).', e && e.message); throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
let pixelRatio = Math.min(devicePixelRatio || 1, LITE ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x141a3a, 140, 420);
const camera = new THREE.PerspectiveCamera(34, 1, 0.3, 900);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.32; pm.dispose(); }
let composer = null;
if (!LITE && THREE.EffectComposer) {
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
  composer = new THREE.EffectComposer(renderer, rt);
  composer.addPass(new THREE.RenderPass(scene, camera));
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.55, 1.05));
  composer.addPass(new THREE.OutputPass());
}
loadBar(0.15, 'Building the stadium…');
const S = buildStadium(scene, renderer);
const cam = new Cam(camera);
cam.setMode('end');

// the marker under the player you control
const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 40), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; ring.visible = false; scene.add(ring);
const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 12), new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false }));
arrow.rotation.x = Math.PI; arrow.visible = false; scene.add(arrow);

/* ------------------------------------------------------------------ loading the footballer */
const G = { M: null, bodies: new Map(), cfg: null, paused: false, mats: {}, K: null, gl: null, camPref: store.get('cam', 'broadcast'), tickerN: 0, last: 0, acc: 0, over: false, goalCamT: 0 };
async function loadAssets() {
  const loader = new THREE.GLTFLoader();
  const glP = new Promise((res, rej) => loader.load('../cricket/players/footballer.glb', res, (e) => { if (e.total) loadBar(0.2 + 0.6 * (e.loaded / e.total), 'Lacing up the boots…'); }, rej));
  const [gl, moves] = await Promise.all([glP, fetch('../cricket/players/moves.json').then((r) => r.json())]);
  setClips(moves);
  G.gl = gl; G.K = calibrate(gl, 1.8);
  loadBar(0.88, 'Painting the kits…');
  await new Promise((r) => setTimeout(r, 0));
}
function matsFor(teamId, gk) {
  const key = teamId + (gk ? ':gk' : '');
  if (!G.mats[key]) G.mats[key] = kitMaterials(G.gl, gk ? TEAMS[teamId].gkKit : TEAMS[teamId].kit);
  return G.mats[key];
}

/* ------------------------------------------------------------------ a match */
function clearMatch() {
  for (const b of G.bodies.values()) b.dispose();
  G.bodies.clear();
  if (G.M) scene.remove(G.M.ball.mesh);
  G.M = null; ring.visible = arrow.visible = false; $('tag').hidden = true;
}
function startMatch(cfg) {
  clearMatch();
  G.cfg = cfg; G.over = false; G.paused = false; G.goalCamT = 0;
  const teams = [TEAMS[cfg.a], TEAMS[cfg.b]];
  const M = new Match(scene, { mode: cfg.mode, teams, human: 0, size: cfg.size || 11, half: cfg.half || 180, diff: cfg.diff || 'medium' });
  G.M = M;
  for (const t of M.teams) for (const p of t.players) {
    const b = new Body(scene, G.K, matsFor(t.def.id, p.keeper));
    p.body = b; G.bodies.set(p.id, b);
  }
  M.start();
  hideAll(); $('hud').hidden = false; document.body.classList.add('playing');
  $('touch').classList.add('live');
  // the score bug
  const [A, B] = M.teams;
  $('tmA').querySelector('span').textContent = A.short; $('tmA').style.setProperty('--c', A.def.color); $('tmA').querySelector('i').style.background = A.def.color;
  $('tmB').querySelector('span').textContent = B.short; $('tmB').querySelector('i').style.background = B.def.color;
  $('possA').style.background = A.def.color; $('possB').style.background = B.def.color;
  $('bug').hidden = cfg.mode === 'practice'; $('poss').hidden = cfg.mode !== 'match';
  $('pens').hidden = cfg.mode !== 'shootout'; $('practice').hidden = cfg.mode !== 'practice';
  $('ticker').innerHTML = '';
  cam.setMode(cfg.mode === 'shootout' ? 'penalty' : G.camPref); cam.snap();
  if (cfg.mode === 'shootout') renderPens();
  if (cfg.mode === 'match') banner(`${A.short} v ${B.short}`, `${A.name} against ${B.name}`, 2200);
  if (cfg.mode === 'practice') banner('Practice', 'Score past the keeper. New ball: R', 2200);
  Sound.init();
}
function hideAll() { for (const id of ['menu', 'setup', 'pause', 'half', 'full', 'help']) $(id).hidden = true; }
function toMenu() {
  clearMatch(); hideAll(); $('hud').hidden = true; $('touch').classList.remove('live'); document.body.classList.remove('playing');
  $('menu').hidden = false; cam.setMode('end'); cam.snap();
}

/* ------------------------------------------------------------------ HUD */
let bannerT = null;
function banner(text, sub = '', ms = 1800) {
  const el = $('banner'); el.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`; el.classList.add('on');
  clearTimeout(bannerT); bannerT = setTimeout(() => el.classList.remove('on'), ms);
}
function ticker(text, color) {
  const t = $('ticker'), d = document.createElement('div'); d.textContent = text; if (color) d.style.setProperty('--c', color);
  t.appendChild(d); while (t.children.length > 3) t.firstChild.remove();
  setTimeout(() => d.remove(), 4200);
}
let hintKey = '';
function hint(text) { const el = $('hint'); if (text !== hintKey) { hintKey = text; el.textContent = text; } el.classList.toggle('on', !!text); }
function fade() { const f = $('fade'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), 200); cam.snap(); }
function renderPens() {
  const M = G.M; if (!M || !M.kicks) { $('pens').innerHTML = ''; return; }
  $('pens').innerHTML = M.teams.map((t, i) => {
    const k = M.kicks[i], n = Math.max(5, k.length, M.kicks[1 - i].length);
    let dots = ''; for (let j = 0; j < n; j++) dots += `<i class="${k[j] === undefined ? '' : k[j] ? 'g' : 'm'}"></i>`;
    return `<div class="pr"><b style="color:${t.def.color}">${t.short}</b>${dots}</div>`;
  }).join('');
}
const _hp = new V3();
const R = { ctx: $('radar').getContext('2d') };
function drawRadar(M) {
  const c = R.ctx, w = c.canvas.width, h = c.canvas.height;
  c.clearRect(0, 0, w, h);
  const sx = (x) => (x / (P.HL * 2) + 0.5) * (w - 16) + 8, sz = (z) => (z / (P.HW * 2) + 0.5) * (h - 16) + 8;
  c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = 2;
  c.strokeRect(sx(-P.HL), sz(-P.HW), sx(P.HL) - sx(-P.HL), sz(P.HW) - sz(-P.HW));
  c.beginPath(); c.moveTo(sx(0), sz(-P.HW)); c.lineTo(sx(0), sz(P.HW)); c.stroke();
  c.beginPath(); c.arc(sx(0), sz(0), (P.circle / (P.HL * 2)) * (w - 16), 0, 7); c.stroke();
  for (const s of [-1, 1]) c.strokeRect(Math.min(sx(s * P.HL), sx(s * (P.HL - P.boxL))), sz(-P.boxW), Math.abs(sx(s * P.HL) - sx(s * (P.HL - P.boxL))), sz(P.boxW) - sz(-P.boxW));
  for (const t of M.teams) for (const p of t.players) {
    c.fillStyle = p.keeper ? '#ffffff' : t.def.color;
    c.beginPath(); c.arc(sx(p.pos.x), sz(p.pos.z), p === t.controlled ? 7 : 5, 0, 7); c.fill();
    if (p === t.controlled) { c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.stroke(); }
  }
  c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2;
  c.beginPath(); c.arc(sx(M.ball.pos.x), sz(M.ball.pos.z), 4.5, 0, 7); c.fill(); c.stroke();
}
function updateHUD(M) {
  const [A, B] = M.teams;
  $('scA').textContent = A.score; $('scB').textContent = B.score;
  if (M.mode === 'match') {
    const m = M.matchMinute, s = Math.floor(m * 60);
    $('clk').textContent = fmtClock(s);
    const tot = A.stats.poss + B.stats.poss || 1;
    $('possA').style.width = `${(A.stats.poss / tot) * 100}%`; $('possB').style.width = `${(B.stats.poss / tot) * 100}%`;
  } else if (M.mode === 'shootout') $('clk').textContent = 'PENS';
  if (M.mode === 'practice') $('prGoals').textContent = A.score;
  drawRadar(M);
  // power
  const pw = $('power');
  pw.classList.toggle('on', Input.charging);
  $('powerFill').style.transform = `scaleX(${Input.charge.toFixed(3)})`;
  // the tag over the player you control
  const me = M.human && M.human.controlled;
  if (me && me.body && M.phase !== 'fulltime' && cam.mode !== 'penalty') {
    me.body.headPos(_hp); _hp.y += 0.45; _hp.project(camera);
    const vis = _hp.z < 1 && Math.abs(_hp.x) < 1.1 && Math.abs(_hp.y) < 1.1;
    const tag = $('tag'); tag.hidden = !vis;
    if (vis) { tag.style.transform = `translate(${((_hp.x + 1) / 2) * innerWidth}px, ${((1 - _hp.y) / 2) * innerHeight}px) translate(-50%, -100%)`; if (tag.textContent !== me.short) tag.textContent = `${me.num} ${me.short}`; }
  } else $('tag').hidden = true;
  // context labels on the touch buttons
  if (COARSE && M.human) {
    const has = M.ball.owner === M.human.controlled || (M.phase === 'restart' && M.restart && M.restart.team.human);
    const lab = has ? ['Pass', 'Cross'] : ['Switch', 'Tackle'];
    if ($('bPass').textContent !== lab[0]) { $('bPass').textContent = lab[0]; $('bTackle').textContent = lab[1]; }
  }
  // what to press at a restart
  let h = '';
  if (M.phase === 'restart' && M.restart) {
    const r = M.restart, mine = r.team.human, k = COARSE;
    if (mine) h = {
      kickoff: k ? 'Kick off: tap Pass' : 'Kick off: press J to pass',
      throwin: k ? 'Throw-in: push a direction, tap Pass' : 'Throw-in: push a direction, press J',
      corner: k ? 'Corner: Cross (or hold Shoot), Pass to play it short' : 'Corner: L or Space to cross, J to play it short',
      goalkick: k ? 'Goal kick: Pass short, Thru long' : 'Goal kick: J short, K long',
      freekick: k ? 'Free kick: Pass, Cross, or hold Shoot' : 'Free kick: J pass, L cross, Space shoot',
      penalty: k ? 'Penalty: push a side, hold and release Shoot' : 'Penalty: push a side, hold and release Space',
    }[r.type] || '';
    else if (r.type === 'penalty' && M.mode === 'shootout') h = k ? 'You\'re in goal: push left or right as he shoots' : 'You\'re in goal: hold ← or → to dive';
  }
  hint(h);
}

/* ------------------------------------------------------------------ events from the match */
function handleEvents(M) {
  for (const e of M.events) {
    switch (e.type) {
      case 'kick': Sound.kick(clamp(e.speed / 30, 0.15, 1)); break;
      case 'shot': if (M.mode !== 'shootout') ticker(`Shot · ${e.p.short} (${Math.round(e.speed * 3.6)} km/h)`, e.p.team.def.color); if (M.mode === 'practice') $('prSpeed').textContent = `Last shot ${Math.round(e.speed * 3.6)} km/h`; S.hype = Math.max(S.hype, 0.35); break;
      case 'post': Sound.post(); Sound.ooh(); ticker('Off the woodwork!'); break;
      case 'net': Sound.net(); S.bulge(e.side, e.at, clamp(e.speed * 0.02, 0.1, 0.55)); break;
      case 'save': Sound.ooh(); setTimeout(() => Sound.clap(), 400); if (M.mode !== 'shootout') ticker(`${e.smother ? 'Smothered' : e.caught ? 'Held' : 'Saved'} by ${e.p.short}`, e.p.team.def.color); break;
      case 'goal': {
        Sound.roar(); S.hype = 1.2;
        if (M.mode === 'shootout') break;
        const sc = e.scorer, min = Math.max(1, Math.ceil(((e.clock ?? M.clock) / (M.halfLen * 2)) * 90));
        banner('Goal!', sc ? `${sc.short} ${M.mode === 'match' ? min + "'" : ''}${e.own ? ' (own goal)' : ''}` : '', 2600);
        if (M.mode === 'match') { (e.team.scorers || (e.team.scorers = [])).push(`${sc ? sc.short : 'Own goal'} ${min}'${e.own ? ' (og)' : ''}`); ticker(`GOAL · ${e.team.name} ${M.teams[0].score}–${M.teams[1].score}`, e.team.def.color); }
        G.goalCamT = 5.6; // the orbit round the dancers
        break;
      }
      case 'whistle': Sound.whistle(e.foul ? 'foul' : 'short'); break;
      case 'foul': ticker(`Foul by ${e.p.short}`, e.p.team.def.color); break;
      case 'out': if (e.kind === 'corner') ticker('Corner'); else if (e.kind === 'goalkick') ticker('Goal kick'); break;
      case 'restart': if (e.kind === 'penalty' && M.mode === 'match') banner('Penalty!', '', 1600); if (e.kind === 'kickoff') Sound.cheer(); break;
      case 'fade': fade(); break;
      case 'tackle': if (e.won) Sound.kick(0.2); break;
      case 'halftime':
        Sound.whistle('long');
        banner('Half time', `${M.teams[0].short} ${M.teams[0].score}–${M.teams[1].score} ${M.teams[1].short}`, 2000);
        setTimeout(() => { if (G.M === M) showResult('half'); }, 2100);
        break;
      case 'secondhalf': banner('Second half', '', 1400); break;
      case 'fulltime': {
        Sound.whistle('end'); G.over = true;
        const [A, B] = M.teams;
        const win = A.score > B.score ? A : B.score > A.score ? B : null;
        if (M.mode === 'shootout') banner(win ? `${win.short} win` : 'Shootout over', `${A.score}–${B.score} on penalties`, 2600);
        else banner('Full time', `${A.short} ${A.score}–${B.score} ${B.short}`, 2600);
        // the winners' silly dance; the losers' heads in their hands
        setTimeout(() => {
          if (G.M !== M) return;
          for (const t of M.teams) for (const p of t.players) {
            if (!p.body) continue;
            if (win === t) p.body.play('dance', { loop: true, from: rand(0, 2) });
            else if (win) p.body.play('missed', { from: 2.8, rate: rand(0.9, 1.1) });
          }
          Sound.roar();
        }, 900);
        setTimeout(() => { if (G.M === M) showResult('full'); }, 3200);
        break;
      }
      case 'pen': {
        renderPens();
        banner(e.scored ? 'Goal!' : M.lastShotSaved ? 'Saved!' : 'Missed!', `${e.team.short} ${e.kicks[e.team.side].filter(Boolean).length}`, 1500);
        if (!e.scored) Sound.ooh();
        M.lastShotSaved = false;
        break;
      }
      case 'pensave': M.lastShotSaved = true; break;
      case 'reset': $('prSpeed').textContent = 'Shoot with Space'; break;
    }
  }
  M.events.length = 0;
}
function showResult(which) {
  const M = G.M; if (!M) return;
  const [A, B] = M.teams;
  const team = (t) => `<span class="t"><span class="kitsw" style="--a:${t.def.color};--b:${t.def.alt}"></span>${t.short}</span>`;
  $(which + 'Score').innerHTML = `${team(A)}<span class="s">${A.score}–${B.score}</span>${team(B)}`;
  const sc = (t) => (t.scorers || []).join(', ');
  $(which + 'Scorers').innerHTML = M.mode === 'match' ? [sc(A), sc(B)].filter(Boolean).map((s, i) => s).join(' · ') || 'No goals yet' : M.mode === 'shootout' ? 'Penalty shootout' : '';
  const tot = A.stats.poss + B.stats.poss || 1;
  const rows = M.mode === 'match' ? [
    ['Possession', `${Math.round((A.stats.poss / tot) * 100)}%`, `${Math.round((B.stats.poss / tot) * 100)}%`],
    ['Shots', A.stats.shots, B.stats.shots], ['On target', A.stats.onTargetCount || onT(M, A), B.stats.onTargetCount || onT(M, B)],
    ['Passes completed', A.stats.passOk, B.stats.passOk], ['Tackles won', A.stats.tackles, B.stats.tackles], ['Corners', A.stats.corners, B.stats.corners], ['Fouls', A.stats.fouls, B.stats.fouls],
  ] : [];
  $(which + 'Stats').innerHTML = rows.map(([k, a, b]) => `<div class="a">${a}</div><div class="k">${k}</div><div class="b">${b}</div>`).join('');
  if (which === 'full') {
    const win = A.score > B.score ? A : B.score > A.score ? B : null;
    $('fullKick').textContent = win ? (win === A ? 'Full time · you win' : `Full time · ${win.name} win`) : M.mode === 'shootout' ? 'Shootout over' : 'Full time · a draw';
  }
  $(which).hidden = false;
}
const onT = (M, t) => t.stats.onTarget;

/* ------------------------------------------------------------------ the loop */
const simIn = { move: new V3(), moving: false, sprint: false, passTap: false, throughTap: false, lobTap: false, tackleTap: false, switch: false, shotRelease: null };
const _f = new V3(), _st = { x: 0, z: 0, y: 0, yaw: 0, speed: 0, lateral: 0, lean: 0, act: null, look: new V3(), ready: 0 };
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (G.last || now)) / 1000); G.last = now;
  pollInput(dt);
  if (Input.pauseTap) { Input.pauseTap = false; if (G.M && !G.over && $('half').hidden) togglePause(); }
  if (Input.camTap) { Input.camTap = false; cycleCam(); }
  const M = G.M;
  if (M && !G.paused) {
    // the stick, as the camera sees it
    cam.groundDir(Input.x, Input.y, simIn.move);
    simIn.moving = Math.hypot(Input.x, Input.y) > 0.15;
    simIn.sprint = Input.sprint;
    const me = M.human && M.human.controlled;
    const has = me && M.ball.owner === me;
    simIn.passTap = Input.passTap; simIn.throughTap = Input.throughTap; simIn.lobTap = has || M.phase === 'restart' ? Input.lobTap : false;
    simIn.tackleTap = !has ? Input.tackleTap : false;
    simIn.switch = Input.switch || (Input.passTap && !has && M.phase === 'play' && !(me && !M.ball.owner && me.dist(M.ball.pos) < 1.4));
    if (simIn.switch && !Input.switch) simIn.passTap = false;
    simIn.shotRelease = Input.shotRelease;
    // the shootout keeper: the side pushed is the dive
    if (M.mode === 'shootout' && M.restart && !M.restart.team.human && Math.abs(simIn.move.z) > 0.4) M.humanDive = Math.sign(simIn.move.z);
    if (M.mode === 'shootout' && M.phase === 'play' && M.lastPen && !M.lastPen.team.human && Math.abs(simIn.move.z) > 0.4 && M.humanDive === null) M.humanDive = Math.sign(simIn.move.z);
    if (M.mode === 'practice' && Input.keys.has('KeyR')) { Input.keys.delete('KeyR'); M.practiceReset(); fade(); }
    G.acc += dt;
    let n = 0;
    while (G.acc >= DT && n < 4) {
      M.step(DT, simIn); n++; G.acc -= DT;
      simIn.passTap = simIn.throughTap = simIn.lobTap = simIn.tackleTap = simIn.switch = false; simIn.shotRelease = null;
    }
    if (n) consumeTaps();
    if (G.acc > DT * 4) G.acc = 0;
    handleEvents(M);
    poseAll(M, dt, now);
    // camera
    let mode = G.camPref, subject = null;
    const pen = M.restart && M.restart.type === 'penalty' || (M.penaltyKick && (M.phase === 'play' || M.phase === 'dead'));
    if (M.mode === 'shootout' || pen) mode = 'penalty';
    if (G.goalCamT > 0 && M.mode !== 'shootout') { G.goalCamT -= dt; mode = 'goal'; subject = M.celebrant ? M.celebrant.pos : M.ball.pos; if (G.goalCamT <= 0) cam.snap(); }
    if (M.phase === 'fulltime') mode = M.mode === 'shootout' ? 'goal' : 'goal', subject = (M.teams[0].score >= M.teams[1].score ? M.teams[0] : M.teams[1]).players.find((p) => p.role === 'FWD')?.pos || M.ball.pos;
    if (mode !== cam.mode) { if (mode === 'goal' || cam.mode === 'goal' || mode === 'penalty' || cam.mode === 'penalty') cam.snap(); cam.setMode(mode); }
    _f.copy(M.ball.pos);
    if (me && M.phase === 'play') _f.lerp(me.pos, M.ball.owner === me ? 0.15 : 0.3);
    const spot = M.restart && M.restart.type === 'penalty' ? M.restart.at : (M.lastPen ? _hp.set(P.HL - P.spot, 0, 0) : null);
    cam.update(dt, { phone: COARSE, focus: _f, ball: M.ball.pos, aspect: innerWidth / innerHeight, dir: M.human ? M.human.dir : 1, spot: spot || (M.penaltyKick ? _hp.set(M.lastTeam ? M.lastTeam.goalX - M.lastTeam.dir * P.spot : 0, 0, 0) : null), subject });
    updateHUD(M);
    const near = Math.abs(M.ball.pos.x) > P.HL - 22 ? 0.6 : 0.15;
    Sound.update(dt, near);
  } else {
    if (!M) cam.update(dt, { focus: _f.set(0, 0, 0), ball: _f, aspect: innerWidth / innerHeight });
    else cam.update(0, { focus: cam.focus, ball: M.ball.pos, aspect: innerWidth / innerHeight });
  }
  S.hype = Math.max(S.hype, Sound.hype * 0.9);
  S.update(dt);
  if (composer) composer.render(); else renderer.render(scene, camera);
}
function poseAll(M, dt, now) {
  const me = M.human && M.human.controlled, has = me && M.ball.owner === me;
  for (const p of M.all) {
    const st = _st;
    st.x = p.pos.x; st.z = p.pos.z; st.y = 0; st.yaw = p.yaw; st.speed = Math.hypot(p.vel.x, p.vel.z);
    st.lateral = p.state === 'move' ? p.lateral : 0; st.lean = p.lean; st.act = p.act; st.tilt = p.sprint && st.speed > 6 ? -0.12 : 0;
    st.look.copy(M.ball.pos); st.look.y = Math.max(0.6, M.ball.pos.y);
    st.ready = p.keeper && p.state === 'move' && Math.abs(M.ball.pos.x - p.team.ownGoalX) < 40 ? 0.85 : 0;
    p.body.pose(st, dt);
  }
  M.ball.render(dt);
  // the controlled player's marker
  if (me && M.phase !== 'fulltime') { ring.visible = true; arrow.visible = cam.mode !== 'penalty'; ring.position.set(me.pos.x, 0.02, me.pos.z); me.body.headPos(_hp); arrow.position.set(me.pos.x, _hp.y + 0.55 + Math.sin(now * 0.008) * 0.06, me.pos.z); ring.material.opacity = has ? 0.95 : 0.6; }
  else ring.visible = arrow.visible = false;
}
function togglePause(on = !G.paused) {
  G.paused = on; $('pause').hidden = !on;
  if (on) { Input.charging = false; Input.charge = 0; }
}
function cycleCam() {
  G.camPref = G.camPref === 'broadcast' ? 'behind' : 'broadcast'; store.set('cam', G.camPref);
  const lab = `Camera: ${G.camPref === 'broadcast' ? 'broadcast' : 'behind the play'}`;
  $('pauseCam').textContent = lab; $('camMenuBtn').textContent = lab; cam.snap();
  if (G.M && G.M.mode !== 'shootout') banner(G.camPref === 'broadcast' ? 'Broadcast camera' : 'Behind the play', '', 900);
}
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) composer.setSize(w, h);
}
addEventListener('resize', resize);

/* ------------------------------------------------------------------ menus */
const cfgStore = { a: store.get('teamA', 'thudinest'), b: store.get('teamB', 'world'), diff: store.get('diff', 'medium'), half: store.get('half', 180), size: store.get('size', LITE ? 7 : 11) };
if (!TEAMS[cfgStore.a]) cfgStore.a = 'thudinest';
if (!TEAMS[cfgStore.b] || cfgStore.b === cfgStore.a) cfgStore.b = TEAM_IDS.find((t) => t !== cfgStore.a);
let setupMode = 'match';
function paintPickers() {
  for (const [id, key, other] of [['pickA', 'a', 'b'], ['pickB', 'b', 'a']]) {
    $(id).innerHTML = TEAM_IDS.map((t) => `<button data-t="${t}" class="${cfgStore[key] === t ? 'on' : ''}" ${cfgStore[other] === t ? 'disabled' : ''}><span class="kitsw" style="--a:${TEAMS[t].color};--b:${TEAMS[t].alt}"></span>${TEAMS[t].name}</button>`).join('');
    $(id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { cfgStore[key] = b.dataset.t; store.set(key === 'a' ? 'teamA' : 'teamB', b.dataset.t); paintPickers(); }));
  }
  const seg = (id, key) => $(id).querySelectorAll('button').forEach((b) => {
    b.classList.toggle('on', String(cfgStore[key]) === b.dataset.v);
    b.onclick = () => { cfgStore[key] = isNaN(+b.dataset.v) ? b.dataset.v : +b.dataset.v; store.set(key, cfgStore[key]); paintPickers(); };
  });
  seg('segDiff', 'diff'); seg('segLen', 'half'); seg('segSize', 'size');
}
function openSetup(mode) {
  setupMode = mode; hideAll(); paintPickers();
  $('setupKick').textContent = mode === 'shootout' ? 'Penalty shootout' : 'Player vs AI';
  $('setupTitle').textContent = mode === 'shootout' ? 'Shootout setup' : 'Match setup';
  document.querySelectorAll('[data-for="match"]').forEach((el) => (el.hidden = mode !== 'match'));
  $('kickoffBtn').textContent = mode === 'shootout' ? 'To the spot' : 'Kick off';
  $('setup').hidden = false;
}
function wireMenus() {
  document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => {
    Sound.init();
    const m = b.dataset.mode;
    if (m === 'quick') { const opp = pick(TEAM_IDS.filter((t) => t !== cfgStore.a)); startMatch({ mode: 'match', a: cfgStore.a, b: opp, diff: 'medium', half: 150, size: LITE ? 7 : 11 }); }
    else if (m === 'match' || m === 'shootout') openSetup(m);
    else if (m === 'practice') startMatch({ mode: 'practice', a: cfgStore.a, b: cfgStore.b === cfgStore.a ? 'world' : cfgStore.b, diff: cfgStore.diff });
  }));
  $('kickoffBtn').onclick = () => startMatch(setupMode === 'shootout' ? { mode: 'shootout', a: cfgStore.a, b: cfgStore.b, diff: cfgStore.diff } : { mode: 'match', a: cfgStore.a, b: cfgStore.b, diff: cfgStore.diff, half: cfgStore.half, size: cfgStore.size });
  $('setupBack').onclick = () => { hideAll(); $('menu').hidden = false; };
  $('pauseBtn').onclick = () => togglePause();
  $('camBtn').onclick = () => cycleCam();
  $('resumeBtn').onclick = () => togglePause(false);
  $('restartBtn').onclick = () => startMatch(G.cfg);
  $('quitBtn').onclick = () => toMenu();
  $('pauseCam').onclick = () => cycleCam();
  $('camMenuBtn').onclick = () => cycleCam();
  const soundLab = () => { const t = `Sound: ${Sound.on ? 'on' : 'off'}`; $('soundBtn').textContent = t; $('pauseSound').textContent = t; };
  Sound.on = store.get('sound', true); soundLab();
  const toggleSound = () => { Sound.init(); Sound.setOn(!Sound.on); store.set('sound', Sound.on); soundLab(); };
  $('soundBtn').onclick = toggleSound; $('pauseSound').onclick = toggleSound;
  const openHelp = () => { $('help').hidden = false; };
  $('helpBtn').onclick = openHelp; $('pauseHelp').onclick = openHelp; $('helpClose').onclick = () => { $('help').hidden = true; };
  $('secondHalfBtn').onclick = () => { $('half').hidden = true; if (G.M) { G.M.resumeOK = true; fade(); } };
  $('rematchBtn').onclick = () => startMatch(G.cfg);
  $('fullMenuBtn').onclick = () => toMenu();
  $('prReset').onclick = () => { if (G.M) { G.M.practiceReset(); fade(); } };
  $('rotateDismiss').onclick = () => $('rotate').classList.remove('allow');
  const lab = `Camera: ${G.camPref === 'broadcast' ? 'broadcast' : 'behind the play'}`; $('pauseCam').textContent = lab; $('camMenuBtn').textContent = lab;
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  resize();
  initInput(() => Sound.init());
  wireMenus();
  requestAnimationFrame(frame);
  try { await loadAssets(); }
  catch (e) { window.__fatal('The players could not be loaded.', e && e.message); throw e; }
  // warm the kits for the default sides so the first kick-off is quick
  matsFor(cfgStore.a, false); matsFor(cfgStore.b, false);
  loadBar(1, 'Ready');
  $('loader').hidden = true;
  const q = params.get('play');
  if (q === 'quick' || q === 'match') startMatch({ mode: 'match', a: cfgStore.a, b: params.get('vs') && TEAMS[params.get('vs')] ? params.get('vs') : cfgStore.b, diff: params.get('diff') || 'medium', half: +params.get('half') || 150, size: +params.get('size') || (LITE ? 7 : 11) });
  else if (q === 'shootout') startMatch({ mode: 'shootout', a: cfgStore.a, b: cfgStore.b, diff: 'medium' });
  else if (q === 'practice') startMatch({ mode: 'practice', a: cfgStore.a, b: cfgStore.b, diff: 'medium' });
  else $('menu').hidden = false;
}
boot();
if (DEBUG) window.__fw = {
  G, TEAMS, cam, camera, scene, Input, startMatch, get M() { return G.M; },
  // step the match n times (no input) and draw that moment from a camera mode
  shot(n, mode, o = {}) {
    const M = G.M; G.paused = true; $('pause').hidden = true;
    for (let i = 0; i < n; i++) { if (M.phase === 'halftime') M.resumeOK = true; M.step(DT, simIn); }
    for (let i = 0; i < 3; i++) poseAll(M, DT, performance.now());
    M.ball.render(DT);
    cam.setMode(mode || 'broadcast'); cam.snap();
    cam.update(1 / 60, { focus: o.focus || M.ball.pos, ball: M.ball.pos, aspect: innerWidth / innerHeight, dir: 1, spot: o.spot, subject: o.subject });
    handleEvents(M); updateHUD(M); S.update(1 / 60);
    if (composer) composer.render(); else renderer.render(scene, camera);
    return { phase: M.phase, score: M.teams.map((t) => t.score), ball: M.ball.pos.toArray().map((v) => +v.toFixed(2)) };
  },
  // the cost of a frame's simulation and posing, in ms
  perf(n = 60) {
    const M = G.M; let a = 0, b = 0;
    for (let i = 0; i < n; i++) { const t0 = performance.now(); M.step(DT, simIn); const t1 = performance.now(); poseAll(M, DT, t1); a += t1 - t0; b += performance.now() - t1; }
    return { sim: +(a / n).toFixed(3), pose: +(b / n).toFixed(3), players: M.all.length };
  },
};
