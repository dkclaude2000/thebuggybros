import * as THREE from 'three';
import { mat } from './world.js';
import { clamp, lerp } from './util.js';

// Every maker returns a THREE.Group with grp.userData.anim = (t) => {} for idle motion.
// Position/paths are driven by the shot code; anim handles wings/legs/antennae.

function eyePair(parent, r, x, y, z, color = 0x1a1512) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.25 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), m);
    e.position.set(sx * x, y, z);
    parent.add(e);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(sx * x + r * 0.3, y + r * 0.35, z + r * 0.7);
    parent.add(glint);
  }
}

function antennae(parent, len, x, y, z, color = 0x2a2018) {
  const list = [];
  for (const sx of [-1, 1]) {
    const a = new THREE.Group();
    a.position.set(sx * x, y, z);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, len, 6), mat(color));
    seg.position.y = len / 2;
    a.add(seg);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), mat(color));
    tip.position.y = len;
    a.add(tip);
    a.rotation.x = 0.7;
    a.rotation.z = -sx * 0.35;
    parent.add(a);
    list.push(a);
  }
  return list;
}

function legSet(parent, n, bodyR, legLen, color, yBase = 0) {
  const legs = [];
  const lm = mat(color);
  for (let i = 0; i < n / 2; i++) {
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group();
      const zt = (i / Math.max(1, n / 2 - 1) - 0.5) * bodyR * 1.6;
      hip.position.set(sx * bodyR * 0.8, yBase, zt);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, legLen * 0.55, 5), lm);
      upper.position.y = -legLen * 0.27;
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.y = -legLen * 0.55;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, legLen * 0.55, 5), lm);
      lower.position.y = -legLen * 0.27;
      knee.add(lower);
      hip.add(knee);
      hip.rotation.z = sx * 0.75;
      knee.rotation.z = -sx * 1.1;
      hip.userData.phase = i * 2.1 + (sx > 0 ? Math.PI : 0);
      hip.userData.sx = sx;
      hip.userData.baseZ = sx * 0.75;
      parent.add(hip);
      legs.push(hip);
    }
  }
  return legs;
}

function walkLegs(legs, t, speed = 10, amp = 0.25) {
  for (const l of legs) l.rotation.x = Math.sin(t * speed + l.userData.phase) * amp;
}

// ---------- 1 ladybug ----------
export function makeLadybug() {
  const grp = new THREE.Group();
  const body = new THREE.Group();
  grp.add(body);
  const shellM = mat(0xd6382c, { rough: 0.35 });
  const shellGeo = new THREE.SphereGeometry(0.17, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  const wingL = new THREE.Mesh(shellGeo, shellM);
  const wingR = new THREE.Mesh(shellGeo, shellM);
  for (const [w, sx] of [[wingL, -1], [wingR, 1]]) {
    w.scale.set(0.55, 0.8, 1.05);
    w.position.set(sx * 0.045, 0.09, -0.01);
    w.rotation.z = sx * 0.08;
    w.castShadow = true;
    body.add(w);
  }
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), mat(0x241d18));
  under.scale.set(0.9, 0.6, 1.05);
  under.position.y = 0.08;
  body.add(under);
  const dotM = mat(0x241d18, { rough: 0.4 });
  for (const [dx, dz, s] of [[-0.08, -0.05, 1], [0.08, -0.05, 1], [-0.1, 0.06, 0.8], [0.1, 0.06, 0.8], [-0.05, 0.11, 0.7], [0.05, 0.11, 0.7]]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.028 * s, 10), dotM);
    d.position.set(dx, 0.185 + 0.02, dz - 0.02);
    d.lookAt(dx * 3, 1.2, (dz - 0.02) * 3);
    d.position.y -= 0.015;
    body.add(d);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mat(0x241d18));
  head.position.set(0, 0.075, 0.155);
  body.add(head);
  eyePair(head, 0.02, 0.04, 0.03, 0.045, 0xffffff);
  const ant = antennae(body, 0.09, 0.03, 0.12, 0.2);
  const legs = legSet(body, 6, 0.13, 0.14, 0x241d18, 0.05);
  grp.userData.wings = [wingL, wingR];
  grp.userData.anim = (t) => {
    walkLegs(legs, t, 9, 0.3);
    body.position.y = Math.sin(t * 9) * 0.004;
    for (const a of ant) a.rotation.x = 0.7 + Math.sin(t * 3 + a.position.x) * 0.12;
  };
  return grp;
}

