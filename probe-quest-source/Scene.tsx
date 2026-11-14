import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Mission, World } from './catalog';
import { Ground, Boulders } from './visuals/Ground';
import { Sky } from './visuals/Sky';
import { Astronaut } from './visuals/Astronaut';
import { AlienScout, useAlienMaterials } from './visuals/Alien';
import { makeRockGeometry, makeRockTexture } from './visuals/textures';
import {
  PULSE_COOLDOWN,
  PULSE_RANGE,
  SCAN_RANGE,
  type Runtime,
  type Terrain,
} from './runtime';

export type Ctl = 'forward' | 'back' | 'left' | 'right' | 'jump' | 'scan' | 'pulse';

export const PALETTE = {
  moon: { sky: '#05070d', fog: '#0a0d15', hemiSky: '#8796b8', hemiGround: '#3b3a3c', sun: '#fff6ea' },
  mars: { sky: '#2a1c22', fog: '#b98466', hemiSky: '#e7b48e', hemiGround: '#5a2f1f', sun: '#ffe4c8' },
} as const;

interface SceneProps {
  world: World;
  gravity: number;
  missions: Mission[];
  collected: string[];
  terrain: Terrain;
  rt: MutableRefObject<Runtime>;
  paused: boolean;
  powered: boolean;
  speedLevel: number;
  targetId: string | null;
  onScan: (id: string) => void;
  onHit: (reason: string) => void;
  onPulse: (cleared: number) => void;
  onJump: () => void;
  onNoTarget: () => void;
}

const box = new THREE.BoxGeometry(1, 1, 1);

/* ---------------- Voxel helper ---------------- */
function V({ p, s, c, e }: { p: [number, number, number]; s: [number, number, number]; c: string; e?: number }) {
  return (
    <mesh geometry={box} position={p} scale={s} castShadow>
      <meshStandardMaterial color={c} roughness={0.55} metalness={0.2} emissive={e ? c : '#000000'} emissiveIntensity={e ?? 0} />
    </mesh>
  );
}

/* ---------------- NASA-inspired models ---------------- */
function Rover() {
  return (
    <group>
      {[-0.9, 0, 0.9].map((z) =>
        [-0.85, 0.85].map((x) => <V key={`${x}${z}`} p={[x, 0.3, z]} s={[0.3, 0.6, 0.6]} c="#54587a" />),
      )}
      <V p={[0, 0.85, 0]} s={[1.4, 0.5, 2.2]} c="#f4f1ea" />
      <V p={[0, 1.13, 0]} s={[1.5, 0.08, 2.3]} c="#3d6ea8" />
      <V p={[0.4, 1.7, 0.8]} s={[0.12, 1.0, 0.12]} c="#d8d4c8" />
      <V p={[0.4, 2.25, 0.85]} s={[0.5, 0.25, 0.3]} c="#f4f1ea" />
      <V p={[0.4, 2.25, 1.02]} s={[0.12, 0.12, 0.04]} c="#5ac2cf" e={0.4} />
      <V p={[-0.4, 1.5, -0.7]} s={[0.5, 0.06, 0.5]} c="#d8d4c8" />
      <V p={[0, 0.9, 1.25]} s={[0.12, 0.12, 0.6]} c="#e9b04a" />
    </group>
  );
}
function Lander() {
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <group key={`${x}${z}`}>
          <V p={[x * 0.8, 0.6, z * 0.8]} s={[0.12, 1.2, 0.12]} c="#c9c5b8" />
          <V p={[x * 1.0, 0.05, z * 1.0]} s={[0.4, 0.1, 0.4]} c="#c9c5b8" />
        </group>
      ))}
      <V p={[0, 1.3, 0]} s={[1.8, 0.8, 1.8]} c="#e9b04a" />
      <V p={[0, 1.3, 0]} s={[1.9, 0.2, 1.9]} c="#d39432" />
      <V p={[0, 2.1, 0]} s={[1.2, 0.8, 1.2]} c="#f1eee6" />
      <V p={[0, 2.12, 0.62]} s={[0.36, 0.3, 0.04]} c="#3d4a6e" />
      <V p={[0.4, 2.8, 0]} s={[0.08, 0.6, 0.08]} c="#9aa0c2" />
      <V p={[0.4, 3.1, 0]} s={[0.5, 0.06, 0.5]} c="#f4f1ea" />
    </group>
  );
}
function Relay() {
  return (
    <group>
      <V p={[0, 0, 0]} s={[0.9, 0.9, 0.9]} c="#e9b04a" />
      <V p={[-1.5, 0, 0]} s={[1.8, 0.06, 0.8]} c="#3d6ea8" />
      <V p={[1.5, 0, 0]} s={[1.8, 0.06, 0.8]} c="#3d6ea8" />
      <V p={[0, 0.65, 0]} s={[0.7, 0.12, 0.7]} c="#f4f1ea" />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.6, 0.06, 6, 32]} />
        <meshBasicMaterial color="#7fd6e0" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
