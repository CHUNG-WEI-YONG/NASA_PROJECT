/** Deterministic value noise helpers shared by terrain height and procedural textures. */
export function hash2(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const fade = (t: number) => t * t * (3 - 2 * t);

/** Value noise in 0..1. When period > 0 the lattice wraps, so the result tiles. */
export function vnoise(x: number, z: number, period = 0) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const fx = fade(x - xi);
  const fz = fade(z - zi);
  const w = (a: number) => (period ? ((a % period) + period) % period : a);
  const x0 = w(xi), x1 = w(xi + 1), z0 = w(zi), z1 = w(zi + 1);
  const a = hash2(x0, z0), b = hash2(x1, z0), c = hash2(x0, z1), d = hash2(x1, z1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

export function fbm(x: number, z: number, oct = 4, period = 0) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) {
    s += amp * vnoise(x * f, z * f, period ? period * f : 0);
    n += amp;
    amp *= 0.5;
    f *= 2;
  }
  return s / n;
}
