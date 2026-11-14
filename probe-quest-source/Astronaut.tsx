import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { Runtime } from '../runtime';
import { makeSurfaceDetail } from './textures';

function useSuitMaterials() {
  const tex = useMemo(() => makeSurfaceDetail('fabric'), []);
  useEffect(() => () => tex.dispose(), [tex]);
  const m = useMemo(
    () => ({
      suit: new THREE.MeshStandardMaterial({ color: '#eceae3', roughness: 0.85, map: tex.map, bumpMap: tex.bump, bumpScale: 0.6 }),
      seam: new THREE.MeshStandardMaterial({ color: '#c8c5bc', roughness: 0.9, map: tex.map, bumpMap: tex.bump, bumpScale: 0.5 }),
      glove: new THREE.MeshStandardMaterial({ color: '#d9d4c6', roughness: 0.75, map: tex.map, bumpMap: tex.bump, bumpScale: 0.4 }),
      boot: new THREE.MeshStandardMaterial({ color: '#6d7078', roughness: 0.9, bumpMap: tex.bump, bumpScale: 0.8 }),
      metal: new THREE.MeshStandardMaterial({ color: '#a7afb8', metalness: 0.75, roughness: 0.32 }),
      visor: new THREE.MeshStandardMaterial({ color: '#4a3412', metalness: 1, roughness: 0.08, emissive: '#c88a2c', emissiveIntensity: 0.14 }),
      stripe: new THREE.MeshStandardMaterial({ color: '#c9472c', roughness: 0.7 }),
      patch: new THREE.MeshStandardMaterial({ color: '#2d5aa3', roughness: 0.6 }),
      lamp: new THREE.MeshStandardMaterial({ color: '#fff1d0', emissive: '#ffd99a', emissiveIntensity: 1.4 }),
      beacon: new THREE.MeshStandardMaterial({ color: '#ff7a4d', emissive: '#ff6a3a', emissiveIntensity: 1.2 }),
    }),
    [tex],
  );
  useEffect(() => () => Object.values(m).forEach((x) => x.dispose()), [m]);
  return m;
}

function Leg({ side, refG, m }: { side: number; refG: React.RefObject<THREE.Group | null>; m: ReturnType<typeof useSuitMaterials> }) {
  return (
    <group ref={refG} position={[side * 0.17, 0.66, 0]}>
      <mesh material={m.suit} position={[0, -0.2, 0]} castShadow>
        <capsuleGeometry args={[0.135, 0.28, 8, 16]} />
      </mesh>
      <mesh material={m.seam} position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.13, 0.025, 8, 20]} />
      </mesh>
      <mesh material={m.boot} position={[0, -0.56, 0.05]} scale={[1, 0.62, 1.35]} castShadow>
        <sphereGeometry args={[0.15, 20, 14]} />
      </mesh>
    </group>
  );
}

function Arm({ side, refG, m }: { side: number; refG: React.RefObject<THREE.Group | null>; m: ReturnType<typeof useSuitMaterials> }) {
  return (
    <group ref={refG} position={[side * 0.39, 1.24, 0]} rotation={[0, 0, side * 0.16]}>
      <mesh material={m.suit} position={[0, -0.22, 0]} castShadow>
        <capsuleGeometry args={[0.105, 0.3, 8, 16]} />
      </mesh>
      <mesh material={m.stripe} position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.108, 0.022, 8, 20]} />
      </mesh>
      <mesh material={m.metal} position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.095, 0.022, 8, 20]} />
      </mesh>
      <mesh material={m.glove} position={[0, -0.5, 0.02]} scale={[1, 1.1, 0.85]} castShadow>
        <sphereGeometry args={[0.1, 16, 12]} />
      </mesh>
    </group>
  );
}

