// Meadow Hunt — walk the theme-song meadow, find all 14 creatures.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mulberry32, clamp, lerp } from './util.js';
import * as W from './world.js';
import * as BUGS from './bugs.js';
import { makeBros } from './bros.js';
import { runMiniGame, MINIGAME_KEYS } from './minigames.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
if (IS_TOUCH) document.body.classList.add('touch');

// ------------------------------------------------------------------
// The 14 creatures from the song (+ one rare bonus)
// ------------------------------------------------------------------
const CREATURES = [
  { key: 'ladybug', emoji: '🐞', name: 'LADYBUG', sci: 'Coccinellidae', make: BUGS.makeLadybug,
    fact: 'One ladybug can eat 5,000 aphids in its lifetime — gardeners love them.' },
  { key: 'firefly', emoji: '✨', name: 'LIGHTNING BUG', sci: 'Lampyridae', make: BUGS.makeFirefly,
    fact: 'Its glow is chemical light — nearly 100% light and almost no heat.' },
  { key: 'dragonfly', emoji: '🪁', name: 'DRAGONFLY', sci: 'Anisoptera', make: BUGS.makeDragonfly,
    fact: 'It can fly backwards — and catches nearly every insect it chases.' },
  { key: 'bee', emoji: '🐝', name: 'BUMBLEBEE', sci: 'Bombus', make: BUGS.makeBumblebee,
    fact: 'It buzzes its flight muscles to shake pollen loose from flowers.' },
  { key: 'butterfly', emoji: '🦋', name: 'MONARCH BUTTERFLY', sci: 'Danaus plexippus', make: BUGS.makeButterfly,
    fact: 'It tastes with its feet — landing on a leaf tells it if it’s food.' },
  { key: 'beetle', emoji: '🪲', name: 'GROUND BEETLE', sci: 'Carabidae', make: BUGS.makeBeetle,
    fact: 'About one in four animal species on Earth is a beetle.' },
  { key: 'cricket', emoji: '🎻', name: 'FIELD CRICKET', sci: 'Gryllus', make: BUGS.makeCricket,
    fact: 'It sings by rubbing its wings together — and hears with its knees.' },
  { key: 'ant', emoji: '🐜', name: 'ANT', sci: 'Formicidae', make: null,
    fact: 'An ant can carry many times its own body weight — and never gets lost from the line.' },
  { key: 'grasshopper', emoji: '🦗', name: 'GRASSHOPPER', sci: 'Caelifera', make: BUGS.makeGrasshopper,
    fact: 'It can leap about 20 times the length of its own body.' },
  { key: 'pillbug', emoji: '🥎', name: 'PILL BUG', sci: 'Armadillidium', make: BUGS.makePillbug,
    fact: 'It isn’t an insect at all — it’s a crustacean, a cousin of crabs.' },
  { key: 'longlegs', emoji: '🕴️', name: 'DADDY LONGLEGS', sci: 'Opiliones', make: BUGS.makeLonglegs,
    fact: 'Not a spider: no venom, no silk — just very, very long legs.' },
  { key: 'spider', emoji: '🕸️', name: 'ORB WEAVER', sci: 'Araneidae', make: BUGS.makeSpider,
    fact: 'Many orb weavers eat their old web and spin a fresh one each night.' },
  { key: 'caterpillar', emoji: '🐛', name: 'CATERPILLAR', sci: 'Lepidoptera (larva)', make: BUGS.makeCaterpillar,
    fact: 'Its whole job is eating — it can grow 100× heavier before it transforms.' },
  { key: 'mantis', emoji: '🙏', name: 'PRAYING MANTIS', sci: 'Mantodea', make: BUGS.makeMantis,
    fact: 'It can turn its head almost all the way around — most insects can’t turn theirs at all.' },
];
const BONUS = {
  key: 'scarab', emoji: '🌈', name: 'RAINBOW SCARAB', sci: 'Phanaeus vindex', make: BUGS.makeRainbowScarab,
  fact: 'Its metallic shell isn’t a pigment — layers bend the light, so its color shifts as you move.',
  rare: true,
};

// ------------------------------------------------------------------
// Scene
// ------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: !IS_TOUCH, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = !IS_TOUCH;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xdcead0, 18, 60);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 500);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.4;

W.buildSky(scene);
const lights = W.buildLights(scene);
const motes = W.buildMotes(scene, mulberry32(11));

