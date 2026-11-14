import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { World } from '../catalog';
import { fbm, hash2, vnoise } from './noise';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx, img: ctx.createImageData(w, h) };
}

function finish(c: HTMLCanvasElement, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Tileable regolith albedo + bump, with small craterlets and pebbles. */
export function makeRegolithTextures(world: World) {
  const S = 512;
  const P = 16;
  const a = canvas(S, S);
  const b = canvas(S, S);
  const pits = Array.from({ length: 46 }, (_, i) => ({
    x: hash2(i, 1.3) * S,
    y: hash2(2.7, i) * S,
    r: 3 + hash2(i, 9.1) ** 2 * 26,
  }));
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * P, v = (y / S) * P;
      const n = fbm(u, v, 5, P);
      const grit = hash2(x * 1.7, y * 3.1);
      let hgt = n * 0.7 + grit * 0.12;
      for (const p of pits) {
        let dx = Math.abs(x - p.x); dx = Math.min(dx, S - dx);
        let dy = Math.abs(y - p.y); dy = Math.min(dy, S - dy);
        const q = Math.hypot(dx, dy) / p.r;
        if (q < 1) hgt -= 0.28 * (1 - q * q);
        else if (q < 1.35) hgt += 0.12 * (1 - (q - 1) / 0.35);
      }
      const pebble = grit > 0.985 ? 0.25 : 0;
      hgt += pebble;
      const i = (y * S + x) * 4;
      const tone = Math.max(0, Math.min(1, 0.35 + hgt * 0.9));
      let r: number, g: number, bl: number;
      if (world === 'moon') {
        const k = 70 + tone * 110;
        r = k; g = k * 0.985; bl = k * 0.96;
      } else {
        const dust = vnoise(u * 0.5, v * 0.5, P / 2);
        r = 110 + tone * 105 + dust * 20;
        g = 52 + tone * 52 + dust * 12;
        bl = 32 + tone * 30;
      }
      a.img.data[i] = r; a.img.data[i + 1] = g; a.img.data[i + 2] = bl; a.img.data[i + 3] = 255;
      const gv = Math.max(0, Math.min(255, 128 + (hgt - 0.35) * 220));
      b.img.data[i] = b.img.data[i + 1] = b.img.data[i + 2] = gv; b.img.data[i + 3] = 255;
    }
  }
  a.ctx.putImageData(a.img, 0, 0);
  b.ctx.putImageData(b.img, 0, 0);
  return { map: finish(a.c, true), bump: finish(b.c, false) };
}

/** Rough stone texture for boulders and meteors. */
export function makeRockTexture(base: [number, number, number]) {
  const S = 256, P = 8;
  const a = canvas(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const n = fbm((x / S) * P, (y / S) * P, 5, P);
      const vein = Math.abs(vnoise((x / S) * P * 3, (y / S) * P * 0.7, P * 3) - 0.5) < 0.03 ? -0.18 : 0;
      const k = 0.55 + n * 0.75 + vein + (hash2(x, y) - 0.5) * 0.12;
      const i = (y * S + x) * 4;
      a.img.data[i] = base[0] * k; a.img.data[i + 1] = base[1] * k; a.img.data[i + 2] = base[2] * k; a.img.data[i + 3] = 255;
    }
  a.ctx.putImageData(a.img, 0, 0);
  return finish(a.c, true);
}

