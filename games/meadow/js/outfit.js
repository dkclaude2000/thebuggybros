// The approved character package: dark BB trucker caps, logo tees, ink faces, pro gear.
import * as THREE from 'three';
import { mat, PAL } from './world.js';

const TEAL = '#38cba7', AMBER = '#f4b53f';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawJarMark(ctx, x, y, s, stroke = TEAL, lw = 7) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 100, s / 100);
  ctx.fillStyle = AMBER;
  rr(ctx, 28, 4, 44, 13, 5); ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  rr(ctx, 22, 21, 56, 62, 14); ctx.stroke();
  ctx.fillStyle = stroke;
  ctx.beginPath(); ctx.ellipse(50, 56, 11, 15, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = AMBER;
  ctx.beginPath(); ctx.arc(50, 39, 6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function teeLogoTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  rr(x, 40, 40, 176, 176, 36);
  x.fillStyle = '#123a30';
  x.fill();
  drawJarMark(x, 63, 58, 118);
  x.font = '800 30px "Avenir Next Condensed", "Arial Narrow", sans-serif';
  x.textAlign = 'center';
  x.fillStyle = '#fff';
  x.fillText('BUGGY BROS', 128, 200);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function bbEmbossTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  x.font = '900 148px "Avenir Next Condensed", "Arial Narrow", "Arial Black", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillStyle = 'rgba(0,0,0,0.45)';
  x.fillText('BB', 134, 138);
  x.fillStyle = '#f4efe2';
  x.fillText('BB', 128, 132);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function meshTex(colorHex) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = colorHex;
  x.fillRect(0, 0, 128, 128);
  x.fillStyle = 'rgba(0,0,0,0.35)';
  for (let i = 8; i < 128; i += 16) for (let j = 8; j < 128; j += 16) {
    x.beginPath(); x.arc(i, j, 3.4, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  return t;
}

function nettingTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 128);
  x.strokeStyle = 'rgba(255,255,255,0.9)';
  x.lineWidth = 2.5;
  for (let i = 0; i <= 128; i += 12) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 128); x.stroke();
    x.beginPath(); x.moveTo(0, i); x.lineTo(128, i); x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  return t;
}

let _bbTex = null;