// ---------- 2 firefly / lightning bug ----------
export function makeFirefly() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.12, 6, 10), mat(0x35302a, { rough: 0.5 }));
  body.rotation.x = Math.PI / 2;
  grp.add(body);
  const pronotum = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0xc0392b));
  pronotum.scale.set(1, 0.5, 0.9);
  pronotum.position.set(0, 0.03, 0.09);
  grp.add(pronotum);
  const glowM = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc94d, emissiveIntensity: 0.4, roughness: 0.4 });
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), glowM);
  tail.scale.set(0.9, 0.85, 1.2);
  tail.position.set(0, -0.01, -0.12);
  grp.add(tail);
  const spriteM = new THREE.SpriteMaterial({
    map: glowTexture(), color: 0xffd97a, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const halo = new THREE.Sprite(spriteM);
  halo.scale.setScalar(0.7);
  halo.position.copy(tail.position);
  grp.add(halo);
  const wm = new THREE.MeshStandardMaterial({ color: 0xcfd8d0, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.055, 0.02);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.2), wm);
    w.rotation.x = -Math.PI / 2;
    w.position.set(sx * 0.06, 0, -0.06);
    pivot.add(w);
    pivot.userData.sx = sx;
    grp.add(pivot);
    wings.push(pivot);
  }
  grp.userData.setGlow = (k) => {
    glowM.emissiveIntensity = 0.4 + k * 3.2;
    spriteM.opacity = k * 0.85;
  };
  grp.userData.anim = (t) => {
    for (const w of wings) w.rotation.z = w.userData.sx * (0.25 + Math.sin(t * 60 + w.userData.sx) * 0.5);
  };
  return grp;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,240,190,1)');
  g.addColorStop(0.35, 'rgba(255,214,110,0.55)');
  g.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

// ---------- 3 dragonfly ----------
export function makeDragonfly() {
  const grp = new THREE.Group();
  const bodyM = mat(0x2e9bb5, { rough: 0.35, metal: 0.25 });
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), bodyM);
  thorax.scale.set(1, 0.9, 1.3);
  grp.add(thorax);
  const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.018, 0.72, 8), bodyM);
  abdomen.rotation.x = Math.PI / 2;
  abdomen.position.set(0, 0.01, -0.44);
  grp.add(abdomen);
  for (let i = 0; i < 6; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.033 - i * 0.0025, 0.006, 6, 10), mat(0x1c6b80));
    ring.position.set(0, 0.01, -0.16 - i * 0.11);
    grp.add(ring);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), bodyM);
  head.position.set(0, 0.02, 0.13);
  grp.add(head);
  eyePair(head, 0.042, 0.038, 0.02, 0.02, 0x174f42);
  const wingM = new THREE.MeshPhysicalMaterial({
    color: 0xdff6ff, transparent: true, opacity: 0.3, roughness: 0.1,
    side: THREE.DoubleSide, iridescence: 0.9, iridescenceIOR: 1.3,
  });
  const wings = [];
  for (const [sx, zoff] of [[-1, 0.05], [1, 0.05], [-1, -0.12], [1, -0.12]]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.07, zoff);
    const wg = new THREE.PlaneGeometry(0.62, 0.13);
    const w = new THREE.Mesh(wg, wingM);
    w.rotation.x = -Math.PI / 2;
    w.position.x = sx * 0.33;
    pivot.add(w);
    pivot.userData = { sx, ph: zoff * 10 };
    grp.add(pivot);
    wings.push(pivot);
  }
  grp.userData.anim = (t) => {
    for (const w of wings) w.rotation.z = w.userData.sx * (0.08 + Math.sin(t * 55 + w.userData.ph) * 0.3);
  };
  return grp;
}

