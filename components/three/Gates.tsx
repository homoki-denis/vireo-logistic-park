"use client";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { objectRegistry } from "@/lib/registry";
import type { GateSpec, SiteSpec } from "@/lib/types";

function stripeTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 8;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 64, 8);
  ctx.fillStyle = "#d8262c";
  ctx.fillRect(0, 0, 32, 8);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** boom barrier: lifts when any moving vehicle of the site is within reach */
function Gate({ g, moverIds }: { g: GateSpec; moverIds: string[] }) {
  const pivot = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  const angle = useRef(0);
  const tex = useMemo(() => {
    const t = stripeTexture();
    t.repeat.set(g.length / 1.6, 1);
    return t;
  }, [g.length]);
  // centre of the lane the boom closes
  const cx = g.x + (g.dir * g.length) / 2;
  useFrame((_, dt) => {
    let open = false;
    for (const id of moverIds) {
      const o = objectRegistry.get(id);
      if (!o) continue;
      if (Math.abs(o.position.x - cx) < g.length / 2 + 1.5 && o.position.z > g.z - 20 && o.position.z < g.z + 9) {
        open = true;
        break;
      }
    }
    const target = open ? Math.PI / 2 - 0.08 : 0;
    angle.current += (target - angle.current) * Math.min(1, dt * 3.2);
    // rotate around the z axis so the boom swings up from horizontal
    pivot.current!.rotation.z = angle.current;
    if (lamp.current) lamp.current.emissive.set(open ? "#22c55e" : "#ef4444");
  });
  return (
    <group position={[g.x, 0, g.z]}>
      {/* post */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.5, 1.2, 0.5]} />
        <meshStandardMaterial color="#f2b40c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[0.18, 0.18, 0.18]} />
        <meshStandardMaterial ref={lamp} color="#222" emissive="#ef4444" emissiveIntensity={1.4} />
      </mesh>
      {/* boom (pivot at the post) */}
      <group ref={pivot} position={[0, 1.05, 0]} rotation={[0, g.dir === -1 ? Math.PI : 0, 0]}>
        <group rotation={[0, 0, 0]}>
          <mesh position={[g.length / 2, 0, 0]} castShadow>
            <boxGeometry args={[g.length, 0.12, 0.08]} />
            <meshStandardMaterial map={tex} roughness={0.4} />
          </mesh>
        </group>
      </group>
      {/* rest support at the free end */}
      <mesh position={[g.dir * (g.length - 0.2), 0.48, 0]} castShadow>
        <boxGeometry args={[0.12, 0.96, 0.12]} />
        <meshStandardMaterial color="#8a919c" />
      </mesh>
    </group>
  );
}

export function Gates({ site }: { site: SiteSpec }) {
  const ids = useMemo(() => site.movers.filter((m) => m.type !== "forklift").map((m) => m.id), [site]);
  if (!site.gates?.length) return null;
  return (
    <group>
      {site.gates.map((g, i) => (
        <Gate key={i} g={g} moverIds={ids} />
      ))}
    </group>
  );
}
