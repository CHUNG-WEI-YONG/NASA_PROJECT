import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { makeSurfaceDetail } from './textures';

/** Shared materials for the friendly scout aliens (fictional chasers). */
export function useAlienMaterials() {
  const tex = useMemo(() => makeSurfaceDetail('skin'), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const m = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#8fc9b4', roughness: 0.5, metalness: 0.05, map: tex.map, bumpMap: tex.bump, bumpScale: 0.5 }),
      belly: new THREE.MeshStandardMaterial({ color: '#cfe9d9', roughness: 0.65, map: tex.map, bumpMap: tex.bump, bumpScale: 0.3 }),
      shell: new THREE.MeshStandardMaterial({ color: '#5d6d86', roughness: 0.35, metalness: 0.6 }),
      dome: new THREE.MeshStandardMaterial({ color: '#bfe6ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
      eye: new THREE.MeshStandardMaterial({ color: '#f7f4ea', roughness: 0.3 }),
      pupil: new THREE.MeshStandardMaterial({ color: '#1c2233', roughness: 0.2 }),
      glow: new THREE.MeshStandardMaterial({ color: '#a8f0d0', emissive: '#7ef0b4', emissiveIntensity: 1.3 }),
    }),
    [tex],
  );
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}

export function AlienScout({ m }: { m: ReturnType<typeof useAlienMaterials> }) {
  return (
    <group>
      {/* saucer hull */}
      <mesh material={m.shell} scale={[1, 0.32, 1]} castShadow>
        <sphereGeometry args={[0.85, 40, 20]} />
      </mesh>
      <mesh material={m.glow} position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.035, 10, 40]} />
      </mesh>
      {/* pilot */}
      <mesh material={m.skin} position={[0, 0.38, 0]} scale={[1, 0.92, 0.95]} castShadow>
        <sphereGeometry args={[0.36, 32, 24]} />
      </mesh>
      <mesh material={m.belly} position={[0, 0.3, 0.2]} scale={[0.7, 0.5, 0.4]}>
        <sphereGeometry args={[0.3, 24, 16]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.13, 0.48, 0.28]}>
          <mesh material={m.eye} scale={[1, 1.15, 0.7]}>
            <sphereGeometry args={[0.1, 20, 16]} />
          </mesh>
          <mesh material={m.pupil} position={[0, 0.01, 0.06]}>
            <sphereGeometry args={[0.05, 16, 12]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((s) => (
        <group key={`a${s}`} position={[s * 0.18, 0.68, 0]} rotation={[0, 0, -s * 0.35]}>
          <mesh material={m.skin} position={[0, 0.14, 0]}>
            <cylinderGeometry args={[0.018, 0.024, 0.28, 8]} />
          </mesh>
          <mesh material={m.glow} position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.05, 14, 10]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.dome} position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.58, 36, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}