// ---------- 4 bumblebee ----------
export function makeBumblebee() {
  const grp = new THREE.Group();
  const fuzz = { rough: 1.0 };
  const body = new THREE.Group();
  grp.add(body);
  const segs = [
    [0xf2c23e, 0.11, 0.06], [0x2b241d, 0.115, -0.02], [0xf2c23e, 0.105, -0.1], [0x2b241d, 0.08, -0.17],
  ];
  for (const [c, r, z] of segs) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat(c, fuzz));
    s.position.z = z;
    s.scale.set(1, 0.92, 1);
    s.castShadow = true;
    body.add(s);
  }
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(0x2b241d, fuzz));
  head.position.z = 0.15;
  body.add(head);
  eyePair(head, 0.024, 0.035, 0.015, 0.045, 0x4a4038);
  antennae(head, 0.08, 0.025, 0.05, 0.03);
  const wm = new THREE.MeshStandardMaterial({ color: 0xe8f4f8, transparent: true, opacity: 0.45, side: THREE.DoubleSide });
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.1, -0.02);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.12), wm);
    w.rotation.x = -Math.PI / 2;
    w.position.x = sx * 0.12;
    pivot.add(w);
    pivot.userData.sx = sx;
    body.add(pivot);
    wings.push(pivot);
  }
  const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 8), mat(0x2b241d));
  stinger.rotation.x = Math.PI / 2;
  stinger.position.z = -0.24;
  body.add(stinger);
  grp.userData.anim = (t) => {
    for (const w of wings) w.rotation.z = w.userData.sx * (0.2 + Math.sin(t * 70) * 0.55);
    body.position.y = Math.sin(t * 8) * 0.02;
  };
  return grp;
}

// ---------- 5 butterfly (monarch-ish painted wings) ----------
function butterflyWingTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  // forewing + hindwing silhouette
  x.fillStyle = '#e8862c';
  x.beginPath();
  x.moveTo(10, 128);
  x.bezierCurveTo(30, 20, 150, 0, 240, 30);
  x.bezierCurveTo(250, 80, 200, 120, 130, 130);
  x.bezierCurveTo(200, 150, 230, 190, 200, 235);
  x.bezierCurveTo(140, 250, 40, 220, 10, 128);
  x.closePath();
  x.fill();
  // dark veins + border
  x.strokeStyle = '#241a12'; x.lineWidth = 12; x.stroke();
  x.lineWidth = 5;
  for (const [x1, y1, x2, y2] of [[20, 128, 200, 40], [20, 128, 225, 70], [20, 128, 190, 128], [20, 128, 205, 210], [20, 128, 150, 235]]) {
    x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
  }
  // white spots on border
  x.fillStyle = '#fff7ea';
  for (const [sx, sy] of [[235, 45], [242, 85], [215, 200], [175, 232], [90, 235], [150, 12], [70, 30]]) {
    x.beginPath(); x.arc(sx, sy, 7, 0, Math.PI * 2); x.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function makeButterfly() {
  const grp = new THREE.Group();
  const tex = butterflyWingTexture();
  const wm = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide, roughness: 0.8,
    alphaTest: 0.2,
  });
  const wings = [];
  for (const sx of [-1, 1]) {
    const wg = new THREE.PlaneGeometry(0.42, 0.42);
    wg.translate(sx * 0.21, 0, 0);
    const w = new THREE.Mesh(wg, wm);
    w.rotation.x = -Math.PI / 2;
    if (sx < 0) w.scale.x = -1;
    grp.add(w);
    w.userData.sx = sx;
    wings.push(w);
  }
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.22, 6, 8), mat(0x241a12));
  body.rotation.x = Math.PI / 2;
  grp.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), mat(0x241a12));
  head.position.z = 0.14;
  grp.add(head);
  antennae(head, 0.12, 0.02, 0.02, 0.01);
  grp.userData.wings = wings;
  grp.userData.anim = (t) => {
    for (const w of wings) w.rotation.y = w.userData.sx * -Math.abs(Math.sin(t * 9)) * 1.1;
  };
  return grp;
}

