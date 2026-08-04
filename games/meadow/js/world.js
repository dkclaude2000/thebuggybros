import * as THREE from 'three';
import { mulberry32, lerp } from './util.js';

// ---------- palette ----------
export const PAL = {
  teal: 0x38cba7,       // brand teal
  amber: 0xf4b53f,      // brand amber
  grassA: 0x5da03f, grassB: 0x7cbf4e, grassC: 0x4a8a36,
  soil: 0x6b4f35,
  leaf: 0x63a844, leafDark: 0x4c8a34,
  bark: 0x7a5c40, barkDark: 0x5d4530,
  stone: 0x9a958c,
  skyTop: 0x8ecfef, skyBottom: 0xfdf3d8,
  sun: 0xfff2d0,
};

export function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.0, ...opts });
}

// ---------- sky, lights, atmosphere ----------
export function buildSky(scene) {
  const geo = new THREE.SphereGeometry(400, 24, 16);
  const matSky = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      top: { value: new THREE.Color(PAL.skyTop) },
      bottom: { value: new THREE.Color(PAL.skyBottom) },
      duskMix: { value: 0 },
    },
    vertexShader: `varying vec3 vp; void main(){ vp = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vp; uniform vec3 top; uniform vec3 bottom; uniform float duskMix;
      void main(){
        float h = clamp(vp.y/300.0, 0.0, 1.0);
        vec3 dayCol = mix(bottom, top, pow(h, 0.8));
        vec3 duskTop = vec3(0.16,0.16,0.34); vec3 duskBot = vec3(0.98,0.62,0.36);
        vec3 duskCol = mix(duskBot, duskTop, pow(h, 0.6));
        gl_FragColor = vec4(mix(dayCol, duskCol, duskMix), 1.0);
      }`,
  });
  const sky = new THREE.Mesh(geo, matSky);
  scene.add(sky);
  return sky;
}

export function buildLights(scene) {
  const sun = new THREE.DirectionalLight(PAL.sun, 2.6);
  sun.position.set(18, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  scene.add(sun.target);

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a7a35, 0.85);
  scene.add(hemi);

  const warm = new THREE.PointLight(0xffd9a0, 0, 20); // firefly-scene fill, off by day
  warm.position.set(0, 2, 2);
  scene.add(warm);

  return { sun, hemi, warm };
}

// dusk lighting blend 0=day 1=warm dusk
export function setDusk(env, k) {
  const { lights, sky, scene } = env;
  sky.material.uniforms.duskMix.value = k;
  lights.sun.intensity = lerp(2.6, 0.5, k);
  lights.sun.color.setHex(k > 0.5 ? 0xffb070 : PAL.sun);
  lights.hemi.intensity = lerp(0.85, 0.32, k);
  lights.warm.intensity = lerp(0, 2.2, k);
  scene.fog.color.setHex(k > 0.5 ? 0x3a3450 : 0xdcead0);
  scene.environmentIntensity = lerp(0.4, 0.1, k); // don't let IBL wash out the dusk
}

export function buildMotes(scene, rng) {
  const N = 260;
  const pos = new Float32Array(N * 3);
  const seedPhase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (rng() - 0.5) * 24;
    pos[i * 3 + 1] = rng() * 5 + 0.2;
    pos[i * 3 + 2] = (rng() - 0.5) * 24;
    seedPhase[i] = rng() * Math.PI * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({
    color: 0xfff0c8, size: 0.045, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const pts = new THREE.Points(g, m);
  pts.userData.base = pos.slice();
  pts.userData.phase = seedPhase;
  scene.add(pts);
  return pts;
}

export function updateMotes(pts, t) {
  const p = pts.geometry.attributes.position.array;
  const base = pts.userData.base, ph = pts.userData.phase;
  for (let i = 0; i < ph.length; i++) {
    p[i * 3] = base[i * 3] + Math.sin(t * 0.25 + ph[i]) * 0.35;
    p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.18 + ph[i] * 2.0) * 0.25;
    p[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.21 + ph[i]) * 0.35;
  }
  pts.geometry.attributes.position.needsUpdate = true;
}

// ---------- grass blade geometry (tapered, gently curved) ----------
function bladeGeometry() {
  const g = new THREE.BufferGeometry();
  // 4 segments tapering to a point, curved forward
  const verts = [], idx = [];
  const segs = 4, w0 = 0.06;
  for (let i = 0; i <= segs; i++) {
    const v = i / segs;
    const w = w0 * (1 - v * 0.92);
    const bend = v * v * 0.35;
    verts.push(-w, v, bend, w, v, bend);
  }
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Instanced grass field. heightScale ~0.14 for lawn, ~1.0 for macro jungle.
export function buildGrass(parent, rng, { count, radius, heightMin, heightMax, exclude = [] }) {
  const geo = bladeGeometry();
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, side: THREE.DoubleSide });
  const inst = new THREE.InstancedMesh(geo, m, count);
  const dummy = new THREE.Object3D();
  const colA = new THREE.Color(PAL.grassA), colB = new THREE.Color(PAL.grassB), colC = new THREE.Color(PAL.grassC);
  const tmp = new THREE.Color();
  let placed = 0, guard = 0;
  while (placed < count && guard < count * 30) {
    guard++;
    const r = Math.sqrt(rng()) * radius;
    const a = rng() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    let ok = true;
    for (const e of exclude) {
      if ((x - e.x) * (x - e.x) + (z - e.z) * (z - e.z) < e.r * e.r) { ok = false; break; }
    }
    if (!ok) continue;
    const h = heightMin + rng() * (heightMax - heightMin);
    dummy.position.set(x, 0, z);
    dummy.rotation.set((rng() - 0.5) * 0.25, rng() * Math.PI * 2, (rng() - 0.5) * 0.25);
    dummy.scale.set(0.7 + rng() * 0.9, h, 1);
    dummy.updateMatrix();
    inst.setMatrixAt(placed, dummy.matrix);
    tmp.copy(rng() < 0.5 ? colA : (rng() < 0.5 ? colB : colC));
    tmp.offsetHSL(0, 0, (rng() - 0.5) * 0.06);
    inst.setColorAt(placed, tmp);
    placed++;
  }
  inst.count = placed;
  inst.castShadow = true;
  inst.receiveShadow = true;
  parent.add(inst);
  return inst;
}

