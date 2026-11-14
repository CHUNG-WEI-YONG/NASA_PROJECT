import { fbm, hash2 } from './visuals/noise';
import type { Mission, World } from './catalog';

export type Action = 'jump' | 'scan' | 'pulse';

export interface Runtime {
  pos: { x: number; y: number; z: number };
  vel: { x: number; y: number; z: number };
  facing: number;
  touch: { f: boolean; b: boolean; l: boolean; r: boolean };
  actions: Action[];
  resetToken: number;
  nearestId: string | null;
  nearestDist: number;
  inRange: boolean;
  pulseAt: number;
  invulnUntil: number;
  time: number;
}

export function createRuntime(): Runtime {
  return {
    pos: { x: 0, y: 4, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    facing: Math.PI,
    touch: { f: false, b: false, l: false, r: false },
    actions: [],
    resetToken: 0,
    nearestId: null,
    nearestDist: Infinity,
    inRange: false,
    pulseAt: -10,
    invulnUntil: 0,
    time: 0,
  };
}

export const CELL = 2;
export const SCAN_RANGE = 4.2;
export const PULSE_RANGE = 8;
export const PULSE_COOLDOWN = 2.2;

export interface Terrain {
  minX: number;
  minZ: number;
  cols: number;
  rows: number;
  levels: Int8Array;
  height: (x: number, z: number) => number;
  spawn: { x: number; z: number };
}

/** Vertex spacing of the smooth terrain mesh. Renderer and sampler share it. */
export const TERRAIN_STEP = 1;
const RIM_HEIGHT = 9;
const STATION_FLOOR = 2;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function buildTerrain(world: World, list: Mission[]): Terrain {
  const xs = list.map((m) => m.x);
  const zs = list.map((m) => m.z);
  const pad = 14;
  let minX = Math.min(-16, ...xs) - pad;
  let maxX = Math.max(16, ...xs) + pad;
  let minZ = Math.min(-16, ...zs) - pad;
  let maxZ = Math.max(16, ...zs) + pad;
  const cap = 90;
  minX = Math.max(minX, -cap); maxX = Math.min(maxX, cap);
  minZ = Math.max(minZ, -cap); maxZ = Math.min(maxZ, cap);
  minX = Math.floor(minX / CELL) * CELL;
  minZ = Math.floor(minZ / CELL) * CELL;
  const cols = Math.ceil((maxX - minX) / CELL);
  const rows = Math.ceil((maxZ - minZ) / CELL);
  const spanX = cols * CELL;
  const spanZ = rows * CELL;
  const seed = world === 'moon' ? 3.1 : 7.7;
  const craters = Array.from({ length: world === 'moon' ? 11 : 7 }, (_, i) => ({
    x: minX + hash2(i, seed) * spanX,
    z: minZ + hash2(seed, i) * spanZ,
    r: 4.5 + hash2(i * 2, seed) * 6,
  }));

  // Analytic surface, sampled once at every mesh vertex.
  const surface = (x: number, z: number) => {
    let h =
      Math.sin(x * 0.09 + seed) * 0.9 +
      Math.cos(z * 0.07 - seed) * 0.85 +
      Math.sin((x + z) * 0.05) * 0.7 +
      (world === 'mars' ? Math.sin(x * 0.03 + z * 0.012) * 1.1 : 0) +
      (fbm(x * 0.08 + seed, z * 0.08, 4) - 0.5) * (world === 'mars' ? 1.6 : 1.1);
    for (const k of craters) {
      const d = Math.hypot(x - k.x, z - k.z);
      const q = d / k.r;
      if (q < 1) h -= 1.7 * (1 - q * q);
      h += 0.75 * Math.exp(-(((d - k.r) / 1.7) ** 2));
    }
    h += STATION_FLOOR;
    // Flat, reachable pads around stations and the landing site.
    let w = smooth(4, 6, Math.hypot(x, z));
    for (const m of list) w = Math.min(w, smooth(3.4, 6.8, Math.hypot(x - m.x, z - m.z)));
    h = STATION_FLOOR + (h - STATION_FLOOR) * w;
    // Raised crater wall at the map edge.
    const e = Math.min(x - minX, minX + spanX - x, z - minZ, minZ + spanZ - z);
    if (e < 5) h += ((5 - e) / 5) ** 2 * 7;
    return h;
  };

  const vc = Math.round(spanX / TERRAIN_STEP) + 1;
  const vr = Math.round(spanZ / TERRAIN_STEP) + 1;
  const hv = new Float32Array(vc * vr);
  for (let j = 0; j < vr; j++)
    for (let i = 0; i < vc; i++) hv[j * vc + i] = surface(minX + i * TERRAIN_STEP, minZ + j * TERRAIN_STEP);

  // Exactly the triangulation used by the rendered mesh: diagonal from (i+1,j) to (i,j+1).
  const height = (x: number, z: number) => {
    const fx = (x - minX) / TERRAIN_STEP;
    const fz = (z - minZ) / TERRAIN_STEP;
    if (fx < 0 || fz < 0 || fx > vc - 1 || fz > vr - 1) return RIM_HEIGHT;
    const i = Math.min(vc - 2, Math.floor(fx));
    const j = Math.min(vr - 2, Math.floor(fz));
    const u = fx - i;
    const v = fz - j;
    const h00 = hv[j * vc + i], h10 = hv[j * vc + i + 1], h01 = hv[(j + 1) * vc + i], h11 = hv[(j + 1) * vc + i + 1];
    if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  };

  const levels = new Int8Array(cols * rows);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      levels[r * cols + c] = Math.max(0, Math.min(8, Math.round(height(minX + c * CELL + CELL / 2, minZ + r * CELL + CELL / 2) - 1)));

  return { minX, minZ, cols, rows, levels, height, spawn: { x: 0, z: 0 } };
}