// ---------- 6 beetle ----------
export function makeBeetle() {
  const grp = new THREE.Group();
  const shellM = mat(0x28354d, { rough: 0.25, metal: 0.5 });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2), shellM);
  shell.scale.set(0.8, 0.75, 1.15);
  shell.position.y = 0.06;
  shell.castShadow = true;
  grp.add(shell);
  // elytra ridge line
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 0.4), mat(0x1a2334));
  ridge.position.y = 0.22;
  grp.add(ridge);
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), mat(0x1a2334));
  under.scale.set(0.75, 0.5, 1.1);
  under.position.y = 0.07;
  grp.add(under);
  const pron = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), shellM);
  pron.scale.set(0.85, 0.6, 0.7);
  pron.position.set(0, 0.1, 0.2);
  grp.add(pron);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(0x1a2334));
  head.position.set(0, 0.07, 0.3);
  grp.add(head);
  eyePair(head, 0.02, 0.045, 0.025, 0.05, 0xd8d2c8);
  const ant = antennae(head, 0.14, 0.04, 0.05, 0.05);
  const legs = legSet(grp, 6, 0.17, 0.16, 0x1a2334, 0.05);
  grp.userData.anim = (t) => {
    walkLegs(legs, t, 7, 0.28);
    for (const a of ant) a.rotation.x = 0.7 + Math.sin(t * 2.4 + a.position.x * 9) * 0.18;
  };
  return grp;
}

// ---------- 7 cricket ----------
export function makeCricket() {
  const grp = new THREE.Group();
  const bodyM = mat(0x6b5a35, { rough: 0.7 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.18, 8, 12), bodyM);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.1;
  body.castShadow = true;
  grp.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), bodyM);
  head.position.set(0, 0.12, 0.15);
  grp.add(head);
  eyePair(head, 0.022, 0.04, 0.02, 0.04);
  antennae(head, 0.18, 0.03, 0.05, 0.03, 0x4a3d22);
  const legs = legSet(grp, 4, 0.07, 0.1, 0x4a3d22, 0.08);
  // big back legs — these fiddle
  const backLegs = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.08, 0.12, -0.06);
    const femur = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.14, 6, 8), mat(0x5a4a28));
    femur.position.y = 0.07;
    femur.rotation.z = sx * 0.5;
    hip.add(femur);
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.2, 6), mat(0x4a3d22));
    tibia.position.set(sx * 0.1, 0.05, -0.02);
    tibia.rotation.z = sx * 2.4;
    hip.add(tibia);
    grp.add(hip);
    hip.userData.sx = sx;
    backLegs.push(hip);
  }
  grp.userData.backLegs = backLegs;
  grp.userData.anim = (t) => {
    walkLegs(legs, t, 0, 0);
    // fiddling: back legs rub in alternation
    for (const l of backLegs) l.rotation.x = Math.sin(t * 13 + (l.userData.sx > 0 ? Math.PI : 0)) * 0.22 - 0.1;
    grp.userData._bob = Math.sin(t * 13) * 0.006;
  };
  return grp;
}

// ---------- 8 ant ----------
export function makeAnt(carry = false) {
  const grp = new THREE.Group();
  const am = mat(0x6e3b24, { rough: 0.5 });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), am);
  abdomen.scale.set(0.85, 0.85, 1.25);
  abdomen.position.set(0, 0.075, -0.1);
  grp.add(abdomen);
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), am);
  thorax.position.set(0, 0.08, 0);
  grp.add(thorax);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), am);
  head.scale.set(0.9, 0.95, 1);
  head.position.set(0, 0.09, 0.075);
  grp.add(head);
  eyePair(head, 0.013, 0.025, 0.012, 0.03);
  antennae(head, 0.07, 0.018, 0.035, 0.03, 0x552d1b);
  const legs = legSet(grp, 6, 0.045, 0.09, 0x552d1b, 0.075);
  if (carry) {
    const crumb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.045, 0), mat(0xe9d9a8));
    crumb.position.set(0, 0.16, 0.06);
    grp.add(crumb);
  }
  grp.userData.anim = (t) => walkLegs(legs, t, 14, 0.4);
  return grp;
}

