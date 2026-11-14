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

function hash(x: number, z: number) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

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
  const levels = new Int8Array(cols * rows);
  const seed = world === 'moon' ? 3.1 : 7.7;
  const craters = Array.from({ length: 7 }, (_, i) => ({
    x: minX + hash(i, seed) * (maxX - minX),
    z: minZ + hash(seed, i) * (maxZ - minZ),
    r: 5 + hash(i * 2, seed) * 6,
  }));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + c * CELL + CELL / 2;
      const z = minZ + r * CELL + CELL / 2;
      let h =
        Math.sin(x * 0.09 + seed) * 1.4 +
        Math.cos(z * 0.07 - seed) * 1.3 +
        Math.sin((x + z) * 0.05) * 1.1 +
        (world === 'mars' ? Math.sin(x * 0.03) * 1.2 : 0);
      for (const k of craters) {
        const d = Math.hypot(x - k.x, z - k.z);
        if (d < k.r) h -= 1.6 * (1 - d / k.r);
        else if (d < k.r + 2) h += 0.9;
      }
      let lvl = Math.round(h + 1.5);
      for (const m of list) {
        const d = Math.hypot(x - m.x, z - m.z);
        if (d < 4.5) lvl = Math.min(lvl, 1);
      }
      if (Math.hypot(x, z) < 5) lvl = 1;
      const edge = c < 2 || r < 2 || c >= cols - 2 || r >= rows - 2;
      levels[r * cols + c] = edge ? 7 : Math.max(0, Math.min(4, lvl));
    }
  }
  const height = (x: number, z: number) => {
    const c = Math.floor((x - minX) / CELL);
    const r = Math.floor((z - minZ) / CELL);
    if (c < 0 || r < 0 || c >= cols || r >= rows) return 7;
    return levels[r * cols + c] + 1;
  };
  return { minX, minZ, cols, rows, levels, height, spawn: { x: 0, z: 0 } };
}