const ground = new THREE.Mesh(new THREE.CircleGeometry(50, 48), W.mat(0x5c8f3e, { rough: 1 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// habitats (mirrors the film's meadow layout)
const HOME = {
  ladybug: [-6, 2.5], bee: [-3, -4.3], beetle: [-5, 6], cricket: [4.2, -3.1],
  ant: [5.5, -2.6], grasshopper: [4.8, 3.6], firefly: [-1, 7.6], pillbug: [2.6, 6.6],
  longlegs: [7.2, -0.8], spider: [-7.5, -2], caterpillar: [0.3, -6.6], mantis: [8, -5],
  dragonfly: [-4.8, -0.6], butterfly: [-2.2, -3.3],
};
const clearings = Object.values(HOME).map(([x, z]) => ({ x, z, r: 2.3 }));
clearings.push({ x: 0, z: 0, r: 3.2 });
const rng = mulberry32(42);
W.buildGrass(scene, rng, { count: IS_TOUCH ? 3400 : 6500, radius: 15, heightMin: 0.9, heightMax: 1.9, exclude: clearings });
W.buildGrass(scene, rng, { count: 1800, radius: 30, heightMin: 1.6, heightMax: 3.2, exclude: [{ x: 0, z: 0, r: 14.5 }] });

// set dressing
const dressRng = mulberry32(7);
for (const [maker, x, z] of [
  [() => W.makeMushroom(1.1), -6.9, 1.2], [() => W.makeMushroom(0.8), 3.9, 5.4],
  [() => W.makeRock(dressRng, 0.8), 5.9, -2.1], [() => W.makeRock(dressRng, 0.5), -4.2, 5.2],
  [() => W.makeRock(dressRng, 0.7), 1.8, -6.2], [() => W.makeMushroom(1.3), -8.3, -0.8],
]) { const o = maker(); o.position.x = x; o.position.z = z; scene.add(o); }

const dirt = new THREE.Mesh(new THREE.CircleGeometry(1.9, 20), W.mat(W.PAL.soil, { rough: 1 }));
dirt.rotation.x = -Math.PI / 2;
dirt.position.set(-5, 0.01, 6);
dirt.receiveShadow = true;
scene.add(dirt);

const stone = W.makeRock(mulberry32(5), 1.15);
stone.scale.y = 0.42;
stone.position.set(0, 0.05, 0);
scene.add(stone);

const ladyLeaf = W.makeLeaf(2.6, 0x6db14a);
ladyLeaf.position.set(-6, 0.55, 2.5);
ladyLeaf.rotation.set(0.25, 0.6, -0.18);
scene.add(ladyLeaf);

for (const [cx, cz, s] of [[-3, -4.3, 1.15], [-2.4, -3.5, 1.0], [-3.7, -3.6, 0.9]]) {
  const cl = W.makeClover(s);
  cl.position.set(cx, 0, cz);
  scene.add(cl);
}
const cricketRock = W.makeRock(mulberry32(9), 0.55);
cricketRock.position.set(4.2, 0.1, -3.1);
scene.add(cricketRock);
const twig = W.makeTwig(2.6, 0.08);
twig.position.set(5.5, 0.5, -2.6);
twig.rotation.y = 0.4;
scene.add(twig);
const rockA = W.makeRock(mulberry32(13), 0.5); rockA.position.set(4.35, 0.05, -2.2);
const rockB = W.makeRock(mulberry32(14), 0.5); rockB.position.set(6.65, 0.05, -3.05);
scene.add(rockA, rockB);
for (const [sx, sz] of [[-8.3, -2.3], [-6.7, -1.7]]) {
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.3, 8), W.mat(0x5f9c3f));
  stem.position.set(sx, 1.15, sz);
  scene.add(stem);
}
const web = BUGS.makeWeb(0.85);
web.position.set(-7.5, 1.35, -2);
web.rotation.y = 0.55;
web.userData.setProgress(1);
scene.add(web);
const catLeaf = W.makeLeaf(2.2, 0x63a844);
catLeaf.position.set(0.5, 0.02, -6.3);
catLeaf.rotation.y = -0.4;
scene.add(catLeaf);
const mantisRock = W.makeRock(mulberry32(17), 0.7);
mantisRock.position.set(8, 0.1, -5);
scene.add(mantisRock);
const log = W.makeLog(2.8, 0.5);
log.position.set(3.2, 0.28, -7);
scene.add(log);
// arcade signposts — games you discover by walking the meadow
const SIGNS = [
  { key: 'hopper', title: 'Hopper', url: '/games/hopper/', x: 6.7, z: 5.4, emoji: '🕹️' },
];
const signMeshes = {};
for (const sg of SIGNS) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.85, 8), W.mat(0x9a7248));
  post.position.y = 0.42;
  g.add(post);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#16352c';
  x.fillRect(0, 0, 256, 128);
  x.strokeStyle = '#f4b53f'; x.lineWidth = 8; x.strokeRect(6, 6, 244, 116);
  x.fillStyle = '#f4efe2';
  x.font = '700 52px "Space Grotesk", sans-serif';
  x.textAlign = 'center';
  x.fillText(sg.title.toUpperCase(), 128, 62);
  x.font = '600 30px "Space Grotesk", sans-serif';
  x.fillStyle = '#f4b53f';
  x.fillText('▶ a game!', 128, 102);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
  board.position.y = 0.85;
  g.add(board);
  g.position.set(sg.x, 0, sg.z);
  g.userData.board = board;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(g);
  signMeshes[sg.key] = g;
}

const perchTwig = W.makeTwig(1.8, 0.06);
perchTwig.position.set(-4.8, 0.7, -0.6);
perchTwig.rotation.y = 1.1;
scene.add(perchTwig);