// ---------- 9 grasshopper ----------
export function makeGrasshopper() {
  const grp = new THREE.Group();
  const gm = mat(0x71a83c, { rough: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.3, 8, 12), gm);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.14;
  body.castShadow = true;
  grp.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), gm);
  head.scale.set(0.85, 1.1, 0.95);
  head.position.set(0, 0.17, 0.2);
  grp.add(head);
  eyePair(head, 0.028, 0.04, 0.035, 0.035, 0x3d2e1e);
  antennae(head, 0.24, 0.025, 0.09, 0.02, 0x557a2c);
  // wing cover line
  const cover = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.28, 6, 8), mat(0x5c8c30));
  cover.rotation.x = Math.PI / 2 - 0.06;
  cover.position.set(0, 0.19, -0.05);
  grp.add(cover);
  const frontLegs = legSet(grp, 4, 0.06, 0.1, 0x557a2c, 0.12);
  // big jumping legs with knee joints
  const jump = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.08, 0.16, -0.08);
    const femur = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.2, 6, 8), gm);
    femur.position.y = 0.1;
    hip.add(femur);
    const knee = new THREE.Group();
    knee.position.y = 0.21;
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.26, 6), mat(0x557a2c));
    tibia.position.y = -0.13;
    knee.add(tibia);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), mat(0x557a2c));
    foot.position.y = -0.26;
    knee.add(foot);
    hip.add(knee);
    hip.rotation.x = 0.9;
    knee.rotation.x = -2.4;
    hip.rotation.z = sx * 0.22;
    grp.add(hip);
    jump.push({ hip, knee });
  }
  grp.userData.jumpLegs = jump;
  // coil 0 (folded) → 1 (extended)
  grp.userData.setLegExtend = (k) => {
    for (const { hip, knee } of jump) {
      hip.rotation.x = lerp(0.9, 0.15, k);
      knee.rotation.x = lerp(-2.4, -0.3, k);
    }
  };
  grp.userData.anim = (t) => {
    walkLegs(frontLegs, t, 0, 0);
  };
  return grp;
}

// ---------- 10 pill bug (walker + ball forms) ----------
export function makePillbug() {
  const grp = new THREE.Group();
  const walker = new THREE.Group();
  grp.add(walker);
  const pm = mat(0x7d8289, { rough: 0.55, metal: 0.1 });
  const plates = [];
  for (let i = 0; i < 7; i++) {
    const r = 0.11 * (1 - Math.abs(i - 3) * 0.09);
    const p = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), pm);
    p.scale.set(1.15, 0.85, 0.62);
    p.position.set(0, 0.055, 0.14 - i * 0.048);
    p.castShadow = true;
    walker.add(p);
    plates.push(p);
  }
  const headP = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(0x666b73));
  headP.position.set(0, 0.05, 0.19);
  walker.add(headP);
  eyePair(headP, 0.013, 0.03, 0.02, 0.04);
  antennae(headP, 0.07, 0.025, 0.03, 0.045, 0x555a61);
  const legs = legSet(walker, 8, 0.075, 0.06, 0x555a61, 0.04);
  // ball form
  const ball = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), pm);
  core.castShadow = true;
  ball.add(core);
  for (let i = -2; i <= 2; i++) {
    const seam = new THREE.Mesh(new THREE.TorusGeometry(Math.cos(i * 0.45) * 0.115, 0.006, 6, 20), mat(0x63686f));
    seam.rotation.x = Math.PI / 2;
    seam.position.y = Math.sin(i * 0.45) * 0.115;
    core.add(seam);
  }
  ball.visible = false;
  grp.add(ball);
  grp.userData.walker = walker;
  grp.userData.ball = ball;
  grp.userData.setBall = (isBall) => { walker.visible = !isBall; ball.visible = isBall; };
  grp.userData.anim = (t) => walkLegs(legs, t, 8, 0.3);
  return grp;
}