// dark BB trucker cap: ink-green crown, mesh back, per-bro brim color
export function darkBBCap(headR, brimHex) {
  if (!_bbTex) _bbTex = bbEmbossTex();
  const g = new THREE.Group();
  const r = headR * 1.1;
  const CAP = 0x16352c;
  const front = new THREE.Mesh(
    new THREE.SphereGeometry(r, 20, 12, 0, Math.PI, 0, Math.PI * 0.46),
    mat(CAP, { rough: 0.8 })
  );
  const back = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.995, 20, 12, Math.PI, Math.PI, 0, Math.PI * 0.48),
    new THREE.MeshStandardMaterial({ map: meshTex('#12291f'), roughness: 0.9 })
  );
  g.add(front, back);
  const btn = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 8, 6), mat(brimHex));
  btn.position.y = r * 0.98;
  g.add(btn);
  const brim = new THREE.Mesh(new THREE.SphereGeometry(r * 0.82, 18, 10), mat(brimHex, { rough: 0.7 }));
  brim.scale.set(1.05, 0.075, 1.35);
  brim.position.set(0, r * 0.14, r * 0.92);
  brim.rotation.x = 0.1;
  g.add(brim);
  const bb = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 0.78, r * 0.78),
    new THREE.MeshStandardMaterial({ map: _bbTex, transparent: true, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  bb.position.set(0, r * 0.42, r * 1.0);
  bb.rotation.x = -0.34;
  g.add(bb);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- pro gear ----------
export function proNet() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.95, 10), mat(0x3f4450, { rough: 0.5, metal: 0.4 }));
  handle.position.y = 0.475;
  g.add(handle);
  for (const gy of [0.1, 0.2, 0.3]) {
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.055, 10), mat(PAL.amber, { rough: 0.85 }));
    grip.position.y = gy;
    g.add(grip);
  }
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.06, 10), mat(PAL.amber, { rough: 0.5, metal: 0.5 }));
  collar.position.y = 0.93;
  g.add(collar);
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.016, 10, 28), mat(PAL.teal, { rough: 0.35, metal: 0.5 }));
  hoop.position.y = 1.12;
  hoop.rotation.x = Math.PI / 2;
  g.add(hoop);
  const netM = new THREE.MeshStandardMaterial({
    map: nettingTex(), transparent: true, alphaTest: 0.25, side: THREE.DoubleSide, roughness: 0.9,
  });
  const net = new THREE.Mesh(new THREE.ConeGeometry(0.165, 0.42, 18, 4, true), netM);
  net.position.y = 0.92;
  g.add(net);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function observationJar() {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd9f7ec, roughness: 0.05, transmission: 0.85, transparent: true, opacity: 0.5, thickness: 0.1, ior: 1.4,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.105, 0.24, 18), glass);
  body.position.y = 0.12;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.04, 18), mat(PAL.amber, { rough: 0.4, metal: 0.4 }));
  lid.position.y = 0.26;
  g.add(lid);
  const lensRim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 8, 18), mat(PAL.teal, { rough: 0.35, metal: 0.5 }));
  lensRim.rotation.x = Math.PI / 2;
  lensRim.position.y = 0.285;
  g.add(lensRim);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.05, 18), new THREE.MeshPhysicalMaterial({
    color: 0xeafcff, transparent: true, opacity: 0.4, roughness: 0.05, side: THREE.DoubleSide,
  }));
  lens.rotation.x = -Math.PI / 2;
  lens.position.y = 0.286;
  g.add(lens);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.042, 6), mat(0x8a6a20));
    hole.position.set(Math.cos(a) * 0.085, 0.26, Math.sin(a) * 0.085);
    g.add(hole);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function utilityBelt(waistR) {
  const g = new THREE.Group();
  const belt = new THREE.Mesh(new THREE.TorusGeometry(waistR, 0.02, 8, 24), mat(0x6b4f35, { rough: 0.8 }));
  belt.rotation.x = Math.PI / 2;
  g.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.015), mat(PAL.amber, { metal: 0.6, rough: 0.35 }));
  buckle.position.set(0, 0, waistR + 0.005);
  g.add(buckle);
  const vialColors = [0x9ee37d, 0xf4b53f, 0x7dd6e3];
  vialColors.forEach((vc, i) => {
    const a = Math.PI * (0.28 + i * 0.18);
    const vial = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 8),
      new THREE.MeshPhysicalMaterial({ color: vc, transparent: true, opacity: 0.7, roughness: 0.2 }));
    vial.position.set(Math.cos(a) * waistR, -0.035, Math.sin(a) * waistR);
    g.add(vial);
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.018, 8), mat(0xb98d5f));
    cork.position.set(Math.cos(a) * waistR, 0.002, Math.sin(a) * waistR);
    g.add(cork);
  });
  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.03), mat(0x50713a, { rough: 0.9 }));
  pouch.position.set(-waistR - 0.005, -0.045, 0.02);
  pouch.rotation.y = 0.3;
  g.add(pouch);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function explorerPack(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.2, 0.09), mat(color, { rough: 0.85 }));
  g.add(body);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 12), mat(0xd8c8a8, { rough: 0.95 }));
  roll.rotation.z = Math.PI / 2;
  roll.position.y = 0.105;
  g.add(roll);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 10), mat(PAL.teal, { rough: 0.4, metal: 0.3 }));
  bottle.position.set(0.105, -0.03, 0);
  g.add(bottle);
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.025), mat(color));
  pocket.material.color.offsetHSL(0, 0, -0.07);
  pocket.position.set(0, -0.05, 0.056);
  g.add(pocket);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------- ink faces ----------