function Beacon({ color }: { color: string }) {
  return (
    <group>
      <V p={[0, 0.2, 0]} s={[1.6, 0.4, 1.6]} c="#d8d4c8" />
      <V p={[0, 1.2, 0]} s={[0.7, 1.6, 0.7]} c="#f4f1ea" />
      <V p={[0, 2.2, 0]} s={[0.9, 0.4, 0.9]} c={color} e={0.6} />
      <V p={[0, 1.2, 0.36]} s={[0.3, 0.8, 0.04]} c={color} e={0.4} />
    </group>
  );
}

const KIND_COLOR: Record<string, string> = { surface: '#f2735c', orbit: '#3fb3c4', signals: '#9a7ae0' };

function MissionSite({
  m,
  y,
  collected,
  targeted,
}: {
  m: Mission;
  y: number;
  collected: boolean;
  targeted: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  const marker = useRef<THREE.Group>(null);
  const isRover = /rover|helicopter|ingenuity/i.test(m.type + m.name);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (g.current && m.kind === 'orbit') {
      g.current.position.y = y + 4 + Math.sin(t + m.x) * 0.4;
      g.current.rotation.y = t * 0.3;
    }
    if (marker.current) {
      marker.current.position.y = (m.kind === 'orbit' ? 8 : 5) + Math.sin(t * 2.4) * 0.3;
      marker.current.rotation.y = t * 1.5;
      const s = targeted ? 1.3 : 1;
      marker.current.scale.setScalar(s);
    }
  });
  const c = KIND_COLOR[m.kind] ?? '#f2735c';
  return (
    <group position={[m.x, 0, m.z]}>
      <group ref={g} position={[0, m.kind === 'orbit' ? y + 4 : y, 0]} rotation={[0, (m.x * 7) % 6, 0]}>
        {m.kind === 'surface' ? isRover ? <Rover /> : <Lander /> : m.kind === 'orbit' ? <Relay /> : <Beacon color={c} />}
      </group>
      {m.kind === 'orbit' && (
        <>
          <V p={[0, y + 0.15, 0]} s={[2.4, 0.3, 2.4]} c="#d8d4c8" />
          <V p={[0, y + 0.9, 0]} s={[0.3, 1.2, 0.3]} c="#f4f1ea" />
          <V p={[0, y + 1.6, 0]} s={[1.0, 0.1, 1.0]} c="#7fd6e0" e={0.5} />
        </>
      )}
      <mesh position={[0, y + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SCAN_RANGE - 0.3, SCAN_RANGE, 32]} />
        <meshBasicMaterial color={collected ? '#8ccf9a' : c} transparent opacity={targeted ? 0.9 : 0.35} />
      </mesh>
      <group ref={marker} position={[0, 5, 0]}>
        <group position={[0, y, 0]}>
          <mesh rotation={[Math.PI / 4, 0, Math.PI / 4]}>
            <boxGeometry args={[0.7, 0.7, 0.7]} />
            <meshLambertMaterial color={collected ? '#8ccf9a' : c} emissive={collected ? '#8ccf9a' : c} emissiveIntensity={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ---------------- Hazards ---------------- */
interface Meteor {
  x: number;
  z: number;
  gy: number;
  t: number;
  active: boolean;
}
const WARN = 2.0;
const METEOR_R = 2.4;

function Meteors({ rt, terrain, paused, onHit, world }: { rt: MutableRefObject<Runtime>; terrain: Terrain; paused: boolean; onHit: (r: string) => void; world: World }) {
  const N = 4;
  const state = useRef<Meteor[]>(Array.from({ length: N }, () => ({ x: 0, z: 0, gy: 0, t: 0, active: false })));
  const rocks = useRef<(THREE.Mesh | null)[]>([]);
  const rings = useRef<(THREE.Group | null)[]>([]);
  const timer = useRef(5);
  const rockGeo = useMemo(() => makeRockGeometry(world === 'moon' ? 4.4 : 6.6, 3, 0.4), [world]);
  const rockMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: makeRockTexture([96, 84, 78]),
        roughness: 0.9,
        emissive: '#ff7a3a',
        emissiveIntensity: 0.22,
      }),
    [],
  );
  useEffect(() => () => rockGeo.dispose(), [rockGeo]);
  useEffect(() => () => { rockMat.map?.dispose(); rockMat.dispose(); }, [rockMat]);
  const onHitRef = useRef(onHit);
  onHitRef.current = onHit;
  useFrame((_, dt) => {
    if (paused) return;
    const d = Math.min(dt, 0.05);
    const r = rt.current;
    timer.current -= d;
    if (timer.current <= 0) {
      timer.current = world === 'mars' ? 3.6 : 4.4;
      const slot = state.current.find((m) => !m.active);
      if (slot) {
        const a = Math.random() * Math.PI * 2;
        const dist = 1 + Math.random() * 6;
        slot.x = r.pos.x + r.vel.x * 0.9 + Math.cos(a) * dist;
        slot.z = r.pos.z + r.vel.z * 0.9 + Math.sin(a) * dist;
        slot.gy = terrain.height(slot.x, slot.z);
        slot.t = 0;
        slot.active = true;
      }
    }
    state.current.forEach((m, i) => {
      const rock = rocks.current[i];
      const ring = rings.current[i];
      if (!rock || !ring) return;
      if (!m.active) {
        rock.visible = false;
        ring.visible = false;
        return;
      }
      m.t += d;
      ring.visible = true;
      ring.position.set(m.x, m.gy + 0.14, m.z);
      const k = Math.min(m.t / WARN, 1);
      ring.scale.setScalar(0.4 + k * 0.6);
      rock.visible = true;
      rock.position.set(m.x + (1 - k) * 6, m.gy + (1 - k) * 26 + 0.6, m.z - (1 - k) * 4);
      rock.rotation.x += d * 6;
      rock.rotation.z += d * 4;
      if (m.t >= WARN) {
        m.active = false;
        const dx = r.pos.x - m.x;
        const dz = r.pos.z - m.z;
        if (Math.hypot(dx, dz) < METEOR_R && r.pos.y < m.gy + 2.5) onHitRef.current('meteor');
      }
    });
  });
  return (
    <group>
      {Array.from({ length: N }, (_, i) => (
        <group key={i}>
          <mesh ref={(el) => (rocks.current[i] = el)} geometry={rockGeo} material={rockMat} scale={[0.72, 0.62, 0.66]} visible={false} castShadow />
          <group ref={(el) => (rings.current[i] = el)} visible={false}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[METEOR_R, 24]} />
              <meshBasicMaterial color="#f2735c" transparent opacity={0.24} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
              <ringGeometry args={[METEOR_R - 0.25, METEOR_R, 24]} />
              <meshBasicMaterial color="#e2583e" polygonOffset polygonOffsetFactor={-3} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

interface Drone {
  x: number;
  y: number;
  z: number;
  asleep: number;
}

function Drones({
  rt,
  terrain,
  paused,
  onHit,
  onPulse,
  world,
}: {
  rt: MutableRefObject<Runtime>;
  terrain: Terrain;
  paused: boolean;
  onHit: (r: string) => void;
  onPulse: (n: number) => void;
  world: World;
}) {
  const N = world === 'mars' ? 3 : 2;
  const spawnFar = (i: number, d: Drone) => {
    const r = rt.current;
    const a = i * 2.1 + Math.random() * 1.5;
    d.x = r.pos.x + Math.cos(a) * 24;
    d.z = r.pos.z + Math.sin(a) * 24;
    d.y = terrain.height(d.x, d.z) + 2.4;
  };
  const drones = useRef<Drone[]>([]);
  if (drones.current.length !== N) {
    drones.current = Array.from({ length: N }, (_, i) => {
      const d = { x: 0, y: 3, z: 0, asleep: 4 + i * 3 };
      return d;
    });
  }
  const refs = useRef<(THREE.Group | null)[]>([]);
  const alienMats = useAlienMaterials();
  const lastPulse = useRef(-10);
  const cbs = useRef({ onHit, onPulse });
  cbs.current = { onHit, onPulse };
  useFrame(({ clock }, dt) => {
    if (paused) return;
    const d = Math.min(dt, 0.05);
    const r = rt.current;
    const pulsed = r.pulseAt !== lastPulse.current;
    let cleared = 0;
    drones.current.forEach((dr, i) => {
      const g = refs.current[i];
      if (!g) return;
      if (dr.asleep > 0) {
        dr.asleep -= d;
        g.visible = false;
        if (dr.asleep <= 0) spawnFar(i, dr);
        return;
      }
      g.visible = true;
      const dx = r.pos.x - dr.x;
      const dz = r.pos.z - dr.z;
      const dist = Math.hypot(dx, dz) || 1;
      const sp = world === 'mars' ? 3.4 : 2.8;
      dr.x += (dx / dist) * sp * d;
      dr.z += (dz / dist) * sp * d;
      const gy = terrain.height(dr.x, dr.z) + 2.0 + Math.sin(clock.elapsedTime * 3 + i) * 0.3;
      dr.y += (gy - dr.y) * Math.min(1, d * 3);
      g.position.set(dr.x, dr.y, dr.z);
      g.rotation.y = Math.atan2(dx, dz);
      if (pulsed && dist < PULSE_RANGE) {
        dr.asleep = 7;
        cleared++;
        return;
      }
      if (dist < 1.3 && Math.abs(dr.y - (r.pos.y + 1)) < 2.2) {
        cbs.current.onHit('drone');
        dr.asleep = 5;
      }
    });
    if (pulsed) {
      lastPulse.current = r.pulseAt;
      cbs.current.onPulse(cleared);
    }
  });
  return (
    <group>
      {Array.from({ length: N }, (_, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} visible={false}>
          <AlienScout m={alienMats} />
        </group>
      ))}
    </group>
  );
}

function PulseWave({ rt }: { rt: MutableRefObject<Runtime> }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const r = rt.current;
    const k = (r.time - r.pulseAt) / 0.6;
    if (!m.current) return;
    m.current.visible = k >= 0 && k < 1;
    if (k >= 0 && k < 1) {
      m.current.position.set(r.pos.x, r.pos.y + 0.6, r.pos.z);
      m.current.scale.setScalar(0.5 + k * PULSE_RANGE);
      (m.current.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - k);
    }
  });
  return (
    <mesh ref={m} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.85, 1, 40]} />
      <meshBasicMaterial color="#5ac2cf" transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}