// ---------- 11 daddy longlegs ----------
export function makeLonglegs() {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), mat(0x8a6a4a, { rough: 0.6 }));
  body.scale.set(1, 0.8, 1.15);
  body.castShadow = true;
  const bodyPivot = new THREE.Group();
  bodyPivot.add(body);
  grp.add(bodyPivot);
  eyePair(body, 0.016, 0.03, 0.03, 0.07);
  const legs = [];
  const legM = mat(0x54402c);
  for (let i = 0; i < 4; i++) {
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group();
      const zt = (i / 3 - 0.5) * 0.14;
      hip.position.set(sx * 0.06, 0, zt);
      const upperLen = 0.55;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, upperLen, 5), legM);
      upper.position.y = upperLen / 2;
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.y = upperLen;
      const lowerLen = 0.62;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, lowerLen, 5), legM);
      lower.position.y = -lowerLen / 2;
      knee.add(lower);
      hip.add(knee);
      hip.rotation.z = sx * (2.0 - Math.abs(i - 1.5) * 0.12);
      hip.rotation.x = (i - 1.5) * 0.35;
      knee.rotation.z = -sx * 2.5;
      hip.userData = { sx, phase: i * 1.7 + (sx > 0 ? Math.PI : 0), baseX: hip.rotation.x };
      bodyPivot.add(hip);
      legs.push(hip);
    }
  }
  grp.userData.bodyPivot = bodyPivot;
  grp.userData.anim = (t) => {
    for (const l of legs) l.rotation.x = l.userData.baseX + Math.sin(t * 5 + l.userData.phase) * 0.22;
    bodyPivot.position.y = Math.sin(t * 5) * 0.015;
  };
  return grp;
}

// ---------- 12 spider + web ----------
export function makeWeb(radius = 0.9) {
  const grp = new THREE.Group();
  const silkM = new THREE.MeshBasicMaterial({ color: 0xf7f7ee, transparent: true, opacity: 0.75 });
  const spokes = 10;
  const strand = (a, b, r) => {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 4, 1), silkM);
    cyl.position.copy(a).add(b).multiplyScalar(0.5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return cyl;
  };
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    grp.add(strand(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0), 0.006));
  }
  // spiral drawn progressively as segment meshes: userData.setProgress(k)
  const spiralPts = [];
  const turns = 5;
  const N = 110;
  for (let i = 0; i <= N; i++) {
    const v = i / N;
    const a = v * turns * Math.PI * 2;
    const r = 0.12 + v * (radius * 0.92 - 0.12);
    spiralPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.sin(a * 3) * 0.004));
  }
  const segMeshes = [];
  for (let i = 0; i < N; i++) {
    const seg = strand(spiralPts[i], spiralPts[i + 1], 0.005);
    seg.visible = false;
    grp.add(seg);
    segMeshes.push(seg);
  }
  // dew drops
  const dewM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.7, roughness: 0.1, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 14; i++) {
    const v = (i + 0.5) / 14;
    const a = v * turns * Math.PI * 2 * 0.93 + 1.3;
    const r = 0.12 + v * (radius * 0.9 - 0.12);
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.014 + (i % 3) * 0.005, 8, 6), dewM);
    d.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.01);
    grp.add(d);
  }
  grp.userData.spiralN = N;
  grp.userData.setProgress = (k) => {
    const n = Math.floor(clamp(k, 0, 1) * N);
    for (let i = 0; i < N; i++) segMeshes[i].visible = i < n;
  };
  grp.userData.spiralPoint = (k) => spiralPts[Math.min(N, Math.floor(clamp(k, 0, 1) * N))];
  return grp;
}

