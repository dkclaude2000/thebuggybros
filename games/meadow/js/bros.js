import * as THREE from 'three';
import { mat, PAL } from './world.js';
import { clamp, lerp } from './util.js';
import { teeLogoTex, darkBBCap, proNet, observationJar, utilityBelt, explorerPack, inkFace } from './outfit.js';

const SKIN = 0xe8b68a;
const LINE = 0x3a3a42;   // stick-limb ink color
const PANTS = 0x2c4770;

function capsule(r, len, matr) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), matr);
  m.castShadow = true;
  return m;
}

// Stylized stick-figure bro: dark BB trucker cap, logo tee, ink-drawn face,
// thin limbs with glove hands. Root sits at ground; total height ~1.0 * opts.height.
// Skeleton unchanged: hips -> (thigh -> shin -> foot), torso -> (shoulder -> forearm -> hand), neck -> head
export class Bro {
  constructor(opts) {
    this.opts = opts;
    const g = this.root = new THREE.Group();
    g.name = opts.name;

    const lineM = mat(LINE, { rough: 0.7 });
    const legM = mat(PANTS, { rough: 0.85 });
    const gloveM = mat(0xffffff, { rough: 0.5 });
    const shoeM = mat(0x8a5c3a, { rough: 0.7 });
    const hairM = mat(opts.hair, { rough: 0.9 });
    const limbR = 0.024;

    // hips
    this.hips = new THREE.Group();
    this.hips.position.y = 0.40;
    g.add(this.hips);

    // belt with vials sits right at the hip line
    const belt = utilityBelt(0.082);
    belt.scale.setScalar(0.9);
    belt.position.y = 0.015;
    this.hips.add(belt);

    // legs
    this.legs = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const thigh = new THREE.Group();
      thigh.position.set(sx * 0.06, -0.02, 0);
      const thighMesh = capsule(limbR, 0.1, legM);
      thighMesh.position.y = -0.075;
      thigh.add(thighMesh);
      const shin = new THREE.Group();
      shin.position.y = -0.16;
      const shinMesh = capsule(limbR * 0.9, 0.09, legM);
      shinMesh.position.y = -0.07;
      shin.add(shinMesh);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), shoeM);
      foot.scale.set(1, 0.6, 1.65);
      foot.position.set(0, -0.155, 0.035);
      foot.castShadow = true;
      shin.add(foot);
      thigh.add(shin);
      this.hips.add(thigh);
      this.legs[side] = { thigh, shin };
    }

    // torso: stick spine + logo tee
    this.torso = new THREE.Group();
    this.torso.position.y = 0.06;
    this.hips.add(this.torso);
    const spine = capsule(limbR, 0.24, lineM);
    spine.position.y = 0.15;
    this.torso.add(spine);
    const teeR = 0.095 * (opts.chub ?? 1);
    const tee = capsule(teeR, 0.15, mat(opts.shirt, { rough: 0.8 }));
    tee.position.y = 0.16;
    this.torso.add(tee);
    const teeLogo = new THREE.Mesh(
      new THREE.PlaneGeometry(0.105, 0.105),
      new THREE.MeshStandardMaterial({ map: opts.teeLogoTex, transparent: true, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 })
    );
    teeLogo.position.set(0, 0.185, teeR + 0.008);
    this.torso.add(teeLogo);

    // explorer pack
    const pack = explorerPack(opts.pack);
    pack.scale.setScalar(0.95);
    pack.position.set(0, 0.17, -teeR - 0.05);
    this.torso.add(pack);

    // arms
    this.arms = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? -1 : 1;
      const shoulder = new THREE.Group();
      shoulder.position.set(sx * (teeR + 0.015), 0.27, 0);
      const upper = capsule(limbR * 0.85, 0.08, lineM);
      upper.position.y = -0.065;
      shoulder.add(upper);
      const forearm = new THREE.Group();
      forearm.position.y = -0.14;
      const fore = capsule(limbR * 0.75, 0.075, lineM);
      fore.position.y = -0.055;
      forearm.add(fore);
      const hand = new THREE.Group();
      hand.position.y = -0.125;
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), gloveM);
      glove.castShadow = true;
      hand.add(glove);
      forearm.add(hand);
      shoulder.add(forearm);
      this.torso.add(shoulder);
      this.arms[side] = { shoulder, forearm, hand };
    }

    // head
    this.neck = new THREE.Group();
    this.neck.position.y = 0.38;
    this.torso.add(this.neck);
    const neckMesh = capsule(limbR * 0.8, 0.04, lineM);
    neckMesh.position.y = 0.02;
    this.neck.add(neckMesh);
    this.head = new THREE.Group();
    this.head.position.y = 0.13;
    this.neck.add(this.head);

    const headR = this.headR = opts.headR ?? 0.19;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), mat(SKIN, { rough: 0.65 }));
    skull.castShadow = true;
    this.head.add(skull);

    // ink face — sticker decal just off the sphere; texture swapped per expression
    this.faceMat = new THREE.MeshStandardMaterial({
      map: inkFace('amused'), transparent: true, roughness: 0.7,
      polygonOffset: true, polygonOffsetFactor: -2,
    });
    const faceMesh = new THREE.Mesh(new THREE.CircleGeometry(headR * 0.72, 32), this.faceMat);
    faceMesh.position.set(0, -headR * 0.06, headR * 1.002);
    this.head.add(faceMesh);

    // hair tufts under the cap
    for (const [hx, hy, hz] of [[-0.72, 0.24, -0.35], [0.72, 0.24, -0.35], [0, 0.26, -0.85]]) {
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.2, 8, 6), hairM);
      tuft.scale.y = 0.55;
      tuft.position.set(hx * headR, hy * headR, hz * headR);
      this.head.add(tuft);
    }

    // dark BB cap
    const cap = darkBBCap(headR, opts.brim);
    cap.position.y = headR * 0.44;
    this.head.add(cap);

    g.scale.setScalar(opts.height);
    this._blinkSeed = opts.blinkSeed ?? 0;
    this._expr = null;       // per-frame suggestion (gasp/frown)
    this._exprForced = null; // explicit per-shot override
    this._tmp = new THREE.Vector3();
  }

  // ---- pose primitives (call reset first each frame, then layer) ----
  reset() {
    this.root.position.y = 0;
    this.root.rotation.z = 0;
    this.hips.position.y = 0.40;
    this.hips.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
    this.torso.scale.set(1, 1, 1);
    this.neck.rotation.set(0, 0, 0);
    this.head.rotation.set(0, 0, 0);
    for (const s of ['L', 'R']) {
      this.legs[s].thigh.rotation.set(0, 0, 0);
      this.legs[s].shin.rotation.set(0, 0, 0);
      this.arms[s].shoulder.rotation.set(0, 0, s === 'L' ? 0.12 : -0.12);
      this.arms[s].forearm.rotation.set(-0.15, 0, 0);
      this.arms[s].hand.rotation.set(0, 0, 0);
    }
    this._expr = null;
    this._exprForced = null;
  }

  walk(phase, amt = 1) {
    const sw = Math.sin(phase), sw2 = Math.sin(phase + Math.PI);
    this.legs.L.thigh.rotation.x = sw * 0.55 * amt;
    this.legs.R.thigh.rotation.x = sw2 * 0.55 * amt;
    this.legs.L.shin.rotation.x = Math.max(0, -sw2) * 0.7 * amt;
    this.legs.R.shin.rotation.x = Math.max(0, -sw) * 0.7 * amt;
    this.arms.L.shoulder.rotation.x = sw2 * 0.4 * amt;
    this.arms.R.shoulder.rotation.x = sw * 0.4 * amt;
    this.hips.position.y = 0.40 + Math.abs(Math.cos(phase)) * 0.022 * amt;
    this.torso.rotation.y = sw * 0.06 * amt;
  }

  // k 0..1 — field-scientist kneel: left knee down, right foot planted forward
  kneel(k) {
    this.hips.position.y = lerp(0.40, 0.175, k);
    this.legs.L.thigh.rotation.x = lerp(0, 0.6, k);
    this.legs.L.shin.rotation.x = lerp(0, 1.5, k);
    this.legs.R.thigh.rotation.x = lerp(0, -1.45, k);
    this.legs.R.shin.rotation.x = lerp(0, 1.55, k);
    this.torso.rotation.x = lerp(0, 0.22, k);
  }

  crouch(k) {
    this.hips.position.y = lerp(0.40, 0.27, k);
    for (const s of ['L', 'R']) {
      this.legs[s].thigh.rotation.x = lerp(0, -1.1, k);
      this.legs[s].shin.rotation.x = lerp(0, 1.35, k);
    }
    this.torso.rotation.x = lerp(0, 0.42, k);
  }

  point(side, k, elev = 0.1, spread = 0.15) {
    const a = this.arms[side];
    const sx = side === 'L' ? 1 : -1;
    a.shoulder.rotation.x = lerp(a.shoulder.rotation.x, -(Math.PI / 2 + elev), k);
    a.shoulder.rotation.z = lerp(a.shoulder.rotation.z, sx * -spread, k);
    a.forearm.rotation.x = lerp(a.forearm.rotation.x, -0.05, k);
  }

  raiseArms(k, wide = 0.5) {
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      this.arms[s].shoulder.rotation.x = lerp(this.arms[s].shoulder.rotation.x, -Math.PI * 0.82, k);
      this.arms[s].shoulder.rotation.z = lerp(this.arms[s].shoulder.rotation.z, sx * wide, k);
      this.arms[s].forearm.rotation.x = lerp(this.arms[s].forearm.rotation.x, -0.2, k);
    }
  }

  mantisArms(k) {
    for (const s of ['L', 'R']) {
      this.arms[s].shoulder.rotation.x = lerp(this.arms[s].shoulder.rotation.x, -0.5, k);
      this.arms[s].forearm.rotation.x = lerp(this.arms[s].forearm.rotation.x, -2.2, k);
    }
  }

  cupHands(k) {
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      this.arms[s].shoulder.rotation.x = lerp(this.arms[s].shoulder.rotation.x, -1.15, k);
      this.arms[s].shoulder.rotation.z = lerp(this.arms[s].shoulder.rotation.z, sx * 0.35, k);
      this.arms[s].forearm.rotation.x = lerp(this.arms[s].forearm.rotation.x, -0.55, k);
    }
  }

  lookAtWorld(target, k = 1) {
    this.head.updateWorldMatrix(true, false);
    const local = this.head.parent.worldToLocal(this._tmp.copy(target));
    local.sub(this.head.position);
    const yaw = clamp(Math.atan2(local.x, local.z), -1.0, 1.0);
    const pitch = clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.7, 0.55);
    this.head.rotation.y = lerp(this.head.rotation.y, yaw, k);
    this.head.rotation.x = lerp(this.head.rotation.x, pitch, k);
  }

  // expression API — explicit per-shot override wins over gasp/frown suggestions
  expr(name) { this._exprForced = name; }
  gasp(k) { if (k > 0.55) this._expr = 'wonder'; }
  frownConcentrate(k) { if (k > 0.4) this._expr = 'serious'; }

  // resolve face + deterministic blink + breath; call last each frame
  idle(t) {
    let face = this._exprForced ?? this._expr ?? 'amused';
    const cycle = 3.4 + this._blinkSeed * 0.9;
    const ph = (t + this._blinkSeed * 1.7) % cycle;
    if (ph < 0.13 && face !== 'delighted' && face !== 'serious') face = 'blink';
    const tex = inkFace(face);
    if (this.faceMat.map !== tex) {
      this.faceMat.map = tex;
      this.faceMat.needsUpdate = true;
    }
    this.torso.scale.y = 1 + Math.sin(t * 2.1 + this._blinkSeed) * 0.008;
  }
}