/* ---------------- Player + camera controller ---------------- */
function Controller(p: SceneProps) {
  const [, get] = useKeyboardControls<Ctl>();
  const { camera } = useThree();
  const prev = useRef({ jump: false, scan: false, pulse: false });
  const token = useRef(-1);
  const lastScan = useRef(-10);
  const cb = useRef(p);
  cb.current = p;
  const camPos = useRef(new THREE.Vector3(0, 10, 14));
  const look = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const P = cb.current;
    const r = P.rt.current;
    const ter = P.terrain;
    if (token.current !== r.resetToken) {
      token.current = r.resetToken;
      r.pos.x = ter.spawn.x;
      r.pos.z = ter.spawn.z + 2;
      r.pos.y = ter.height(r.pos.x, r.pos.z) + 3;
      r.vel = { x: 0, y: 0, z: 0 };
      camPos.current.set(r.pos.x, r.pos.y + 4.8, r.pos.z + 13);
    }
    if (P.paused) return;
    const d = Math.min(dt, 0.05);
    r.time += d;
    const k = get();
    const ix = (k.right || r.touch.r ? 1 : 0) - (k.left || r.touch.l ? 1 : 0);
    const iz = (k.back || r.touch.b ? 1 : 0) - (k.forward || r.touch.f ? 1 : 0);
    const queued = r.actions.splice(0);
    const want = (a: 'jump' | 'scan' | 'pulse') => (k[a] && !prev.current[a]) || queued.includes(a);
    const jump = want('jump');
    const scan = want('scan');
    const pulse = want('pulse');
    prev.current = { jump: k.jump, scan: k.scan, pulse: k.pulse };

    const speed = 5.2 + P.speedLevel * 1.4 + (P.powered ? 4 : 0);
    const len = Math.hypot(ix, iz) || 1;
    const tx = (ix / len) * speed;
    const tz = (iz / len) * speed;
    const ground = ter.height(r.pos.x, r.pos.z);
    const onGround = r.pos.y <= ground + 0.02;
    const accel = onGround ? 12 : 4;
    r.vel.x += (tx - r.vel.x) * Math.min(1, accel * d);
    r.vel.z += (tz - r.vel.z) * Math.min(1, accel * d);
    if (ix || iz) r.facing = Math.atan2(ix, iz);

    if (jump && onGround) {
      const hTarget = P.world === 'moon' ? 4.2 : 2.9;
      r.vel.y = Math.sqrt(2 * P.gravity * hTarget);
      P.onJump();
    }
    r.vel.y -= P.gravity * d;

    // horizontal with step collision
    const nx = r.pos.x + r.vel.x * d;
    if (ter.height(nx, r.pos.z) <= r.pos.y + 0.55) r.pos.x = nx;
    else r.vel.x = 0;
    const nz = r.pos.z + r.vel.z * d;
    if (ter.height(r.pos.x, nz) <= r.pos.y + 0.55) r.pos.z = nz;
    else r.vel.z = 0;

    r.pos.y += r.vel.y * d;
    const g2 = ter.height(r.pos.x, r.pos.z);
    if (r.pos.y < g2) {
      if (g2 - r.pos.y < 0.6) r.pos.y = g2;
      else r.pos.y = g2;
      r.vel.y = 0;
    }

    // nearest target
    let best: Mission | null = null;
    let bd = Infinity;
    for (const m of P.missions) {
      if (P.collected.includes(m.id)) continue;
      const dd = Math.hypot(m.x - r.pos.x, m.z - r.pos.z);
      if (dd < bd) {
        bd = dd;
        best = m;
      }
    }
    r.nearestId = best?.id ?? null;
    r.nearestDist = bd;
    r.inRange = bd < SCAN_RANGE;

    if (scan && r.time - lastScan.current > 0.3) {
      lastScan.current = r.time;
      if (best && r.inRange) P.onScan(best.id);
      else P.onNoTarget();
    }
    if (pulse && r.time - r.pulseAt > PULSE_COOLDOWN) r.pulseAt = r.time;

    // camera
    camPos.current.lerp(new THREE.Vector3(r.pos.x, r.pos.y + 4.8, r.pos.z + 12.5), Math.min(1, d * 3.2));
    camera.position.copy(camPos.current);
    look.current.lerp(new THREE.Vector3(r.pos.x, r.pos.y + 2, r.pos.z - 9), Math.min(1, d * 5));
    camera.lookAt(look.current);
  });
  return null;
}