export function makeSpider() {
  const grp = new THREE.Group();
  const sm = mat(0x4a3b52, { rough: 0.6 });
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), sm);
  abdomen.position.set(0, 0.02, -0.08);
  abdomen.scale.set(0.95, 1, 1.15);
  grp.add(abdomen);
  const zig = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.13, 0.02), mat(0xd8c66a));
  zig.position.set(0, 0.02, -0.155);
  grp.add(zig);
  const ceph = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), sm);
  ceph.position.set(0, 0, 0.05);
  grp.add(ceph);
  eyePair(ceph, 0.015, 0.025, 0.015, 0.045);
  const legs = [];
  const lm = mat(0x38293e);
  for (let i = 0; i < 4; i++) {
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(sx * 0.05, 0.01, 0.05 - i * 0.035);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.16, 5), lm);
      upper.position.y = 0.08;
      hip.add(upper);
      const knee = new THREE.Group();
      knee.position.y = 0.16;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.18, 5), lm);
      lower.position.y = -0.09;
      knee.add(lower);
      hip.add(knee);
      hip.rotation.z = sx * (1.5 - Math.abs(i - 1.5) * 0.1);
      hip.rotation.x = (i - 1.5) * 0.5;
      knee.rotation.z = -sx * 2.2;
      hip.userData = { phase: i * 1.9 + (sx > 0 ? Math.PI : 0), baseX: hip.rotation.x };
      grp.add(hip);
      legs.push(hip);
    }
  }
  grp.userData.anim = (t) => {
    for (const l of legs) l.rotation.x = l.userData.baseX + Math.sin(t * 9 + l.userData.phase) * 0.16;
  };
  return grp;
}

// ---------- 13 caterpillar ----------
export function makeCaterpillar() {
  const grp = new THREE.Group();
  const nSeg = 8;
  const segs = [];
  for (let i = 0; i < nSeg; i++) {
    const r = 0.055 * (i === 0 ? 1.25 : 1 - Math.abs(i - nSeg / 2) * 0.02);
    const colM = mat(i % 2 === 0 ? 0x9ec93f : 0x86b532, { rough: 0.6 });
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), colM);
    s.castShadow = true;
    grp.add(s);
    segs.push({ mesh: s, r });
  }
  const head = segs[0].mesh;
  eyePair(head, 0.016, 0.032, 0.02, 0.05);
  antennae(head, 0.05, 0.025, 0.05, 0.03, 0x557a2c);
  // little feet nubs
  grp.userData.segs = segs;
  // inch pose: k in 0..1 across gait cycle; body scrunches and stretches
  grp.userData.setInch = (cyc) => {
    const scrunch = (Math.sin(cyc * Math.PI * 2) + 1) / 2; // 0 stretched, 1 scrunched
    const spacing = lerp(0.085, 0.055, scrunch);
    let z = 0;
    for (let i = 0; i < nSeg; i++) {
      const arch = Math.sin((i / (nSeg - 1)) * Math.PI) * scrunch * 0.06;
      segs[i].mesh.position.set(0, segs[i].r * 0.9 + arch, -z);
      z += spacing;
    }
    grp.userData.len = z;
  };
  grp.userData.setInch(0);
  grp.userData.anim = () => {};
  return grp;
}