/** Smooth, higher-polygon EVA suit modelled on Apollo/Artemis silhouettes. */
export function Astronaut({ rt, powered, paused }: { rt: MutableRefObject<Runtime>; powered: boolean; paused: boolean }) {
  const m = useSuitMaterials();
  const g = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const shield = useRef<THREE.Group>(null);
  const phase = useRef(0);
  useFrame((_, dt) => {
    const r = rt.current;
    if (!g.current) return;
    g.current.position.set(r.pos.x, r.pos.y, r.pos.z);
    const cur = g.current.rotation.y;
    let d = r.facing - cur;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    g.current.rotation.y = cur + d * 0.2;
    const blink = r.invulnUntil > r.time && Math.floor(r.time * 12) % 2 === 0;
    g.current.visible = !blink;
    if (shield.current) shield.current.visible = powered;
    if (paused) return;
    const sp = Math.hypot(r.vel.x, r.vel.z);
    const moving = sp > 0.5;
    phase.current += Math.min(dt, 0.05) * (moving ? 9 : 2);
    const swing = moving ? Math.sin(phase.current) * 0.55 : 0;
    const ease = (o: THREE.Object3D | null, v: number) => o && (o.rotation.x += (v - o.rotation.x) * 0.25);
    ease(legL.current, swing);
    ease(legR.current, -swing);
    ease(armL.current, -swing * 0.7);
    ease(armR.current, swing * 0.7);
    if (body.current) body.current.position.y = moving ? Math.abs(Math.cos(phase.current)) * 0.05 : Math.sin(phase.current) * 0.012;
    if (shield.current) shield.current.rotation.y += 0.01;
  });
  return (
    <group ref={g}>
      <Leg side={-1} refG={legL} m={m} />
      <Leg side={1} refG={legR} m={m} />
      <group ref={body}>
        {/* torso */}
        <mesh material={m.suit} position={[0, 1.0, 0]} scale={[1.05, 1, 0.82]} castShadow>
          <capsuleGeometry args={[0.3, 0.32, 10, 24]} />
        </mesh>
        <mesh material={m.metal} position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 0.82, 1]}>
          <torusGeometry args={[0.29, 0.035, 10, 32]} />
        </mesh>
        <RoundedBox args={[0.32, 0.18, 0.1]} radius={0.03} smoothness={3} position={[0, 1.02, 0.25]} material={m.seam} />
        <mesh material={m.lamp} position={[-0.08, 1.04, 0.305]}>
          <sphereGeometry args={[0.022, 10, 8]} />
        </mesh>
        <mesh material={m.beacon} position={[0.08, 1.04, 0.305]}>
          <sphereGeometry args={[0.022, 10, 8]} />
        </mesh>
        <mesh material={m.patch} position={[-0.3, 1.18, 0.12]} rotation={[0, -0.9, 0]}>
          <circleGeometry args={[0.07, 24]} />
        </mesh>
        {/* life-support backpack */}
        <RoundedBox args={[0.6, 0.72, 0.3]} radius={0.07} smoothness={4} position={[0, 1.07, -0.34]} material={m.seam} castShadow />
        <mesh material={m.metal} position={[0.2, 1.48, -0.38]}>
          <cylinderGeometry args={[0.015, 0.015, 0.32, 8]} />
        </mesh>
        <mesh material={m.beacon} position={[0.2, 1.66, -0.38]}>
          <sphereGeometry args={[0.04, 12, 10]} />
        </mesh>
        <Arm side={-1} refG={armL} m={m} />
        <Arm side={1} refG={armR} m={m} />
        {/* neck ring + helmet */}
        <mesh material={m.metal} position={[0, 1.37, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.04, 10, 32]} />
        </mesh>
        <mesh material={m.suit} position={[0, 1.62, 0]} castShadow>
          <sphereGeometry args={[0.32, 36, 28]} />
        </mesh>
        <mesh material={m.visor} position={[0, 1.6, 0.095]} scale={[1, 0.88, 1]}>
          <sphereGeometry args={[0.275, 36, 28]} />
        </mesh>
        <mesh material={m.lamp} position={[0.22, 1.82, 0.16]}>
          <sphereGeometry args={[0.035, 12, 10]} />
        </mesh>
      </group>
      <group ref={shield} position={[0, 1.1, 0]} visible={false}>
        <mesh>
          <sphereGeometry args={[1.3, 40, 28]} />
          <meshBasicMaterial color="#7fd6e0" transparent opacity={0.12} depthWrite={false} />
        </mesh>
        <mesh>
          <icosahedronGeometry args={[1.34, 2]} />
          <meshBasicMaterial color="#9fe6ee" wireframe transparent opacity={0.3} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