// ---------- props kept for the world ----------
export function makeJar() {
  const grp = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xd9f7ec, roughness: 0.05, metalness: 0, transmission: 0.85,
    transparent: true, opacity: 0.5, thickness: 0.1, ior: 1.4,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.125, 0.3, 18, 1, false), glass);
  body.position.y = 0.15;
  grp.add(body);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.045, 18), mat(PAL.amber, { rough: 0.45, metal: 0.35 }));
  lid.position.y = 0.32;
  lid.castShadow = true;
  grp.add(lid);
  for (let i = 0; i < 8; i++) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.012), mat(PAL.amber, { rough: 0.45, metal: 0.35 }));
    const a = (i / 8) * Math.PI * 2;
    ridge.position.set(Math.cos(a) * 0.135, 0.32, Math.sin(a) * 0.135);
    grp.add(ridge);
  }
  grp.userData.glass = glass;
  return grp;
}

export function makeMagnifier() {
  const grp = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.22, 8), mat(0x8a5c3a));
  handle.position.y = 0.11;
  grp.add(handle);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 24), mat(PAL.amber, { rough: 0.4, metal: 0.5 }));
  rim.position.y = 0.33;
  grp.add(rim);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), new THREE.MeshPhysicalMaterial({
    color: 0xeafcff, transparent: true, opacity: 0.32, roughness: 0.05, side: THREE.DoubleSide,
  }));
  lens.position.y = 0.33;
  grp.add(lens);
  return grp;
}