// ---------- 14 praying mantis ----------
export function makeMantis() {
  const grp = new THREE.Group();
  const gm = mat(0x7fbf4a, { rough: 0.55 });
  // upright thorax
  const thorax = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.34, 8, 10), gm);
  thorax.position.y = 0.52;
  thorax.rotation.x = 0.18;
  thorax.castShadow = true;
  grp.add(thorax);
  const abdomen = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 8, 10), gm);
  abdomen.position.set(0, 0.3, -0.14);
  abdomen.rotation.x = 1.15;
  abdomen.castShadow = true;
  grp.add(abdomen);
  // triangular head
  const headG = new THREE.Group();
  headG.position.set(0, 0.76, 0.06);
  const headMesh = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.13, 3), gm);
  headMesh.rotation.x = Math.PI;
  headMesh.rotation.y = Math.PI;
  headMesh.scale.set(1, 0.8, 0.7);
  headG.add(headMesh);
  const eyeM = mat(0x5a9438, { rough: 0.3 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), eyeM);
    e.position.set(sx * 0.062, 0.02, 0.01);
    headG.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 5), mat(0x1a1a12));
    p.position.set(sx * 0.062, 0.02, 0.042);
    headG.add(p);
  }
  antennae(headG, 0.16, 0.02, 0.05, 0.02, 0x5a8a34);
  grp.add(headG);
  grp.userData.head = headG;
  // raptorial forearms folded
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(sx * 0.05, 0.62, 0.06);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.16, 6, 8), gm);
    upper.position.y = -0.08;
    sh.add(upper);
    const claw = new THREE.Group();
    claw.position.y = -0.17;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.15, 6, 8), mat(0x6aa83e));
    fore.position.y = 0.075;
    fore.position.z = 0.02;
    claw.add(fore);
    sh.add(claw);
    sh.rotation.x = -0.5;
    claw.rotation.x = 2.5;
    grp.add(sh);
  }
  // stilt legs
  const legM = mat(0x679c3c);
  for (const [sx, zt, lean] of [[-1, -0.02, 0.3], [1, -0.02, 0.3], [-1, -0.18, -0.4], [1, -0.18, -0.4]]) {
    const hip = new THREE.Group();
    hip.position.set(sx * 0.06, 0.34, zt);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.28, 6), legM);
    upper.position.y = -0.14;
    hip.add(upper);
    const knee = new THREE.Group();
    knee.position.y = -0.28;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.24, 6), legM);
    lower.position.y = -0.1;
    knee.add(lower);
    hip.add(knee);
    hip.rotation.z = sx * 0.55;
    hip.rotation.x = lean;
    knee.rotation.z = -sx * 0.75;
    knee.rotation.x = -lean * 0.7;
    grp.add(hip);
  }
  grp.userData.anim = (t) => {
    grp.userData.head.rotation.y = Math.sin(t * 0.7) * 0.4;
    grp.position.y = Math.sin(t * 1.8) * 0.008;
  };
  return grp;
}

// ---------- 15 the discovery: rainbow scarab (Phanaeus vindex — real species) ----------
export function makeRainbowScarab() {
  const grp = new THREE.Group();
  const shellM = new THREE.MeshPhysicalMaterial({
    color: 0x1f8a4c, roughness: 0.18, metalness: 0.85,
    iridescence: 1.0, iridescenceIOR: 1.8, iridescenceThicknessRange: [120, 620],
    clearcoat: 1, clearcoatRoughness: 0.15,
  });
  const copperM = new THREE.MeshPhysicalMaterial({
    color: 0xb0562a, roughness: 0.2, metalness: 0.9,
    iridescence: 0.8, iridescenceIOR: 1.6, clearcoat: 1,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2), shellM);
  shell.scale.set(0.85, 0.72, 1.05);
  shell.position.y = 0.05;
  shell.castShadow = true;
  grp.add(shell);
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(0x14231a));
  under.scale.set(0.8, 0.5, 1.05);
  under.position.y = 0.06;
  grp.add(under);
  const pron = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), copperM);
  pron.scale.set(0.95, 0.62, 0.75);
  pron.position.set(0, 0.1, 0.17);
  pron.castShadow = true;
  grp.add(pron);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), shellM);
  head.scale.set(1, 0.6, 0.9);
  head.position.set(0, 0.06, 0.29);
  grp.add(head);
  // the male's horn!
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.028, 0.22, 8), mat(0x1a1410, { rough: 0.3, metal: 0.4 }));
  horn.position.set(0, 0.17, 0.28);
  horn.rotation.x = 0.5;
  horn.castShadow = true;
  grp.add(horn);
  eyePair(head, 0.018, 0.045, 0.02, 0.04, 0xe8e2d8);
  const legs = legSet(grp, 6, 0.16, 0.15, 0x14231a, 0.05);
  grp.userData.anim = (t) => {
    walkLegs(legs, t, 3, 0.1);
  };
  return grp;
}
