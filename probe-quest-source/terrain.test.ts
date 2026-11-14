import assert from 'node:assert/strict';
import { missions, type World } from './catalog';
import { buildTerrain, CELL } from './runtime';

for (const world of ['moon', 'mars'] as World[]) {
  const sites = missions.filter((m) => m.world === world);
  const terrain = buildTerrain(world, sites);
  const again = buildTerrain(world, sites);
  assert.equal(terrain.height(0, 0), 2);
  for (const m of sites) assert.equal(terrain.height(m.x, m.z), 2);
  for (let z = terrain.minZ + 1; z < terrain.minZ + terrain.rows * CELL - 1; z++) {
    for (let x = terrain.minX + 1; x < terrain.minX + terrain.cols * CELL - 1; x++) {
      const a = terrain.height(x, z);
      const b = terrain.height(x + 1, z);
      const c = terrain.height(x, z + 1);
      const d = terrain.height(x + 1, z + 1);
      assert.ok(Number.isFinite(a));
      assert.equal(a, again.height(x, z));
      assert.ok(Math.abs(terrain.height(x + 0.2, z + 0.3) - (a + (b - a) * 0.2 + (c - a) * 0.3)) < 1e-6);
      assert.ok(Math.abs(terrain.height(x + 0.8, z + 0.7) - (d + (c - d) * 0.2 + (b - d) * 0.3)) < 1e-6);
    }
  }
  // Reachability with the controller's existing 0.55-unit step allowance.
  const step = 0.5;
  const cols = terrain.cols * CELL / step + 1;
  const rows = terrain.rows * CELL / step + 1;
  const index = (x: number, z: number) =>
    Math.round((z - terrain.minZ) / step) * cols + Math.round((x - terrain.minX) / step);
  const seen = new Set<number>([index(0, 2)]);
  const queue = [index(0, 2)];
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head], c = k % cols, r = Math.floor(k / cols);
    const x = terrain.minX + c * step, z = terrain.minZ + r * step;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 1 || nc >= cols - 1 || nr < 1 || nr >= rows - 1) continue;
      const next = nr * cols + nc;
      if (seen.has(next)) continue;
      if (terrain.height(x + dc * step, z + dr * step) > terrain.height(x, z) + 0.55) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  for (const m of sites) assert.ok(seen.has(index(m.x, m.z)), `${m.name} must be reachable`);
}
console.log('Passed: both terrain samplers match rendered triangles, deterministic heights, flat station pads, and all stations reachable.');