/** Equirectangular Earth: oceans, continents, ice caps, cloud bands. */
export function makeEarthTexture() {
  const W = 512, H = 256;
  const a = canvas(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (x / W) * 8, v = (y / H) * 4;
      const land = fbm(u, v, 5, 8);
      const cloud = fbm(u * 1.6 + 3, v * 2.4, 4, 13);
      const lat = Math.abs(y / H - 0.5) * 2;
      let r = 22, g = 64, b = 128;
      if (land > 0.56) {
        const dry = vnoise(u * 2, v * 2, 16);
        r = 70 + dry * 110; g = 102 + dry * 50; b = 52 + dry * 30;
      }
      if (lat > 0.82) { r = 236; g = 242; b = 248; }
      const c = Math.max(0, (cloud - 0.52) * 3.2);
      const cc = Math.min(1, c);
      const i = (y * W + x) * 4;
      a.img.data[i] = r + (245 - r) * cc; a.img.data[i + 1] = g + (248 - g) * cc; a.img.data[i + 2] = b + (252 - b) * cc; a.img.data[i + 3] = 255;
    }
  a.ctx.putImageData(a.img, 0, 0);
  const t = finish(a.c, true);
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Irregular, smooth-shaded boulder: displaced icosphere with welded seams. */
export function makeRockGeometry(seed: number, detail = 3, rough = 0.35) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n1 = fbm(v.x * 1.6 + seed, v.z * 1.6 + v.y * 0.9, 4);
    const n2 = vnoise(v.y * 4 + seed, v.x * 4 - v.z);
    const k = 1 + (n1 - 0.5) * rough * 2.2 + (n2 - 0.5) * rough * 0.35;
    v.multiplyScalar(k);
    v.y *= 0.78;
    p.setXYZ(i, v.x, v.y, v.z);
    uv[i * 2] = Math.atan2(v.z, v.x) / Math.PI + 1;
    uv[i * 2 + 1] = v.y * 0.6 + 0.5;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

/**
 * Small tiling surface detail maps (albedo multiplier + bump).
 * 'fabric': woven Ortho-fabric weave with regolith dust settling in the grooves.
 * 'skin': soft organic mottling with fine pores.
 * Albedo is near-white so it multiplies a material's own colour.
 */
export function makeSurfaceDetail(kind: 'fabric' | 'skin') {
  const S = 256, P = 8;
  const a = canvas(S, S);
  const b = canvas(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = (x / S) * P, v = (y / S) * P;
      let h: number, r: number, g: number, bl: number;
      if (kind === 'fabric') {
        const wx = Math.sin((x / S) * Math.PI * 96), wy = Math.sin((y / S) * Math.PI * 96);
        const over = (Math.floor(x / (S / 48)) + Math.floor(y / (S / 48))) % 2 === 0;
        const weave = over ? Math.abs(wx) : Math.abs(wy);
        const dust = Math.max(0, fbm(u, v, 4, P) - 0.45) * 1.8;
        h = weave * 0.7 + hash2(x, y) * 0.15 - dust * 0.3;
        const k = 0.9 + weave * 0.1 - dust * 0.14;
        r = 255 * k; g = 252 * k - dust * 6; bl = 246 * k - dust * 14;
      } else {
        const mot = fbm(u * 1.5, v * 1.5, 5, P * 1.5);
        const spot = vnoise(u * 4, v * 4, P * 4) > 0.78 ? 0.12 : 0;
        const pore = hash2(x * 0.9, y * 1.3) > 0.97 ? 0.2 : 0;
        h = mot * 0.8 - pore + spot * 0.5;
        const k = 0.8 + mot * 0.25 - spot;
        r = 238 * k; g = 255 * k; bl = 246 * k;
      }
      const i = (y * S + x) * 4;
      a.img.data[i] = Math.min(255, r); a.img.data[i + 1] = Math.min(255, g); a.img.data[i + 2] = Math.min(255, bl); a.img.data[i + 3] = 255;
      const gv = Math.max(0, Math.min(255, h * 255));
      b.img.data[i] = b.img.data[i + 1] = b.img.data[i + 2] = gv; b.img.data[i + 3] = 255;
    }
  a.ctx.putImageData(a.img, 0, 0);
  b.ctx.putImageData(b.img, 0, 0);
  const map = finish(a.c, true);
  const bump = finish(b.c, false);
  const reps = kind === 'fabric' ? 3 : 2;
  map.repeat.set(reps, reps);
  bump.repeat.set(reps, reps);
  return { map, bump, dispose: () => { map.dispose(); bump.dispose(); } };
}