// ------------------------------------------------------------------
// Creatures
// ------------------------------------------------------------------
const actors = {};
for (const c of CREATURES) {
  if (c.key === 'ant') {
    const grp = new THREE.Group();
    grp.ants = [];
    for (let i = 0; i < 5; i++) { const a = BUGS.makeAnt(i % 2 === 0); grp.add(a); grp.ants.push(a); }
    grp.position.set(0, 0, 0);
    scene.add(grp);
    actors[c.key] = grp;
  } else {
    const obj = c.make();
    scene.add(obj);
    actors[c.key] = obj;
  }
}
actors.scarab = BUGS.makeRainbowScarab();
actors.scarab.scale.setScalar(1.25);
actors.scarab.visible = false;
scene.add(actors.scarab);

// finale fireflies
const finFlies = [];
for (let i = 0; i < 6; i++) { const f = BUGS.makeFirefly(); f.visible = false; scene.add(f); finFlies.push(f); }

// per-creature idle behaviour; each returns the current findable position
const BEHAVE = {
  ladybug(o, t) {
    const u = (Math.sin(t * 0.35) + 1) / 2;
    o.position.set(lerp(-6.45, -5.75, u), lerp(0.88, 1.18, u), lerp(2.85, 2.4, u));
    o.rotation.set(-0.22, 0.9 + Math.sin(t * 0.35) * 0.4, 0.12);
    o.userData.anim(t);
  },
  firefly(o, t) {
    o.position.set(-1 + Math.cos(t * 0.5) * 1.1, 0.9 + Math.sin(t * 0.7) * 0.35, 7.6 + Math.sin(t * 0.44) * 1.0);
    o.rotation.y = t * 0.5;
    o.userData.setGlow(0.35 + 0.3 * Math.sin(t * 2.2));
    o.userData.anim(t);
  },
  dragonfly(o, t) {
    // patrols high, dips to its perch on a slow cycle — catchable on the dip
    const cyc = (t % 9) / 9;
    const dip = cyc > 0.62 && cyc < 0.92 ? Math.sin((cyc - 0.62) / 0.3 * Math.PI) : 0;
    const a = t * 0.9;
    o.position.set(-4.8 + Math.cos(a) * (1.6 - dip * 1.1), 2.4 - dip * 1.4, -0.6 + Math.sin(a) * (1.4 - dip * 1.0));
    o.rotation.y = -a - Math.PI / 2;
    o.userData.anim(t);
  },
  bee(o, t) {
    const a = t * 1.1;
    o.position.set(-3 + Math.cos(a) * 0.6, 1.5 + Math.sin(t * 2.2) * 0.15, -4.3 + Math.sin(a) * 0.6);
    o.rotation.y = -a + Math.PI / 2;
    o.userData.anim(t);
  },
  butterfly(o, t) {
    const cyc = (t % 8) / 8;
    if (cyc < 0.3) { // perched on the clover, wings folding slowly
      o.position.set(-2.4, 1.45, -3.5);
      o.rotation.y = 0.8;
      for (const w of o.userData.wings) w.rotation.y = w.userData.sx * -(0.35 + Math.abs(Math.sin(t * 1.6)) * 0.75);
    } else {
      const a = (cyc - 0.3) / 0.7 * Math.PI * 2;
      o.position.set(-2.2 + Math.cos(a) * 1.3, 1.6 + Math.sin(a * 2) * 0.4, -3.3 + Math.sin(a) * 1.1);
      o.rotation.y = -a + Math.PI / 2;
      o.userData.anim(t);
    }
  },
  beetle(o, t) {
    const a = t * 0.4;
    o.position.set(-5 + Math.cos(a) * 0.9, 0.02, 6 + Math.sin(a) * 0.9);
    o.rotation.y = -a + Math.PI;
    o.userData.anim(t);
  },
  cricket(o, t) {
    o.position.set(4.2, 0.62, -3.1);
    o.rotation.y = -0.9 + Math.sin(t * 0.4) * 0.3;
    o.userData.anim(t);
  },
  ant(grp, t) {
    const A = V3(4.45, 0.62, -2.25), B = V3(6.55, 0.62, -3.0);
    grp.ants.forEach((ant, i) => {
      const u = ((t * 0.16 - i * 0.13) % 1.3 + 1.3) % 1.3;
      ant.position.copy(A.clone().lerp(B, clamp(u, 0, 1)));
      ant.lookAt(B.x, 0.62, B.z);
      ant.userData.anim(t + i);
    });
    grp.findPos = V3(5.5, 0.62, -2.6);
  },
  grasshopper(o, t) {
    const cyc = (t % 3.2) / 3.2;
    const hop = cyc < 0.25 ? Math.sin(cyc / 0.25 * Math.PI) : 0;
    const leg = Math.floor(t / 3.2) % 4;
    const spots = [[4.8, 3.6], [5.6, 4.2], [4.6, 4.8], [3.9, 4.0]];
    const from = spots[leg], to = spots[(leg + 1) % 4];
    const u = cyc < 0.25 ? cyc / 0.25 : 1;
    o.position.set(lerp(from[0], to[0], u), hop * 0.55, lerp(from[1], to[1], u));
    o.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]);
    o.userData.setLegExtend(hop > 0.3 ? 1 : 0);
    o.userData.anim(t);
  },
  pillbug(o, t, playerPos) {
    const near = playerPos && playerPos.distanceTo(o.position) < 1.3;
    o.userData.setBall(near); // curls up when you get close!
    if (!near) {
      const a = t * 0.3;
      o.position.set(2.6 + Math.cos(a) * 0.7, 0.02, 6.6 + Math.sin(a) * 0.7);
      o.rotation.y = -a + Math.PI / 2;
      o.userData.anim(t);
    } else {
      o.position.y = 0.115;
    }
  },
  longlegs(o, t) {
    const a = t * 0.25;
    o.position.set(7.2 + Math.cos(a) * 1.1, 0.95, -0.8 + Math.sin(a) * 1.1);
    o.rotation.y = -a;
    o.userData.anim(t);
  },
  spider(o, t) {
    const k = (Math.sin(t * 0.3) + 1) / 2 * 0.9 + 0.05;
    o.scale.setScalar(1.5);
    o.position.copy(web.localToWorld(web.userData.spiralPoint(k).clone()));
    o.rotation.y = web.rotation.y + Math.PI / 2;
    o.userData.anim(t);
    o.findPos = V3(-7.2, 1.0, -1.7);
  },
  caterpillar(o, t) {
    o.userData.setInch(t * 1.1);
    const u = (Math.sin(t * 0.22) + 1) / 2;
    o.position.set(lerp(0.15, 0.85, u), 0.06, lerp(-6.5, -6.1, u));
    o.rotation.y = -Math.PI / 3;
  },
  mantis(o, t, playerPos) {
    o.position.set(8, 0.42, -5);
    o.rotation.y = Math.PI + 0.5;
    o.scale.setScalar(1.35);
    o.userData.anim(t);
    if (playerPos) { // watches you — mantises really do this
      const d = o.position.distanceTo(playerPos);
      if (d < 4) {
        const dir = Math.atan2(playerPos.x - 8, playerPos.z + 5) - (Math.PI + 0.5);
        o.userData.head.rotation.y = clamp(dir, -1.1, 1.1);
      }
    }
  },
  scarab(o, t) {
    o.position.set(0, 0.42, 0.05);
    o.rotation.y = 2.6 + Math.sin(t * 0.4) * 0.2;
    o.userData.anim(t);
  },
};

