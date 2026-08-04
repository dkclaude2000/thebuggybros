// Deterministic helpers — no Math.random anywhere at render time.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// 0→1 as t goes a→b, smoothstepped
export function smooth(t, a, b) {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
// linear 0→1
export function lin(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }

export const easeOutBack = (x) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const easeInCubic = (x) => x * x * x;
export const easeInOut = (x) => x * x * (3 - 2 * x);

// pop with a little overshoot bounce, 0→1 over [a,b]
export function pop(t, a, b) {
  const x = lin(t, a, b);
  return x >= 1 ? 1 : easeOutBack(x);
}

// pulse that rises and falls within [a,b]
export function bump(t, a, b) {
  const x = lin(t, a, b);
  return Math.sin(x * Math.PI);
}

// Piecewise keyframe track: [{t, v}] with smoothstep between. v can be number or array.
export function track(keys, t) {
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[i], k1 = keys[i + 1];
    if (t <= k1.t) {
      const x = smooth(t, k0.t, k1.t);
      if (Array.isArray(k0.v)) return k0.v.map((v, j) => lerp(v, k1.v[j], x));
      return lerp(k0.v, k1.v, x);
    }
  }
  return keys[keys.length - 1].v;
}
