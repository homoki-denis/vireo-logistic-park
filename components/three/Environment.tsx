"use client";
import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useStore } from "@/lib/store";
import { translateData } from "@/lib/i18n";
import { textTexture } from "@/lib/textures";
import type { GroundSpec, PalletSpec, ParkingSpec, Rect, SiteSpec } from "@/lib/types";
import { mulberry32, SLOT_L, SLOT_W } from "@/lib/util";
import { Footprint } from "./Building";

const GROUND_COLORS: Record<GroundSpec["kind"], string> = {
  grass: "#cfe3c4",
  concrete: "#e4e8ee",
  asphalt: "#d3d8e0",
  road: "#c7cdd7",
  sand: "#e6d9bd",
  scrap: "#cbbfb2",
};
const GROUND_ORDER: GroundSpec["kind"][] = ["grass", "sand", "scrap", "concrete", "asphalt", "road"];

export function Ground({ site }: { site: SiteSpec }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#dfe8d9" roughness={1} />
      </mesh>
      {site.ground.map((g, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[g.x, 0.002 + GROUND_ORDER.indexOf(g.kind) * 0.006, g.z]} receiveShadow>
          <planeGeometry args={[g.w, g.d]} />
          <meshStandardMaterial color={GROUND_COLORS[g.kind]} roughness={1} />
        </mesh>
      ))}
      <StreetMarkings />
      {site.streetLabel && <StreetLabel {...site.streetLabel} />}
    </group>
  );
}

function StreetMarkings() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const n = 140;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(-420 + i * 6, 0.05, 9);
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]}>
      <boxGeometry args={[3, 0.02, 0.22]} />
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
}