// ------------------------------------------------------------------
// Player (both bros — the little one tags along)
// ------------------------------------------------------------------
const { A: player, B: buddy } = makeBros();
player.root.position.set(0, 0, 3.5);
buddy.root.position.set(-1, 0, 4.3);
scene.add(player.root, buddy.root);
let heading = Math.PI;
let walkPhase = 0;
let buddyPhase = 0;
let delightUntil = -9;
let vy = 0;        // vertical velocity (jump/fly)
let playerY = 0;   // height above ground

// ------------------------------------------------------------------
// Input — Roblox-style: WASD/arrows move camera-relative, drag orbits
// the camera, scroll zooms, Space jumps, double-Space (or F) toggles fly.
// ------------------------------------------------------------------
const keys = {};
let flying = false;
let lastSpaceTap = -9;
let wantJump = false;
addEventListener('keydown', (e) => {
  if (gameOverlay || document.querySelector('.mg-wrap')) return; // an embedded game owns the keyboard
  keys[e.code] = true;
  if ((e.code === 'KeyE' || e.code === 'Enter') && !e.repeat) action();
  if (e.code === 'KeyF' && !e.repeat) toggleFly();
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    const now = performance.now();
    if (now - lastSpaceTap < 320) { toggleFly(); lastSpaceTap = -9; }
    else { if (!flying) wantJump = true; lastSpaceTap = now; }
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

function toggleFly() {
  flying = !flying;
  toast(flying ? '🪽 Flying! Space = up, Shift = down' : 'Back on foot 🥾', 2600);
  document.getElementById('btnUp')?.classList.toggle('vis', flying && IS_TOUCH);
  document.getElementById('btnDown')?.classList.toggle('vis', flying && IS_TOUCH);
}

// camera orbit state (only moves when the player moves it — no auto-chase)
const cam = { yaw: 0, pitch: 0.5, dist: 5.2 };
addEventListener('wheel', (e) => {
  cam.dist = clamp(cam.dist * (1 + e.deltaY * 0.0016), 2.6, 10);
}, { passive: true });

const stickEl = document.getElementById('stick');
const nubEl = document.getElementById('nub');
let joy = null;   // touch joystick (left half of screen)
let look = null;  // drag-to-orbit pointer
addEventListener('pointerdown', (e) => {
  if (!running || e.target.closest('button') || e.target.closest('#card')) return;
  const leftHalf = e.clientX < innerWidth * 0.45;
  if (IS_TOUCH && leftHalf && !joy) {
    joy = { id: e.pointerId, cx: e.clientX, cy: e.clientY, dx: 0, dy: 0 };
    stickEl.style.display = 'block';
    stickEl.style.left = (e.clientX - 59) + 'px';
    stickEl.style.top = (e.clientY - 59) + 'px';
  } else if (!look) {
    look = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }
});
addEventListener('pointermove', (e) => {
  if (joy && e.pointerId === joy.id) {
    const dx = e.clientX - joy.cx, dy = e.clientY - joy.cy;
    const m = Math.hypot(dx, dy), cap = 46;
    const s = m > cap ? cap / m : 1;
    joy.dx = dx * s / cap; joy.dy = dy * s / cap;
    nubEl.style.transform = `translate(calc(-50% + ${joy.dx * cap}px), calc(-50% + ${joy.dy * cap}px))`;
    return;
  }
  if (look && e.pointerId === look.id && (IS_TOUCH || e.buttons)) {
    cam.yaw -= (e.clientX - look.x) * 0.0055;
    cam.pitch = clamp(cam.pitch + (e.clientY - look.y) * 0.004, -0.15, 1.25);
    look.x = e.clientX; look.y = e.clientY;
  }
});
const endPointer = (e) => {
  if (joy && e.pointerId === joy.id) {
    joy = null;
    stickEl.style.display = 'none';
    nubEl.style.transform = 'translate(-50%,-50%)';
  }
  if (look && e.pointerId === look.id) look = null;
};
addEventListener('pointerup', endPointer);
addEventListener('pointercancel', endPointer);

// touch buttons
for (const [id, downFn, upFn] of [
  ['btnJump', () => { if (flying) keys.__up = true; else wantJump = true; }, () => { keys.__up = false; }],
  ['btnFly', () => toggleFly(), null],
  ['btnUp', () => { keys.__up = true; }, () => { keys.__up = false; }],
  ['btnDown', () => { keys.__down = true; }, () => { keys.__down = false; }],
]) {
  const el = document.getElementById(id);
  if (!el) continue;
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); downFn(); });
  if (upFn) { el.addEventListener('pointerup', upFn); el.addEventListener('pointercancel', upFn); }
}

