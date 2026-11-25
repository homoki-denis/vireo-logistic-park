"use client";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { moverRuntime, objectRegistry } from "@/lib/registry";
import { useStore } from "@/lib/store";
import type { MoverSpec, StaticVehicle } from "@/lib/types";
import { faceAngle, headingFrom } from "@/lib/util";
import { Excavator, Flatbed, Forklift, Loader, Tractor, Trailer, Truck, Van } from "./Vehicles";

interface Seg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  len: number;
  heading: number;
  wait: number; // wait at segment end
  label: string | null;
}

function buildSegments(m: MoverSpec): { segs: Seg[]; total: number } {
  const pts = m.loop ? [...m.path, m.path[0]] : m.path;
  const segs: Seg[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i].p;
    const [bx, bz] = pts[i + 1].p;
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    segs.push({ ax, az, bx, bz, len, heading: headingFrom(bx - ax, bz - az), wait: pts[i + 1].wait ?? 0, label: pts[i + 1].label ?? null });
    total += len;
  }
  return { segs, total };
}

function shortestAngle(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function Mover({ m }: { m: MoverSpec }) {
  const group = useRef<THREE.Group>(null);
  const { segs, total } = useMemo(() => buildSegments(m), [m]);
  const st = useRef({ seg: 0, dist: 0, waitLeft: 0, heading: segs[0]?.heading ?? 0, travelled: 0, speed: 0 });
  const selected = useStore((s) => s.selectedId === m.id);
  const hovered = useStore((s) => s.hoveredId === m.id);
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);
  const loaded = useStore((s) => (m.type === "forklift" ? !!s.live.forklifts[m.id]?.load : false));

  // apply start offset once
  useEffect(() => {
    let off = (m.offset ?? 0) % Math.max(total, 1);
    const s = st.current;
    s.seg = 0;
    while (off > segs[s.seg].len && s.seg < segs.length - 1) {
      off -= segs[s.seg].len;
      s.seg++;
    }
    s.dist = off;
    s.heading = segs[s.seg].heading;
  }, [m.offset, segs, total]);

  useEffect(() => {
    const g = group.current!;
    objectRegistry.set(m.id, g);
    return () => {
      objectRegistry.delete(m.id);
      moverRuntime.delete(m.id);
    };
  }, [m.id]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = st.current;
    if (!segs.length) return;
    const next = () => {
      s.seg++;
      if (s.seg >= segs.length) {
        s.seg = 0;
        if (!m.loop) s.heading = segs[0].heading; // one-way trip: jump back to the start (off-map)
      }
    };
    if (s.waitLeft > 0) {
      s.waitLeft -= dt;
      s.speed = 0;
      if (s.waitLeft <= 0) {
        next();
        s.dist = 0;
      }
    } else {
      // slow down towards the end of a segment (turn / stop)
      const cur = segs[s.seg];
      const remain = cur.len - s.dist;
      const target = remain < 6 ? Math.max(m.speed * 0.35, m.speed * (remain / 6)) : m.speed;
      s.speed += (target - s.speed) * Math.min(1, dt * 2.5);
      s.dist += s.speed * dt;
      while (s.dist >= segs[s.seg].len) {
        const sg = segs[s.seg];
        const over = s.dist - sg.len;
        if (sg.wait > 0) {
          s.waitLeft = sg.wait;
          s.dist = sg.len;
          s.speed = 0;
          break;
        }
        next();
        s.dist = over;
      }
    }
    const seg = segs[s.seg];
    const t = Math.min(1, s.dist / seg.len);
    const x = seg.ax + (seg.bx - seg.ax) * t;
    const z = seg.az + (seg.bz - seg.az) * t;
    s.heading += shortestAngle(s.heading, seg.heading) * Math.min(1, dt * (m.type === "forklift" ? 5 : 3));
    const g = group.current!;
    g.position.set(x, 0, z);
    g.rotation.y = s.heading;

    let done = 0;
    for (let i = 0; i < s.seg; i++) done += segs[i].len;
    const waiting = s.waitLeft > 0;
    moverRuntime.set(m.id, { waiting, label: waiting ? seg.label : null, speed: s.speed, progress: (done + s.dist) / total });
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    select(m.id);
  };

  return (
    <group
      ref={group}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover(m.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover(null);
        document.body.style.cursor = "";
      }}
    >
      {m.type === "forklift" && <Forklift loaded={loaded} />}
      {m.type === "truck" && <Truck color={m.color} />}
      {m.type === "van" && <Van />}
      {m.type === "flatbed" && <Flatbed />}
      {(selected || hovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
          <ringGeometry args={m.type === "forklift" ? [2.2, 2.6, 40] : m.type === "van" ? [3.8, 4.3, 40] : [9, 9.6, 48]} />
          <meshBasicMaterial color="#2f6fdc" transparent opacity={selected ? 0.9 : 0.5} />
        </mesh>
      )}
    </group>
  );
}

export function StaticVehicles({ list }: { list: StaticVehicle[] }) {
  return (
    <group>
      {list.map((v, i) => (
        <group key={i} position={[v.x, 0, v.z]} rotation={[0, faceAngle[v.dir], 0]}>
          {v.type === "truck" && <Truck color={v.color} />}
          {v.type === "trailer" && <Trailer stripe={v.color ?? "#2f6fdc"} legs />}
          {v.type === "van" && <Van />}
          {v.type === "flatbed" && <Flatbed />}
          {v.type === "chassis" && <Flatbed empty />}
          {v.type === "excavator" && <Excavator />}
          {v.type === "loader" && <Loader />}
          {v.type === "tractor" && <Tractor />}
        </group>
      ))}
    </group>
  );
}