function StreetLabel({ text: raw, x, z }: { text: string; x: number; z: number }) {
  const lang = useStore((s) => s.lang);
  const text = translateData(raw, lang);
  const tex = useMemo(() => textTexture(text, { color: "rgba(80,92,110,0.9)", font: "600 60px system-ui, -apple-system, Segoe UI, sans-serif" }), [text]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, z + 2.8]}>
      <planeGeometry args={[40, 5]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

// ------------------------------------------------------------------ parking
const CAR_COLORS = ["#f4f5f7", "#f4f5f7", "#c9ced6", "#9aa2ad", "#2c3138", "#2c3138", "#1d2d4f", "#b6262c", "#6b7480", "#e9e2d0"];

interface CarPlacement {
  x: number;
  z: number;
  rot: number;
  color: string;
}

function parkingLayout(p: ParkingSpec) {
  const along = p.axis === "x" ? p.w : p.d;
  const perRow = Math.max(1, Math.floor(along / SLOT_W));
  const slots: { x: number; z: number; rot: number }[] = [];
  const lines: { x: number; z: number; len: number; alongX: boolean }[] = [];
  const rowDepth = (p.axis === "x" ? p.d : p.w) / p.rows;
  for (let r = 0; r < p.rows; r++) {
    const rowCenter = -((p.axis === "x" ? p.d : p.w) / 2) + rowDepth * (r + 0.5);
    for (let i = 0; i < perRow; i++) {
      const a = -along / 2 + SLOT_W * (i + 0.5) + (along - perRow * SLOT_W) / 2;
      const flip = r % 2 === 0 ? 0 : Math.PI;
      if (p.axis === "x") slots.push({ x: p.x + a, z: p.z + rowCenter, rot: Math.PI / 2 + flip });
      else slots.push({ x: p.x + rowCenter, z: p.z + a, rot: flip });
    }
    for (let i = 0; i <= perRow; i++) {
      const a = -along / 2 + SLOT_W * i + (along - perRow * SLOT_W) / 2;
      const len = Math.min(SLOT_L, rowDepth);
      if (p.axis === "x") lines.push({ x: p.x + a, z: p.z + rowCenter, len, alongX: false });
      else lines.push({ x: p.x + rowCenter, z: p.z + a, len, alongX: true });
    }
  }
  return { slots, lines };
}

export function Parkings({ site }: { site: SiteSpec }) {
  const parkings = useStore((s) => s.live.parkings);
  const showNeighbours = useStore((s) => s.showNeighbours);
  const cars = useMemo(() => {
    const out: CarPlacement[] = [];
    for (const p of site.parkings) {
      if (!p.own && !showNeighbours) continue;
      const { slots } = parkingLayout(p);
      const rnd = mulberry32(p.seed);
      const order = slots.map((s, i) => ({ s, k: rnd(), i })).sort((a, b) => a.k - b.k);
      const occupied = parkings[p.id]?.occupied ?? Math.round(slots.length * p.occupancy);
      order.slice(0, occupied).forEach(({ s, i }) => {
        const c = mulberry32(p.seed * 100 + i);
        out.push({ x: s.x + (c() - 0.5) * 0.3, z: s.z + (c() - 0.5) * 0.3, rot: s.rot + (c() - 0.5) * 0.06, color: CAR_COLORS[Math.floor(c() * CAR_COLORS.length)] });
      });
    }
    return out;
  }, [site, parkings, showNeighbours]);

  return (
    <group>
      {site.parkings.map((p) => (!p.own && !showNeighbours ? null : <ParkingLot key={p.id} p={p} />))}
      <Cars cars={cars} />
    </group>
  );
}

function ParkingLot({ p }: { p: ParkingSpec }) {
  const selected = useStore((s) => s.selectedId === p.id);
  const hovered = useStore((s) => s.hoveredId === p.id);
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);
  const { lines } = useMemo(() => parkingLayout(p), [p]);
  const handlers = p.own
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          select(p.id);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          hover(p.id);
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          hover(null);
          document.body.style.cursor = "";
        },
      }
    : {};
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[p.x, 0.045, p.z]} receiveShadow {...handlers}>
        <planeGeometry args={[p.w, p.d]} />
        <meshStandardMaterial color={hovered ? "#c4cfe2" : "#cbd1da"} roughness={1} />
      </mesh>
      {lines.map((l, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[l.x, 0.06, l.z]}>
          <planeGeometry args={l.alongX ? [l.len, 0.12] : [0.12, l.len]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {selected && <Footprint x={p.x} z={p.z} w={p.w} d={p.d} pad={1} />}
    </group>
  );
}

function Cars({ cars }: { cars: CarPlacement[] }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const cabin = useRef<THREE.InstancedMesh>(null);
  const max = 600;
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    cars.forEach((c, i) => {
      o.position.set(c.x, 0, c.z);
      o.rotation.set(0, c.rot, 0);
      o.updateMatrix();
      body.current!.setMatrixAt(i, o.matrix);
      cabin.current!.setMatrixAt(i, o.matrix);
      body.current!.setColorAt(i, col.set(c.color));
    });
    body.current!.count = cars.length;
    cabin.current!.count = cars.length;
    body.current!.instanceMatrix.needsUpdate = true;
    cabin.current!.instanceMatrix.needsUpdate = true;
    if (body.current!.instanceColor) body.current!.instanceColor.needsUpdate = true;
  }, [cars]);
  const bodyGeo = useMemo(() => new THREE.BoxGeometry(4.4, 0.85, 1.8).translate(0, 0.7, 0), []);
  const cabinGeo = useMemo(() => new THREE.BoxGeometry(2.3, 0.62, 1.62).translate(-0.25, 1.42, 0), []);
  return (
    <group>
      <instancedMesh ref={body} args={[bodyGeo, undefined, max]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.35} metalness={0.25} />
      </instancedMesh>
      <instancedMesh ref={cabin} args={[cabinGeo, undefined, max]} castShadow>
        <meshStandardMaterial color="#3a4656" roughness={0.2} metalness={0.3} />
      </instancedMesh>
    </group>
  );
}