// ------------------------------------------------------------------
// UI
// ------------------------------------------------------------------
let scarabPhase = 0;      // 0 = hidden, 1 = revealed, 2 = found
let finaleStarted = false;
const found = new Set();
try {
  for (const k of JSON.parse(localStorage.getItem('mh-found') || '[]')) {
    if (CREATURES.some(c => c.key === k)) found.add(k);
  }
} catch (e) {}
function saveFound() {
  try { localStorage.setItem('mh-found', JSON.stringify([...found])); } catch (e) {}
}
const tracker = document.getElementById('tracker');
for (const c of CREATURES) {
  const s = document.createElement('span');
  s.id = 'tk-' + c.key;
  s.textContent = c.emoji;
  if (found.has(c.key)) s.classList.add('on');
  tracker.appendChild(s);
}
if (found.size === CREATURES.length) { finaleStarted = true; scarabPhase = 1; }
const promptEl = document.getElementById('prompt');
promptEl.addEventListener('click', () => action());
const toastEl = document.getElementById('toast');
let toastTimer = 0;
function toast(msg, ms = 3400) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}
document.getElementById('hint').textContent = IS_TOUCH
  ? 'left: walk · right: look around'
  : 'WASD walk · drag to look · scroll to zoom · Space jump · F fly · E look closer';

const cardWrap = document.getElementById('cardWrap');
const cardEl = document.getElementById('card');
let cardOpenAt = 0;
function showCard(c, idx) {
  cardEl.innerHTML = `
    <div class="head">
      <svg class="jar" viewBox="0 0 100 100"><rect x="31" y="17" width="38" height="14" rx="2" fill="#f4b53f"/>
        <path d="M34 31 Q34 37 30 43 L30 76 Q30 84 38 84 L62 84 Q70 84 70 76 L70 43 Q66 37 66 31 Z" fill="none" stroke="#38cba7" stroke-width="5"/>
        <ellipse cx="50" cy="59" rx="8" ry="10" fill="#38cba7"/><circle cx="50" cy="45" r="5" fill="#f4b53f"/></svg>
      <div><b>${c.name}</b><i>${c.sci}</i></div>
    </div>
    <div class="pic">${c.emoji}</div>
    ${c.rare ? '<span class="rare">★ RARE FIND</span>' : ''}
    <div class="fact"><b>One strange fact</b>${c.fact}</div>
    <div class="foot"><span class="at">@thebuggybros</span><span>${idx} · MEADOW</span></div>
    ${MINIGAME_KEYS.includes(c.key) ? `<button id="cardPlay">▶ Play its game</button>` : ''}
    <button id="cardBtn">${c.rare ? 'Amazing!' : 'Keep looking'}</button>`;
  cardWrap.classList.add('show');
  cardOpenAt = performance.now();
  document.getElementById('cardBtn').addEventListener('click', closeCard);
  const pb = document.getElementById('cardPlay');
  if (pb) pb.addEventListener('click', () => {
    cardWrap.classList.remove('show');
    playCreatureGame(c.key);
  });
}
function closeCard() {
  if (performance.now() - cardOpenAt < 500) return;
  cardWrap.classList.remove('show');
  if (found.size === CREATURES.length && !finaleStarted) startFinale();
}
cardWrap.addEventListener('click', (e) => { if (e.target === cardWrap) closeCard(); });

