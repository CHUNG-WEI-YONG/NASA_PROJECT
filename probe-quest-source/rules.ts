import { missions } from './catalog';

export interface Progress {
  points: number;
  collected: string[];
  speed: number;
  shield: number;
}
export type Upgrade = 'speed' | 'shield' | 'power';
export const COSTS = { speed: 200, shield: 100, power: 150 } as const;
export const INITIAL_PROGRESS: Progress = { points: 0, collected: [], speed: 0, shield: 0 };
const STORAGE_KEY = 'orbit-cadet-progress-v1';
const ids = new Set(missions.map(mission => mission.id));

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...INITIAL_PROGRESS, collected: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...INITIAL_PROGRESS, collected: [] };
    const data = parsed as Record<string, unknown>;
    const integer = (v: unknown, max: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.floor(v))) : 0;
    return {
      points: integer(data.points, 3000),
      speed: integer(data.speed, 3),
      shield: integer(data.shield, 30),
      collected: Array.isArray(data.collected)
        ? [...new Set(data.collected.filter((id): id is string => typeof id === 'string' && ids.has(id)))]
        : [],
    };
  } catch {
    return { ...INITIAL_PROGRESS, collected: [] };
  }
}

export function saveProgress(progress: Progress): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function collectMission(progress: Progress, id: string): { progress: Progress; awarded: boolean } {
  if (!ids.has(id) || progress.collected.includes(id)) return { progress, awarded: false };
  return {
    progress: { ...progress, points: progress.points + 100, collected: [...progress.collected, id] },
    awarded: true,
  };
}

export function purchaseUpgrade(progress: Progress, item: Upgrade): {
  progress: Progress; ok: boolean; message: string; powerSeconds: number;
} {
  if (item === 'speed' && progress.speed >= 3)
    return { progress, ok: false, message: 'Your space boots are fully upgraded!', powerSeconds: 0 };
  if (!(item in COSTS))
    return { progress, ok: false, message: 'Choose an upgrade from the shop.', powerSeconds: 0 };
  if (progress.points < COSTS[item])
    return { progress, ok: false, message: `Keep exploring! You need ${COSTS[item]} points for this upgrade.`, powerSeconds: 0 };
  return {
    progress: {
      ...progress,
      points: progress.points - COSTS[item],
      speed: progress.speed + (item === 'speed' ? 1 : 0),
      shield: progress.shield + (item === 'shield' ? 1 : 0),
    },
    ok: true,
    message: item === 'speed' ? 'Space boots upgraded. Explore a little faster!'
      : item === 'shield' ? 'One protective shield equipped!'
        : 'Super boost active for 18 seconds. Move faster and ignore hits!',
    powerSeconds: item === 'power' ? 18 : 0,
  };
}

export function applyDamage(progress: Progress, health: number, powered: boolean): {
  progress: Progress; health: number; respawn: boolean; message: string;
} {
  if (powered) return { progress, health, respawn: false, message: 'Your power boost protected you!' };
  if (progress.shield > 0)
    return { progress: { ...progress, shield: progress.shield - 1 }, health, respawn: false, message: 'Shield absorbed the hit!' };
  if (health <= 1)
    return { progress, health: 3, respawn: true, message: 'Safely back at base. Your discoveries and points are safe!' };
  return { progress, health: health - 1, respawn: false, message: 'Suit bumped! Watch for the warning zones.' };
}

export function getMissionPosition(id: string): { x: number; z: number } | undefined {
  const mission = missions.find(item => item.id === id);
  return mission ? { x: mission.x, z: mission.z } : undefined;
}