const _faceCache = {};
export function inkFace(expr) {
  if (_faceCache[expr]) return _faceCache[expr];
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.lineCap = 'round';
  x.lineJoin = 'round';
  x.strokeStyle = '#2a241f';
  x.fillStyle = '#2a241f';
  const LW = 24;
  x.lineWidth = LW;
  const eyeY = 225, mouthY = 375;
  const L = 146, R = 366;

  const dotEye = (ex, ry = 38) => { x.beginPath(); x.ellipse(ex, eyeY, 24, ry, 0, 0, Math.PI * 2); x.fill(); };
  const openEye = (ex, r = 46, px = 0, py = 0) => {
    x.beginPath(); x.arc(ex, eyeY, r, 0, Math.PI * 2); x.stroke();
    x.beginPath(); x.arc(ex + px, eyeY + py, 17, 0, Math.PI * 2); x.fill();
  };
  const happyEye = (ex) => { x.beginPath(); x.arc(ex, eyeY + 16, 44, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); };
  const closedEye = (ex) => { x.beginPath(); x.arc(ex, eyeY - 16, 44, Math.PI * 0.15, Math.PI * 0.85); x.stroke(); };
  const lidEye = (ex) => {
    x.beginPath(); x.ellipse(ex, eyeY, 24, 32, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#e8b68a'; x.lineWidth = LW + 16;
    x.beginPath(); x.moveTo(ex - 40, eyeY - 26); x.lineTo(ex + 40, eyeY - 26); x.stroke();
    x.strokeStyle = '#2a241f'; x.lineWidth = LW;
    x.beginPath(); x.moveTo(ex - 40, eyeY - 20); x.lineTo(ex + 40, eyeY - 20); x.stroke();
  };
  const brow = (ex, tilt = 0, lift = 0) => {
    x.beginPath();
    x.moveTo(ex - 50, eyeY - 92 - lift + tilt * 18);
    x.quadraticCurveTo(ex, eyeY - 122 - lift - tilt * 6, ex + 50, eyeY - 92 - lift - tilt * 18);
    x.stroke();
  };
  const smile = (w = 90, d = 66) => {
    x.beginPath(); x.moveTo(256 - w, mouthY - 10); x.quadraticCurveTo(256, mouthY + d, 256 + w, mouthY - 10); x.stroke();
  };

  switch (expr) {
    case 'amused':
      dotEye(L); dotEye(R);
      brow(L, 0, 6); brow(R, 0, 6);
      smile();
      x.beginPath(); x.moveTo(346, mouthY - 10); x.lineTo(368, mouthY - 28); x.stroke();
      break;
    case 'wonder': // soft awe — bright eyes, lifted brows, gentle open smile
      dotEye(L, 42); dotEye(R, 42);
      brow(L, 0, 20); brow(R, 0, 20);
      smile(72, 50);
      break;
    case 'curious':
      openEye(L, 26, 8); dotEye(R, 24);
      brow(L, 0, 30); brow(R, -0.6, 0);
      x.beginPath(); x.ellipse(274, mouthY + 8, 24, 30, 0, 0, Math.PI * 2); x.stroke();
      break;
    case 'delighted':
      happyEye(L); happyEye(R);
      brow(L, 0, 14); brow(R, 0, 14);
      x.beginPath(); x.moveTo(150, mouthY - 20); x.quadraticCurveTo(256, mouthY + 92, 362, mouthY - 20);
      x.quadraticCurveTo(256, mouthY + 26, 150, mouthY - 20); x.fill();
      break;
    case 'serious':
      lidEye(L); lidEye(R);
      brow(L, -0.35, -4); brow(R, 0.35, -4);
      x.beginPath(); x.moveTo(190, mouthY + 10); x.lineTo(322, mouthY + 10); x.stroke();
      break;
    case 'determined':
      dotEye(L, 22); dotEye(R, 22);
      brow(L, -0.55, -10); brow(R, 0.55, -10);
      x.beginPath(); x.moveTo(196, mouthY + 14); x.quadraticCurveTo(270, mouthY + 38, 330, mouthY - 4); x.stroke();
      break;
    case 'blink':
      closedEye(L); closedEye(R);
      brow(L, 0, 2); brow(R, 0, 2);
      smile(80, 56);
      break;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  _faceCache[expr] = t;
  return t;
}