// ------------------------------------------------------------------
// Audio — chime on find (WebAudio), song hook at the finale
// ------------------------------------------------------------------
let AC = null;
const song = new Audio('./song.mp3');
song.preload = 'auto';
function chime(rare = false) {
  if (!AC) return;
  const notes = rare ? [523, 659, 784, 1047, 1319] : [659, 880, 1109];
  notes.forEach((f, i) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, AC.currentTime + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.22, AC.currentTime + i * 0.09 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + i * 0.09 + 0.5);
    o.connect(g).connect(AC.destination);
    o.start(AC.currentTime + i * 0.09);
    o.stop(AC.currentTime + i * 0.09 + 0.55);
  });
}

// ------------------------------------------------------------------
// Find logic
// ------------------------------------------------------------------
let nearKey = null;
function findablePos(key) {
  const o = actors[key];
  if (o.findPos) return o.findPos;
  return o.position;
}
function playCreatureGame(key) {
  running = false;
  runMiniGame(key, (result) => {
    running = true;
    last = performance.now();
    if (result) {
      try {
        const best = JSON.parse(localStorage.getItem('mh-scores') || '{}');
        if (!best[key] || result.score > best[key]) {
          best[key] = result.score;
          localStorage.setItem('mh-scores', JSON.stringify(best));
        }
      } catch (e) {}
      toast(result.line, 6500);
    }
    if (found.size === CREATURES.length && !finaleStarted) startFinale();
  });
}