// ------------------------------------------------------------------ trees
export function Trees({ site }: { site: SiteSpec }) {
  const trees = useMemo(() => {
    const out: { x: number; z: number; s: number; c: string }[] = [];
    const greens = ["#8fc27a", "#7db66a", "#a2cc8d", "#6fa85e"];
    const blocked = [...site.buildings, ...site.parkings, ...site.ground.filter((g) => g.kind === "road" || g.kind === "asphalt" || g.kind === "concrete")];
    const free = (x: number, z: number) => !blocked.some((b) => Math.abs(x - b.x) < b.w / 2 + 3 && Math.abs(z - b.z) < b.d / 2 + 3);
    for (const zone of site.treeZones) {
      const rnd = mulberry32(zone.seed);
      for (let i = 0; i < zone.count * 2 && out.length < 900; i++) {
        const x = zone.rect.x + (rnd() - 0.5) * zone.rect.w;
        const z = zone.rect.z + (rnd() - 0.5) * zone.rect.d;
        if (i >= zone.count && rnd() > 0.2) continue;
        if (!free(x, z)) continue;
        out.push({ x, z, s: 0.8 + rnd() * 0.8, c: greens[Math.floor(rnd() * greens.length)] });
      }
    }
    let k = 1;
    for (const row of site.treeRows) {
      const dx = row.to[0] - row.from[0];
      const dz = row.to[1] - row.from[1];
      const len = Math.hypot(dx, dz);
      const rnd = mulberry32(k++ * 97);
      for (let t = 0; t <= len; t += row.step) {
        out.push({ x: row.from[0] + (dx * t) / len, z: row.from[1] + (dz * t) / len, s: 0.9 + rnd() * 0.5, c: greens[Math.floor(rnd() * greens.length)] });
      }
    }
    return out;
  }, [site]);

  const trunk = useRef<THREE.InstancedMesh>(null);
  const crown = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    trees.forEach((t, i) => {
      o.position.set(t.x, 0, t.z);
      o.scale.setScalar(t.s);
      o.rotation.set(0, i * 1.7, 0);
      o.updateMatrix();
      trunk.current!.setMatrixAt(i, o.matrix);
      crown.current!.setMatrixAt(i, o.matrix);
      crown.current!.setColorAt(i, col.set(t.c));
    });
    trunk.current!.instanceMatrix.needsUpdate = true;
    crown.current!.instanceMatrix.needsUpdate = true;
    if (crown.current!.instanceColor) crown.current!.instanceColor.needsUpdate = true;
  }, [trees]);
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.25, 0.35, 3, 6).translate(0, 1.5, 0), []);
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(2.6, 0).translate(0, 4.6, 0), []);
  return (
    <group>
      <instancedMesh ref={trunk} args={[trunkGeo, undefined, trees.length]} castShadow>
        <meshStandardMaterial color="#8a7058" />
      </instancedMesh>
      <instancedMesh ref={crown} args={[crownGeo, undefined, trees.length]} castShadow receiveShadow>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  );
}

// ------------------------------------------------------------------ pallets
export function Pallets({ list }: { list: PalletSpec[] }) {
  return (
    <group>
      {list.map((p, i) => (
        <PalletStack key={i} p={p} />
      ))}
    </group>
  );
}

