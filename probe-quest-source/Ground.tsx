import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { World } from '../catalog';
import { CELL, TERRAIN_STEP, type Terrain } from '../runtime';
import { fbm, hash2 } from './noise';
import { makeRegolithTextures, makeRockGeometry, makeRockTexture } from './textures';

/**
 * Smooth terrain mesh. Every vertex height comes from terrain.height(), and the
 * triangle diagonal matches the sampler's split, so the rendered surface equals
 * the collision surface exactly.
 */
function buildGeometry(terrain: Terrain, world: World) {
  const spanX = terrain.cols * CELL;
  const spanZ = terrain.rows * CELL;
  const vc = Math.round(spanX / TERRAIN_STEP) + 1;
  const vr = Math.round(spanZ / TERRAIN_STEP) + 1;
  const pos = new Float32Array(vc * vr * 3);
  const uv = new Float32Array(vc * vr * 2);
  const col = new Float32Array(vc * vr * 3);
  for (let j = 0; j < vr; j++)
    for (let i = 0; i < vc; i++) {
      const k = j * vc + i;
      const x = terrain.minX + i * TERRAIN_STEP;
      const z = terrain.minZ + j * TERRAIN_STEP;
      pos[k * 3] = x;
      pos[k * 3 + 1] = terrain.height(x, z);
      pos[k * 3 + 2] = z;
      uv[k * 2] = x / 9;
      uv[k * 2 + 1] = z / 9;
    }
  const idx = new Uint32Array((vc - 1) * (vr - 1) * 6);
  let n = 0;
  for (let j = 0; j < vr - 1; j++)
    for (let i = 0; i < vc - 1; i++) {
      const a = j * vc + i, b = a + 1, c = a + vc, d = c + 1;
      idx[n++] = a; idx[n++] = c; idx[n++] = b;
      idx[n++] = b; idx[n++] = c; idx[n++] = d;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  const tint = new THREE.Color();
  const lo = new THREE.Color(world === 'moon' ? '#8d8b88' : '#9d8a7c');
  const hi = new THREE.Color(world === 'moon' ? '#d9d6cf' : '#e0c7ad');
  for (let k = 0; k < vc * vr; k++) {
    const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
    const macro = fbm(x * 0.035 + 11, z * 0.035, 3);
    const slope = 1 - nrm.getY(k);
    let t = 0.35 + (macro - 0.5) * 1.3 + (y - 2) * 0.06 - slope * 0.9 + (hash2(x, z) - 0.5) * 0.05;
    t = Math.max(0, Math.min(1, t));
    tint.copy(lo).lerp(hi, t);
    col[k * 3] = tint.r; col[k * 3 + 1] = tint.g; col[k * 3 + 2] = tint.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}

export function Ground({ world, terrain }: { world: World; terrain: Terrain }) {
  const geo = useMemo(() => buildGeometry(terrain, world), [terrain, world]);
  const tex = useMemo(() => makeRegolithTextures(world), [world]);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex.map,
        bumpMap: tex.bump,
        bumpScale: world === 'moon' ? 1.6 : 1.1,
        vertexColors: true,
        roughness: 0.97,
        metalness: 0,
      }),
    [tex, world],
  );
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => () => { tex.map.dispose(); tex.bump.dispose(); mat.dispose(); }, [tex, mat]);
  return <mesh geometry={geo} material={mat} receiveShadow />;
}

/** Scattered boulders: one instanced draw call, seated slightly into the surface. */
export function Boulders({ world, terrain, avoid }: { world: World; terrain: Terrain; avoid: { x: number; z: number }[] }) {
  const geo = useMemo(() => makeRockGeometry(world === 'moon' ? 2.2 : 5.4, 2, 0.32), [world]);
  const mat = useMemo(() => {
    const map = makeRockTexture(world === 'moon' ? [150, 147, 142] : [168, 92, 62]);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.92, color: world === 'moon' ? '#d8d6d0' : '#e8c2a8' });
  }, [world]);
  const mesh = useMemo(() => {
    const items: THREE.Matrix4[] = [];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const spanX = terrain.cols * CELL, spanZ = terrain.rows * CELL;
    for (let i = 0; i < 90 && items.length < 64; i++) {
      const x = terrain.minX + 6 + hash2(i, 4.1) * (spanX - 12);
      const z = terrain.minZ + 6 + hash2(8.3, i) * (spanZ - 12);
      if (Math.hypot(x, z) < 6.5) continue;
      if (avoid.some((m) => Math.hypot(m.x - x, m.z - z) < 6.5)) continue;
      const s = 0.25 + hash2(i, 2.2) ** 2.2 * 1.2;
      e.set(hash2(i, 1) * 6, hash2(i, 2) * 6, hash2(i, 3) * 6);
      q.setFromEuler(e);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, terrain.height(x, z) + s * 0.35, z),
        q,
        new THREE.Vector3(s * (1 + hash2(i, 5) * 0.5), s, s * (1 + hash2(i, 6) * 0.4)),
      );
      items.push(m);
    }
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = true;
    im.receiveShadow = true;
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    return im;
  }, [geo, mat, terrain, avoid]);
  useEffect(() => () => { geo.dispose(); mat.map?.dispose(); mat.dispose(); }, [geo, mat]);
  useEffect(() => () => mesh.dispose(), [mesh]);
  return <primitive object={mesh} />;
}