// A few individually animated hero blades near the action (they sway; two can be pushed aside)
export function heroBlade(parent, x, z, h, rng) {
  const g = new THREE.Mesh(bladeGeometry(), mat(0x6db14a, { side: THREE.DoubleSide, rough: 0.85 }));
  const pivot = new THREE.Group();
  pivot.position.set(x, 0, z);
  g.scale.set(1.6, h, 1);
  g.castShadow = true;
  pivot.add(g);
  pivot.userData.phase = rng() * Math.PI * 2;
  pivot.userData.baseRotY = rng() * Math.PI * 2;
  pivot.rotation.y = pivot.userData.baseRotY;
  parent.add(pivot);
  return pivot;
}

export function swayBlade(pivot, t, extraLean = 0) {
  pivot.rotation.z = Math.sin(t * 1.1 + pivot.userData.phase) * 0.06 + extraLean;
}

// ---------- props ----------
export function makeLeaf(scale = 1, color = PAL.leaf) {
  // heart-ish leaf from a shape
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.5, 0.15, 0.62, 0.75, 0, 1.15);
  s.bezierCurveTo(-0.62, 0.75, -0.5, 0.15, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const leaf = new THREE.Mesh(g, mat(color, { side: THREE.DoubleSide }));
  const vein = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, 1.05), mat(PAL.leafDark));
  vein.position.set(0, 0.022, 0.55);
  leaf.add(vein);
  leaf.scale.setScalar(scale);
  leaf.castShadow = true; leaf.receiveShadow = true;
  return leaf;
}

export function makeLog(len = 3, r = 0.55) {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, len, 14), mat(PAL.bark, { rough: 1 }));
  body.rotation.z = Math.PI / 2;
  body.castShadow = true; body.receiveShadow = true;
  grp.add(body);
  const capMat = mat(0xc9a878);
  for (const sx of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(r * (sx < 0 ? 1 : 1.06), 14), capMat);
    cap.position.x = sx * len / 2 + sx * 0.001;
    cap.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    grp.add(cap);
    const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.3, r * 0.36, 14), mat(0xa78156));
    ring.position.copy(cap.position).x += sx * 0.002;
    ring.rotation.y = cap.rotation.y;
    grp.add(ring);
  }
  return grp;
}

export function makeRock(rng, scale = 1) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * (0.85 + rng() * 0.3), p.getY(i) * (0.5 + rng() * 0.25), p.getZ(i) * (0.85 + rng() * 0.3));
  }
  g.computeVertexNormals();
  const rock = new THREE.Mesh(g, mat(PAL.stone, { rough: 0.95 }));
  rock.scale.setScalar(scale);
  rock.castShadow = true; rock.receiveShadow = true;
  return rock;
}

export function makeMushroom(scale = 1) {
  const grp = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.42, 10), mat(0xefe6d0));
  stem.position.y = 0.21;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xd8663c));
  cap.position.y = 0.4; cap.scale.y = 0.7;
  grp.add(stem, cap);
  for (const c of [[0.1, 0.05], [-0.08, 0.1], [0.02, -0.12]]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(0xf5ead6));
    dot.position.set(c[0], 0.52, c[1]);
    dot.scale.y = 0.4;
    grp.add(dot);
  }
  grp.scale.setScalar(scale);
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return grp;
}

export function makeClover(scale = 1) {
  const grp = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 8), mat(0x5f9c3f));
  stem.position.y = 0.55;
  grp.add(stem);
  const bloom = new THREE.Group();
  bloom.position.y = 1.15;
  const petalMat = mat(0xe58cc0);
  const rng = mulberry32(7);
  for (let i = 0; i < 30; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rng() * 0.025, 7, 6), petalMat);
    const a = rng() * Math.PI * 2, b = rng() * Math.PI;
    p.position.setFromSphericalCoords(0.13 + rng() * 0.04, b, a);
    bloom.add(p);
  }
  grp.add(bloom);
  grp.userData.bloom = bloom;
  grp.scale.setScalar(scale);
  grp.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return grp;
}

export function makeTwig(len = 2.4, r = 0.06) {
  const twig = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 8), mat(PAL.barkDark, { rough: 1 }));
  twig.rotation.z = Math.PI / 2;
  twig.castShadow = true; twig.receiveShadow = true;
  return twig;
}

// Background trees for the yard scene (stylized blobs on trunks)
export function makeTree(rng, scale = 1) {
  const grp = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.38 * scale, 2.6 * scale, 8), mat(PAL.bark));
  trunk.position.y = 1.3 * scale;
  grp.add(trunk);
  const cMat = mat(0x4f8f3a, { rough: 0.9 });
  for (let i = 0; i < 4; i++) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry((1.0 + rng() * 0.7) * scale, 12, 9), cMat);
    blob.position.set((rng() - 0.5) * 1.6 * scale, (2.8 + rng() * 1.4) * scale, (rng() - 0.5) * 1.6 * scale);
    grp.add(blob);
  }
  grp.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return grp;
}