// The two Buggy Bros in the approved look. No names on screen, ever.
export function makeBros() {
  const teeTex = teeLogoTex();
  const A = new Bro({
    name: 'broA', height: 1.0, shirt: PAL.teal, hair: 0xd6a94f, brim: PAL.teal,
    pack: 0x3a6b52, teeLogoTex: teeTex, headR: 0.19, blinkSeed: 0.35,
  });
  const B = new Bro({
    name: 'broB', height: 0.86, chub: 1.12, shirt: PAL.amber, hair: 0xecdca4, brim: 0xd8663c,
    pack: 0xb5563e, teeLogoTex: teeTex, headR: 0.215, blinkSeed: 1.6,
  });

  // pro net slung up-and-back in A's right hand (grip at the lower third)
  const net = proNet();
  net.scale.setScalar(0.72);
  net.rotation.set(-0.7, 0, 0.12);
  net.position.set(0, -0.16, 0.02);
  A.arms.R.hand.add(net);
  A.net = net;

  // observation jar in B's left hand
  const jar = observationJar();
  jar.scale.setScalar(0.8);
  jar.position.set(0, -0.15, 0.05);
  jar.rotation.x = -0.2;
  B.arms.L.hand.add(jar);
  B.jar = jar;

  const mag = makeMagnifier();
  mag.rotation.x = -1.2;
  mag.position.set(0, -0.05, 0.05);
  mag.visible = false;
  A.arms.L.hand.add(mag);
  A.mag = mag;

  return { A, B };
}