function SunLight({ rt, color, world }: { rt: MutableRefObject<Runtime>; color: string; world: World }) {
  const l = useRef<THREE.DirectionalLight>(null);
  useFrame(() => {
    const r = rt.current;
    if (!l.current) return;
    l.current.position.set(r.pos.x + 14, r.pos.y + 24, r.pos.z + 10);
    l.current.target.position.set(r.pos.x, r.pos.y, r.pos.z);
    l.current.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={l}
      color={color}
      intensity={world === 'moon' ? 2.6 : 2.1}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
      shadow-camera-left={-22}
      shadow-camera-right={22}
      shadow-camera-top={22}
      shadow-camera-bottom={-22}
      shadow-camera-far={80}
    />
  );
}

export default function GameScene(p: SceneProps) {
  const pal = PALETTE[p.world];
  return (
    <>
      <color attach="background" args={[pal.sky]} />
      <fog attach="fog" args={[pal.fog, p.world === 'moon' ? 60 : 34, p.world === 'moon' ? 150 : 110]} />
      <hemisphereLight args={[pal.hemiSky, pal.hemiGround, p.world === 'moon' ? 0.55 : 0.75]} />
      <ambientLight intensity={p.world === 'moon' ? 0.12 : 0.18} />
      <SunLight rt={p.rt} color={pal.sun} world={p.world} />
      <Sky world={p.world} paused={p.paused} />
      <Ground world={p.world} terrain={p.terrain} />
      <Boulders world={p.world} terrain={p.terrain} avoid={p.missions} />
      {p.missions.map((m) => (
        <MissionSite
          key={m.id}
          m={m}
          y={p.terrain.height(m.x, m.z)}
          collected={p.collected.includes(m.id)}
          targeted={p.targetId === m.id}
        />
      ))}
      <Astronaut rt={p.rt} powered={p.powered} paused={p.paused} />
      <PulseWave rt={p.rt} />
      <Meteors rt={p.rt} terrain={p.terrain} paused={p.paused} onHit={p.onHit} world={p.world} />
      <Drones rt={p.rt} terrain={p.terrain} paused={p.paused} onHit={p.onHit} onPulse={p.onPulse} world={p.world} />
      <Controller {...p} />
    </>
  );
}
