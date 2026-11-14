import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { World } from '../catalog';
import { makeEarthTexture, makeRockGeometry } from './textures';

// Stellar colour by spectral class, weighted toward the common cool stars.
const STAR_TINTS = ['#9db4ff', '#b7c8ff', '#dfe6ff', '#fbf8ff', '#fff3e4', '#ffdcb0', '#ffc78a'];
const STAR_WEIGHTS = [0.04, 0.08, 0.16, 0.24, 0.22, 0.16, 0.1];

function rnd(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function starLayer(count: number, radius: number, seed: number, minY: number, bright: boolean) {
  const r = rnd(seed);
  const pos: number[] = [];
  const col: number[] = [];
  const c = new THREE.Color();
  const band = new THREE.Vector3(0.3, 0.85, 0.42).normalize();
  const v = new THREE.Vector3();
  while (pos.length / 3 < count) {
    v.set(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.01) continue;
    v.normalize();
    // Concentrate roughly 40% of stars into a Milky Way band.
    if (r() < 0.4) {
      const d = v.dot(band);
      v.addScaledVector(band, -d * 0.85).normalize();
    }
    if (v.y < minY) continue;
    pos.push(v.x * radius, v.y * radius, v.z * radius);
    let pick = r(), k = 0;
    while (k < STAR_WEIGHTS.length - 1 && pick > STAR_WEIGHTS[k]) pick -= STAR_WEIGHTS[k++];
    const lum = bright ? 0.75 + r() * 0.25 : 0.25 + r() ** 2 * 0.6;
    c.set(STAR_TINTS[k]).multiplyScalar(lum);
    col.push(c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

/** Mars twilight dome: dusty butterscotch horizon, indigo zenith, blue glow around the low sun. */
function marsDome() {
  const g = new THREE.SphereGeometry(190, 48, 24);
  const p = g.attributes.position as THREE.BufferAttribute;
  const col = new Float32Array(p.count * 3);
  const horizon = new THREE.Color('#d39a72');
  const mid = new THREE.Color('#7b5260');
  const zenith = new THREE.Color('#141428');
  const blue = new THREE.Color('#9fc4e6');
  const sunDir = new THREE.Vector3(-0.35, 0.06, -1).normalize();
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const t = Math.max(0, v.y);
    if (t < 0.25) c.copy(horizon).lerp(mid, t / 0.25);
    else c.copy(mid).lerp(zenith, Math.min(1, (t - 0.25) / 0.5));
    const glow = Math.max(0, v.dot(sunDir)) ** 14;
    c.lerp(blue, glow * 0.8);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

export function Sky({ world, paused }: { world: World; paused: boolean }) {
  const root = useRef<THREE.Group>(null);
  const earth = useRef<THREE.Mesh>(null);
  const moons = useRef<THREE.Group>(null);
  const res = useMemo(() => {
    const minY = world === 'mars' ? 0.12 : -0.2;
    const dim = starLayer(world === 'moon' ? 4200 : 1800, 170, world === 'moon' ? 11 : 29, minY, false);
    const bright = starLayer(world === 'moon' ? 260 : 120, 168, world === 'moon' ? 71 : 53, minY, true);
    const dimMat = new THREE.PointsMaterial({ size: 1.3, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: world === 'moon' ? 0.95 : 0.55, depthWrite: false, fog: false });
    const brightMat = new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: world === 'moon' ? 1 : 0.75, depthWrite: false, fog: false });
    const dome = world === 'mars' ? marsDome() : null;
    const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false, fog: false });
    const earthMap = world === 'moon' ? makeEarthTexture() : null;
    const rock = world === 'mars' ? makeRockGeometry(9.1, 3, 0.42) : null;
    return { dim, bright, dimMat, brightMat, dome, domeMat, earthMap, rock };
  }, [world]);
  useEffect(
    () => () => {
      res.dim.dispose(); res.bright.dispose(); res.dimMat.dispose(); res.brightMat.dispose();
      res.dome?.dispose(); res.domeMat.dispose(); res.earthMap?.dispose(); res.rock?.dispose();
    },
    [res],
  );

  useFrame(({ camera }, dt) => {
    if (root.current) root.current.position.copy(camera.position);
    if (paused) return;
    if (earth.current) earth.current.rotation.y += dt * 0.02;
    if (moons.current) moons.current.rotation.y += dt * 0.004;
  });

  return (
    <group ref={root}>
      {res.dome && <mesh geometry={res.dome} material={res.domeMat} renderOrder={-2} />}
      <points geometry={res.dim} material={res.dimMat} renderOrder={-1} />
      <points geometry={res.bright} material={res.brightMat} renderOrder={-1} />
      {world === 'moon' && res.earthMap && (
        <group position={[-62, 30, -128]}>
          <mesh ref={earth} rotation={[0.41, 0, 0]}>
            <sphereGeometry args={[10, 64, 48]} />
            <meshStandardMaterial map={res.earthMap} roughness={0.6} metalness={0} emissive="#0d2140" emissiveIntensity={0.35} fog={false} />
          </mesh>
          <mesh scale={1.07}>
            <sphereGeometry args={[10, 48, 32]} />
            <meshBasicMaterial color="#6fb0ff" transparent opacity={0.16} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} />
          </mesh>
        </group>
      )}
      {world === 'mars' && res.rock && (
        <group ref={moons}>
          <mesh geometry={res.rock} position={[48, 46, -118]} scale={[4.2, 3.3, 3.6]}>
            <meshStandardMaterial color="#8a7a70" roughness={1} fog={false} />
          </mesh>
          <mesh geometry={res.rock} position={[-52, 58, -132]} scale={[1.8, 1.4, 1.5]} rotation={[1, 2, 0]}>
            <meshStandardMaterial color="#9a8a80" roughness={1} fog={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}