let gameOverlay = null;
function openGame(sg) {
  if (gameOverlay) return;
  running = false;
  gameOverlay = document.createElement('div');
  gameOverlay.style.cssText = 'position:fixed;inset:0;z-index:60;background:#0d1218;display:flex;flex-direction:column';
  gameOverlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#123a30">
      <b style="color:#eef2f3;font-size:15px">${sg.emoji} ${sg.title}</b>
      <button id="gClose" style="background:#f4b53f;color:#241d10;border:none;border-radius:999px;
        padding:9px 18px;font-weight:700;font-size:14px;cursor:pointer;font-family:inherit">✕ Back to the meadow</button>
    </div>
    <iframe src="${sg.url}" style="flex:1;border:0;width:100%" allow="fullscreen"></iframe>`;
  document.body.appendChild(gameOverlay);
  // hand keyboard control to the embedded game (else Space/arrows stay with the meadow)
  const fr = gameOverlay.querySelector('iframe');
  const focusGame = () => { try { fr.contentWindow.focus(); } catch (e) {} fr.focus(); };
  fr.addEventListener('load', () => setTimeout(focusGame, 60));
  setTimeout(focusGame, 400);
  gameOverlay.addEventListener('pointerdown', (e) => { if (e.target === fr) focusGame(); });
  gameOverlay.querySelector('#gClose').addEventListener('click', () => {
    gameOverlay.remove();
    gameOverlay = null;
    running = true;
    last = performance.now();
    toast('Back in the meadow 🐞', 2200);
  });
}

function action() {
  if (cardWrap.classList.contains('show')) { closeCard(); return; }
  if (!nearKey) return;
  if (nearKey.startsWith('sign:')) {
    const sg = SIGNS.find(s => s.key === nearKey.slice(5));
    if (sg) openGame(sg);
    return;
  }
  // already-found creature → replay its game
  if (found.has(nearKey) && MINIGAME_KEYS.includes(nearKey)) {
    playCreatureGame(nearKey);
    return;
  }
  if (nearKey === 'scarab') {
    scarabPhase = 2;
    chime(true);
    showCard(BONUS, 'BB-010');
    player.expr('delighted'); buddy.expr('delighted');
    delightUntil = clockT + 4;
    nearKey = null;
    promptEl.classList.remove('show');
    return;
  }
  const c = CREATURES.find(x => x.key === nearKey);
  if (!c || found.has(c.key)) return;
  found.add(c.key);
  saveFound();
  document.getElementById('tk-' + c.key).classList.add('on');
  chime();
  showCard(c, `${found.size} / ${CREATURES.length}`);
  delightUntil = clockT + 2.5;
  nearKey = null;
  promptEl.classList.remove('show');
}

let finaleT0 = 0;
function startFinale() {
  finaleStarted = true;
  scarabPhase = 1;
  actors.scarab.visible = true;
  toast('You found all 14! …something is glinting on the big stone ✨', 5000);
}
function winMoment() {
  // song hook: "every day's a brand-new show… it's The Buggy Bros!"
  try { song.currentTime = 60.6; song.play(); setTimeout(() => song.pause(), 15400); } catch (e) {}
  for (const f of finFlies) f.visible = true;
  toast('Every day’s a brand-new show 🐞 You found them all!', 8000);
  setTimeout(() => {
    const p = document.createElement('div');
    p.className = 'overlay';
    p.innerHTML = `<div class="panel">
      <div class="kick">All 15 found</div>
      <h1>The Buggy <em>Bros</em></h1>
      <p>You noticed what most people walk right past.<br>That makes you a Buggy Bro too.</p>
      <button onclick="location.reload()">Explore again</button>
      <div class="hint"><a href="/games/" style="color:#38cba7;text-decoration:none">← more games</a> · <a href="/" style="color:#38cba7;text-decoration:none">thebuggybros.com</a></div>
    </div>`;
    document.body.appendChild(p);
  }, 15800);
}

// ------------------------------------------------------------------
// Main loop
// ------------------------------------------------------------------
let running = false;
let clockT = 0;
let last = performance.now();
const camPos = V3(0, 2.6, 8.5);
const tmpF = V3(0, 0, 0);

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!running) {
    // attract shot: drift around the clearing so the start screen looks like the game
    const a = now * 0.00008;
    camera.position.set(Math.sin(a) * 7.5, 3.4, Math.cos(a) * 7.5);
    camera.lookAt(0, 0.7, 0);
    camera.fov = 52; camera.updateProjectionMatrix();
    const at = now / 1000;
    for (const c of CREATURES) { try { BEHAVE[c.key](actors[c.key], at, null); } catch (e) {} }
    for (const sg of SIGNS) {
      const m = signMeshes[sg.key];
      m.rotation.y = Math.atan2(camera.position.x - sg.x, camera.position.z - sg.z);
    }
    player.reset(); buddy.reset();
    player.root.position.set(0.6, 0, 2.6); player.root.rotation.y = Math.PI;
    buddy.root.position.set(-0.5, 0, 3.2); buddy.root.rotation.y = Math.PI;
    player.idle(at); buddy.idle(at + 0.7);
    W.updateMotes(motes, at);
    renderer.render(scene, camera);
    return;
  }
  clockT += dt;
  const t = clockT;

  // --- input → movement (Roblox-style, camera-relative; forward = away from camera)
  let fwd = 0, strafe = 0;
  if (keys.KeyW || keys.ArrowUp) fwd += 1;
  if (keys.KeyS || keys.ArrowDown) fwd -= 1;
  if (keys.KeyA || keys.ArrowLeft) strafe -= 1;
  if (keys.KeyD || keys.ArrowRight) strafe += 1;
  if (joy) { strafe += joy.dx; fwd -= joy.dy; }
  const mag = Math.min(1, Math.hypot(fwd, strafe));
  player.reset();
  buddy.reset();

  // vertical: jump / fly
  if (flying) {
    vy = 0;
    if (keys.Space || keys.__up) vy = 3.4;
    if (keys.ShiftLeft || keys.ShiftRight || keys.__down) vy = -3.4;
    playerY = clamp(playerY + vy * dt, 0, 8.5);
  } else {
    if (wantJump && playerY <= 0.001) vy = 5.4;
    vy -= 14 * dt;
    playerY = Math.max(0, playerY + vy * dt);
    if (playerY === 0) vy = 0;
  }
  wantJump = false;

  if (mag > 0.08) {
    // world-space move direction from camera yaw
    const moveAngle = cam.yaw + Math.PI - Math.atan2(strafe, fwd);
    let dh = ((moveAngle - heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    heading += clamp(dh, -10 * dt, 10 * dt);
    const sp = (flying ? 4.2 : 2.6) * mag;
    const nx = player.root.position.x + Math.sin(moveAngle) * sp * dt;
    const nz = player.root.position.z + Math.cos(moveAngle) * sp * dt;
    if (Math.hypot(nx, nz) < 13.5) { player.root.position.x = nx; player.root.position.z = nz; }
    walkPhase += dt * 7.5 * mag;
    if (!flying && playerY === 0) player.walk(walkPhase, mag);
  }
  if (flying) {
    player.raiseArms(0.35, 0.85); // soaring pose
    player.legs.L.thigh.rotation.x = 0.25;
    player.legs.R.thigh.rotation.x = -0.15;
  } else if (playerY > 0.01) {
    player.raiseArms(0.2, 0.4); // jump pose
  }
  player.root.rotation.y = heading;
  player.root.position.y = playerY;

  // buddy follows
  const bTarget = V3(
    player.root.position.x - Math.sin(heading) * 1.15 - Math.cos(heading) * 0.5,
    0,
    player.root.position.z - Math.cos(heading) * 1.15 + Math.sin(heading) * 0.5
  );
  const bd = bTarget.sub(buddy.root.position);
  bd.y = 0;
  const bDist = bd.length();
  if (bDist > 0.25) {
    const bsp = Math.min(2.9, bDist * 2.2);
    buddy.root.position.addScaledVector(bd.normalize(), bsp * dt);
    buddy.root.rotation.y = Math.atan2(bd.x, bd.z);
    buddyPhase += dt * 8 * Math.min(1, bDist);
    buddy.walk(buddyPhase, Math.min(1, bDist));
  }

  // expressions
  if (t < delightUntil) { player.expr('delighted'); buddy.expr('delighted'); }

  // --- creatures
  const pp = player.root.position;
  for (const c of CREATURES) BEHAVE[c.key](actors[c.key], t, pp);
  if (scarabPhase >= 1) BEHAVE.scarab(actors.scarab, t);
  if (scarabPhase === 2 && !actors.scarab.userData._won) {
    actors.scarab.userData._won = true;
    winMoment();
  }
  for (const sg of SIGNS) {
    const m = signMeshes[sg.key];
    m.userData.board.position.y = 0.85 + Math.sin(t * 1.6) * 0.015;
    m.rotation.y = Math.atan2(camera.position.x - sg.x, camera.position.z - sg.z);
  }
  for (const [i, f] of finFlies.entries()) {
    if (!f.visible) continue;
    const ph = i * 1.3;
    f.position.set(Math.cos(t * 0.6 + ph * 2.1) * 1.4, 0.9 + Math.sin(t * 0.8 + ph) * 0.4, Math.sin(t * 0.5 + ph * 1.7) * 1.2);
    f.userData.setGlow(0.6 + 0.4 * Math.sin(t * 2.4 + ph * 3));
    f.userData.anim(t + ph);
  }

  // --- proximity prompt
  let best = null, bestD = 1e9;
  for (const c of CREATURES) {
    const d = pp.distanceTo(findablePos(c.key));
    if (d < bestD) { bestD = d; best = c.key; }
  }
  if (scarabPhase === 1) {
    const d = pp.distanceTo(actors.scarab.position);
    if (d < bestD) { bestD = d; best = 'scarab'; }
  }
  for (const sg of SIGNS) {
    const d = Math.hypot(pp.x - sg.x, pp.z - sg.z);
    if (d < bestD) { bestD = d; best = 'sign:' + sg.key; }
  }
  const reach = best === 'dragonfly' || best === 'butterfly' || best === 'bee' ? 2.2 : 1.8;
  if (best && bestD < reach && !cardWrap.classList.contains('show')) {
    if (nearKey !== best) {
      nearKey = best;
      if (best.startsWith('sign:')) {
        const sg = SIGNS.find(s => s.key === best.slice(5));
        promptEl.textContent = `${sg.emoji} Play ${sg.title} ${IS_TOUCH ? '' : '(E)'}`;
      } else if (found.has(best)) {
        const c = CREATURES.find(x => x.key === best);
        promptEl.textContent = `${c.emoji} Play its game ${IS_TOUCH ? '' : '(E)'}`;
      } else {
        promptEl.textContent = `👀 Look closer ${IS_TOUCH ? '' : '(E)'}`;
      }
      promptEl.classList.add('show');
    }
  } else if (nearKey) {
    nearKey = null;
    promptEl.classList.remove('show');
  }

  // player looks at the nearby creature or signpost
  if (nearKey) {
    if (nearKey.startsWith('sign:')) {
      const sg = SIGNS.find(s => s.key === nearKey.slice(5));
      player.lookAtWorld(V3(sg.x, 0.9, sg.z), 0.6);
    } else {
      player.lookAtWorld(findablePos(nearKey === 'scarab' ? 'scarab' : nearKey), 0.6);
    }
  }
  player.idle(t);
  buddy.idle(t + 0.7);

  // --- camera: user-controlled orbit (Roblox classic — no auto-chase)
  const cp = Math.cos(cam.pitch), spx = Math.sin(cam.pitch);
  const desired = V3(
    pp.x + Math.sin(cam.yaw) * cam.dist * cp,
    Math.max(0.35, playerY + 1.0 + spx * cam.dist),
    pp.z + Math.cos(cam.yaw) * cam.dist * cp
  );
  camPos.lerp(desired, 1 - Math.pow(0.00005, dt));
  camera.position.copy(camPos);
  camera.lookAt(pp.x, playerY + 0.95, pp.z);

  W.updateMotes(motes, t);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ------------------------------------------------------------------
// Start
// ------------------------------------------------------------------
document.getElementById('startHint').textContent = IS_TOUCH
  ? 'Left side: walk. Right side: look around. Tap the button when something looks interesting.'
  : 'WASD/arrows: walk · click-drag: look around · Space: jump · double-Space: fly · E: look closer';
if (found.size > 0 && found.size < CREATURES.length) {
  document.getElementById('startBtn').textContent = `Keep exploring — ${found.size}/${CREATURES.length} found`;
} else if (found.size === CREATURES.length) {
  document.getElementById('startBtn').textContent = 'Return to the meadow';
}
const DEEP = new URLSearchParams(location.search).get('play');
if (DEEP && MINIGAME_KEYS.includes(DEEP)) {
  const c = CREATURES.find(x => x.key === DEEP);
  const b = document.getElementById('startBtn');
  if (c) b.textContent = `▶ Play ${c.emoji} ${c.name.toLowerCase()}`;
}
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startOverlay').remove();
  AC = new (window.AudioContext || window.webkitAudioContext)();
  song.load(); // unlock audio on the user gesture
  running = true;
  if (DEEP && MINIGAME_KEYS.includes(DEEP)) {
    const home = HOME[DEEP];
    if (home) { player.root.position.set(home[0] + 1.2, 0, home[1] + 1.2); }
    if (!found.has(DEEP)) { found.add(DEEP); saveFound(); document.getElementById('tk-' + DEEP)?.classList.add('on'); }
    playCreatureGame(DEEP);
  } else {
    toast('The meadow is full of tiny neighbors. Go say hello 🐞', 4200);
  }
});

// test/debug handle (harmless in production)
window.__mh = {
  player, actors, found, action,
  teleport(x, z) { player.root.position.set(x, 0, z); },
  ready: () => running,
};