function PalletStack({ p }: { p: PalletSpec }) {
  const items = useMemo(() => {
    const rnd = mulberry32(p.seed);
    const out: { x: number; z: number; layers: number }[] = [];
    for (let c = 0; c < p.cols; c++)
      for (let r = 0; r < p.rows; r++) {
        out.push({ x: p.x + (c - (p.cols - 1) / 2) * 1.5, z: p.z + (r - (p.rows - 1) / 2) * 1.3, layers: 1 + Math.floor(rnd() * (p.kind === "wood" ? 8 : 2)) });
      }
    return out;
  }, [p]);
  return (
    <group>
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0, it.z]}>
          {p.kind === "wood" ? (
            <mesh position={[0, (it.layers * 0.15) / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.2, it.layers * 0.15, 1.0]} />
              <meshStandardMaterial color="#c79f6a" roughness={0.9} />
            </mesh>
          ) : p.kind === "blocks" ? (
            <>
              <mesh position={[0, 0.075, 0]} castShadow>
                <boxGeometry args={[1.2, 0.15, 1.0]} />
                <meshStandardMaterial color="#b58e5d" />
              </mesh>
              <mesh position={[0, 0.15 + (it.layers + 1) * 0.35, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.1, (it.layers + 1) * 0.7, 0.95]} />
                <meshStandardMaterial color="#c7c2b8" roughness={0.95} />
              </mesh>
            </>
          ) : p.kind === "scrap" ? (
            <mesh position={[0, 0.5, 0]} rotation={[0.3 * it.layers, it.layers, 0.2]} scale={[1.3, 0.55, 1]} castShadow>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color={it.layers % 2 ? "#7b5a43" : "#6d6660"} roughness={1} flatShading />
            </mesh>
          ) : p.kind === "crates" ? (
            <mesh position={[0, (it.layers + 2) * 0.4, 0]} castShadow receiveShadow>
              <boxGeometry args={[1.2, (it.layers + 2) * 0.8, 1.0]} />
              <meshStandardMaterial color="#3f9a5c" roughness={0.6} />
            </mesh>
          ) : (
            <>
              <mesh position={[0, 0.075, 0]} castShadow>
                <boxGeometry args={[1.2, 0.15, 1.0]} />
                <meshStandardMaterial color="#c79f6a" />
              </mesh>
              <mesh position={[0, 0.15 + it.layers * 0.5, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.12, it.layers * 1.0, 0.95]} />
                <meshStandardMaterial color={p.kind === "blue" ? "#3b6fe0" : "#d8ab6e"} roughness={0.8} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ misc
export function SolarFields({ list }: { list: Rect[] }) {
  return (
    <group>
      {list.map((f, i) => {
        const rows = Math.max(1, Math.floor(f.d / 3.2));
        return (
          <group key={i}>
            {Array.from({ length: rows }, (_, r) => (
              <mesh key={r} position={[f.x, 1.0, f.z - f.d / 2 + 1.6 + r * 3.2]} rotation={[-0.5, 0, 0]} castShadow>
                <boxGeometry args={[f.w, 0.06, 2]} />
                <meshStandardMaterial color="#26385f" roughness={0.3} metalness={0.4} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

export function Fences({ list }: { list: SiteSpec["fences"] }) {
  return (
    <group>
      {list.map((f, i) => {
        const dx = f.to[0] - f.from[0];
        const dz = f.to[1] - f.from[1];
        const len = Math.hypot(dx, dz);
        return (
          <Fence key={i} len={len} x={(f.from[0] + f.to[0]) / 2} z={(f.from[1] + f.to[1]) / 2} rot={Math.atan2(-dz, dx)} kind={f.kind ?? "wall"} h={f.h} />
        );
      })}
    </group>
  );
}

export function ScrapHeaps({ spec }: { spec: NonNullable<SiteSpec["scrapHeaps"]> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const rnd = mulberry32(spec.seed);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const tones = ["#8d7d6d", "#7a746e", "#a08d78", "#6c6660", "#9c9590"];
    for (let i = 0; i < spec.count; i++) {
      o.position.set(spec.rect.x + (rnd() - 0.5) * spec.rect.w, 0, spec.rect.z + (rnd() - 0.5) * spec.rect.d);
      const s = 4 + rnd() * 7;
      o.scale.set(s, s * 0.45, s * (0.7 + rnd() * 0.6));
      o.rotation.set(0, rnd() * Math.PI, 0);
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
      ref.current!.setColorAt(i, col.set(tones[Math.floor(rnd() * tones.length)]));
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [spec]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spec.count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} flatShading />
    </instancedMesh>
  );
}

function Fence({ len, x, z, rot, kind, h }: { len: number; x: number; z: number; rot: number; kind: "wall" | "mesh" | "blue"; h?: number }) {
  const H = h ?? (kind === "mesh" ? 1.8 : 2);
  const posts = Math.max(2, Math.floor(len / 2.5) + 1);
  if (kind === "wall")
    return (
      <mesh position={[x, H / 2, z]} rotation={[0, rot, 0]} castShadow receiveShadow>
        <boxGeometry args={[len, H, 0.2]} />
        <meshStandardMaterial color="#e8e6e1" roughness={0.95} />
      </mesh>
    );
  const color = kind === "blue" ? "#2f6fdc" : "#7f8a96";
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, H / 2, 0]}>
        <boxGeometry args={[len, H, 0.04]} />
        <meshStandardMaterial color={color} transparent opacity={kind === "blue" ? 0.9 : 0.35} roughness={0.6} />
      </mesh>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} position={[-len / 2 + (len / (posts - 1)) * i, H / 2, 0]} castShadow>
          <boxGeometry args={[0.1, H, 0.1]} />
          <meshStandardMaterial color={kind === "blue" ? "#1f55c4" : "#5f6872"} />
        </mesh>
      ))}
    </group>
  );
}
