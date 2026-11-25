"use client";
import { Line } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { claddingTexture, gridWindowTexture, repeated, solarTexture, textTexture, windowTexture } from "@/lib/textures";
import { buildingFor, useStore } from "@/lib/store";
import { PARK } from "@/lib/sites";
import type { BuildingSpec, Face } from "@/lib/types";
import { doorPosition } from "@/lib/util";

interface Hl {
  emissive: string;
  intensity: number;
}

const NO_HL: Hl = { emissive: "#000000", intensity: 0 };
const CODE_BY_BUILDING = new Map(PARK.buildings.filter((b) => b.code).map((b) => [b.id, b.code!]));

export function Building({ b: world }: { b: BuildingSpec }) {
  // everything is drawn around the origin, then placed + rotated as a whole
  const b = useMemo(() => ({ ...world, x: 0, z: 0 }), [world]);
  const selected = useStore((s) => {
    if (!s.selectedId) return false;
    const target = buildingFor(s.selectedId, s.live);
    if (target === world.id) return true;
    // the three SEZ tents (same code) light up together
    return !!world.code && !!target && CODE_BY_BUILDING.get(target) === world.code;
  });
  const hovered = useStore((s) => s.hoveredId === world.id);
  const select = useStore((s) => s.select);
  const hover = useStore((s) => s.hover);

  const hl: Hl = !b.own ? NO_HL : selected ? { emissive: "#2a64ff", intensity: 0.2 } : hovered ? { emissive: "#4d86ff", intensity: 0.13 } : NO_HL;

  const handlers = b.own
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          select(b.id);
        },
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          hover(b.id);
          document.body.style.cursor = "pointer";
        },
        onPointerOut: () => {
          hover(null);
          document.body.style.cursor = "";
        },
      }
    : {};

  return (
    <group {...handlers} position={[world.x, 0, world.z]} rotation={[0, world.rot ?? 0, 0]}>
      {b.kind === "hall" && <Hall b={b} hl={hl} />}
      {b.kind === "office" && <Office b={b} hl={hl} />}
      {b.kind === "gable" && <Gable b={b} hl={hl} />}
      {b.kind === "tent" && <Tent b={b} hl={hl} />}
      {b.kind === "silo" && <Silo b={b} />}
      <Doors b={b} />
      {b.canopy && <Canopy b={b} face={b.canopy} />}
      {b.ramp && <Ramp b={b} face={b.ramp} />}
      {b.windows && <Windows b={b} />}
      {b.sign && <Sign b={b} face={b.sign.face} text={b.sign.text} />}
      {selected && <Footprint x={b.x} z={b.z} w={b.w} d={b.d} />}
    </group>
  );
}

// ---------------------------------------------------------------- walls
function Walls({ b, hl, h, texture }: { b: BuildingSpec; hl: Hl; h: number; texture: "clad" | "windows" }) {
  const mats = useMemo(() => {
    const wall = b.wall ?? "#d5dae2";
    let tx: THREE.Texture, tz: THREE.Texture;
    if (texture === "windows") {
      const t = windowTexture(wall);
      const floors = b.floors ?? Math.max(1, Math.round(h / 3.4));
      tx = repeated(t, Math.max(1, Math.round(b.d / 3.4)), floors);
      tz = repeated(t, Math.max(1, Math.round(b.w / 3.4)), floors);
    } else {
      const t = claddingTexture(wall);
      tx = repeated(t, b.d / 1.1, 1);
      tz = repeated(t, b.w / 1.1, 1);
    }
    const mk = (map?: THREE.Texture) =>
      new THREE.MeshStandardMaterial(map ? { color: "#ffffff", map, roughness: 0.85, metalness: 0.05 } : { color: wall, roughness: 0.85, metalness: 0.05 });
    // box face order: +x, -x, +y, -y, +z, -z
    return [mk(tx), mk(tx), mk(), mk(), mk(tz), mk(tz)];
  }, [b.wall, b.d, b.w, b.floors, h, texture]);

  useLayoutEffect(() => {
    for (const m of mats) {
      m.emissive.set(hl.emissive);
      m.emissiveIntensity = hl.intensity;
    }
  }, [mats, hl.emissive, hl.intensity]);

  return (
    <mesh position={[b.x, h / 2, b.z]} material={mats} castShadow receiveShadow>
      <boxGeometry args={[b.w, h, b.d]} />
    </mesh>
  );
}

function Band({ b }: { b: BuildingSpec }) {
  if (!b.band) return null;
  return (
    <mesh position={[b.x, b.band.h / 2, b.z]} receiveShadow>
      <boxGeometry args={[b.w + 0.08, b.band.h, b.d + 0.08]} />
      <meshStandardMaterial color={b.band.color} roughness={0.8} />
    </mesh>
  );
}

// ---------------------------------------------------------------- flat roof hall
function Hall({ b, hl }: { b: BuildingSpec; hl: Hl }) {
  return (
    <group>
      <Walls b={b} hl={hl} h={b.h} texture="clad" />
      <Band b={b} />
      <mesh position={[b.x, b.h + 0.25, b.z]} castShadow receiveShadow>
        <boxGeometry args={[b.w + 0.6, 0.5, b.d + 0.6]} />
        <meshStandardMaterial color={b.roof ?? "#9097a2"} roughness={0.95} emissive={hl.emissive} emissiveIntensity={hl.intensity * 0.6} />
      </mesh>
      {b.roofStep && (
        <mesh position={[b.x, b.h + 0.5 + b.roofStep.h / 2, b.z - b.d / 2 + (b.roofStep.at + 0.5) * b.d / 2]} castShadow receiveShadow>
          <boxGeometry args={[b.w + 0.6, b.roofStep.h, (b.roofStep.at + 0.5) * b.d + 0.3]} />
          <meshStandardMaterial color={b.roof ?? "#9097a2"} roughness={0.95} emissive={hl.emissive} emissiveIntensity={hl.intensity * 0.6} />
        </mesh>
      )}
      {b.skylights && <Skylights b={b} cols={b.skylights[0]} rows={b.skylights[1]} />}
      {b.solar && <FlatSolar b={b} />}
    </group>
  );
}

function Skylights({ b, cols, rows }: { b: BuildingSpec; cols: number; rows: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const sx = (b.w / cols) * 0.42;
  const sz = (b.d / rows) * 0.26;
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    let i = 0;
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++) {
        m.makeTranslation(b.x - b.w / 2 + (b.w / cols) * (c + 0.5), b.h + 0.75 + (b.roofStep && (r + 0.5) / rows < b.roofStep.at + 0.5 ? b.roofStep.h : 0), b.z - b.d / 2 + (b.d / rows) * (r + 0.5));
        ref.current!.setMatrixAt(i++, m);
      }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [b, cols, rows]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, cols * rows]} castShadow>
      <boxGeometry args={[sx, 0.45, sz]} />
      <meshStandardMaterial color="#6a7584" roughness={0.4} metalness={0.2} />
    </instancedMesh>
  );
}

function FlatSolar({ b }: { b: BuildingSpec }) {
  const tex = useMemo(() => repeated(solarTexture(), b.w / 2.2, b.d / 1.15), [b.w, b.d]);
  return (
    <mesh position={[b.x, b.h + 0.55, b.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[b.w * 0.85, b.d * 0.8]} />
      <meshStandardMaterial map={tex} roughness={0.35} metalness={0.3} />
    </mesh>
  );
}

// ---------------------------------------------------------------- office block
function Office({ b, hl }: { b: BuildingSpec; hl: Hl }) {
  return (
    <group>
      <Walls b={b} hl={hl} h={b.h} texture="windows" />
      <mesh position={[b.x, b.h + 0.3, b.z]} castShadow receiveShadow>
        <boxGeometry args={[b.w + 0.4, 0.6, b.d + 0.4]} />
        <meshStandardMaterial color={b.roof ?? "#7d848f"} roughness={0.9} emissive={hl.emissive} emissiveIntensity={hl.intensity * 0.6} />
      </mesh>
      {/* roof parapet + small HVAC units */}
      <mesh position={[b.x + b.w * 0.2, b.h + 1.1, b.z]} castShadow>
        <boxGeometry args={[Math.min(4, b.w * 0.2), 1.2, Math.min(3, b.d * 0.2)]} />
        <meshStandardMaterial color="#d9dee6" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- gable roof
function Gable({ b, hl }: { b: BuildingSpec; hl: Hl }) {
  const ridgeZ = (b.ridge ?? "z") === "z";
  const W = ridgeZ ? b.w : b.d; // span across the ridge
  const L = ridgeZ ? b.d : b.w; // length along the ridge
  const rise = b.roofRise ?? Math.min(3, W * 0.15);
  const ov = 0.5;
  const half = W / 2 + ov;
  const angle = Math.atan2(rise, W / 2);
  const slope = half / Math.cos(angle);

  const gableGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-W / 2, 0);
    s.lineTo(W / 2, 0);
    s.lineTo(0, rise);
    s.lineTo(-W / 2, 0);
    return new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
  }, [W, L, rise]);

  // which local slope (+x = "a", -x = "b") carries solar panels
  const solarSides: ("a" | "b")[] = [];
  if (b.solar === "all") solarSides.push("a", "b");
  else if (b.solar) {
    const map: Record<Face, "a" | "b"> = ridgeZ ? { e: "a", w: "b", n: "a", s: "b" } : { n: "a", s: "b", e: "a", w: "b" };
    solarSides.push(map[b.solar]);
  }
  const solarTex = useMemo(() => repeated(solarTexture(), (slope * 0.85) / 1.15, (L * 0.86) / 2.2), [slope, L]);
  const roofColor = b.roof ?? "#e9edf2";

  return (
    <group>
      <Walls b={b} hl={hl} h={b.h} texture="clad" />
      <Band b={b} />
      <group position={[b.x, 0, b.z]} rotation={[0, ridgeZ ? 0 : Math.PI / 2, 0]}>
        <mesh geometry={gableGeo} position={[0, b.h, -L / 2]} castShadow receiveShadow>
          <meshStandardMaterial color={b.wall ?? "#d5dae2"} roughness={0.85} emissive={hl.emissive} emissiveIntensity={hl.intensity} />
        </mesh>
        {(["a", "b"] as const).map((side) => {
          const sgn = side === "a" ? 1 : -1;
          return (
            <group key={side} position={[(sgn * half) / 2, b.h + rise - (half * Math.tan(angle)) / 2 + 0.12, 0]} rotation={[0, 0, -sgn * angle]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[slope, 0.28, L + ov * 2]} />
                <meshStandardMaterial color={roofColor} roughness={0.75} emissive={hl.emissive} emissiveIntensity={hl.intensity * 0.6} />
              </mesh>
              {b.skylights &&
                !solarSides.includes(side) &&
                Array.from({ length: b.skylights[0] }, (_, i) => (
                  <mesh key={i} position={[0, 0.16, -L / 2 + (L / b.skylights![0]) * (i + 0.5)]}>
                    <boxGeometry args={[slope * 0.42, 0.06, 0.9]} />
                    <meshStandardMaterial color="#b9c3cf" roughness={0.3} metalness={0.2} />
                  </mesh>
                ))}
              {solarSides.includes(side) && (
                <mesh position={[0, 0.17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <planeGeometry args={[slope * 0.85, L * 0.86]} />
                  <meshStandardMaterial map={solarTex} roughness={0.35} metalness={0.3} />
                </mesh>
              )}
            </group>
          );
        })}
        {/* ridge cap */}
        <mesh position={[0, b.h + rise + 0.22, 0]} castShadow>
          <boxGeometry args={[0.6, 0.18, L + ov * 2]} />
          <meshStandardMaterial color={roofColor} roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- tent (arched hall)
function Tent({ b, hl }: { b: BuildingSpec; hl: Hl }) {
  const ridgeZ = (b.ridge ?? "z") === "z";
  const W = ridgeZ ? b.w : b.d;
  const L = ridgeZ ? b.d : b.w;
  const hw = 2.4;
  const R = W / 2;
  const sy = (b.h - hw) / R;
  const ribs = Math.max(2, Math.floor(L / 5));
  return (
    <group position={[b.x, 0, b.z]} rotation={[0, ridgeZ ? 0 : Math.PI / 2, 0]}>
      <mesh position={[0, hw / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, hw, L]} />
        <meshStandardMaterial color="#e9edf2" roughness={0.9} emissive={hl.emissive} emissiveIntensity={hl.intensity} />
      </mesh>
      <mesh position={[0, hw, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, sy]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, L, 32, 1, false, Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#f6f8fb" roughness={0.95} side={THREE.DoubleSide} emissive={hl.emissive} emissiveIntensity={hl.intensity} />
      </mesh>
      {Array.from({ length: ribs + 1 }, (_, i) => (
        <mesh key={i} position={[0, hw, -L / 2 + (L / ribs) * i]} scale={[1, sy, 1]}>
          <torusGeometry args={[R + 0.05, 0.09, 4, 32, Math.PI]} />
          <meshStandardMaterial color="#cfd6e0" />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- doors, docks, canopy, sign
function Doors({ b }: { b: BuildingSpec }) {
  if (!b.doors?.length) return null;
  return (
    <group>
      {b.doors.map((d, i) => {
        const p = doorPosition(b, d, 0.08);
        const g = doorPosition(b, d, 1.6);
        return (
          <group key={i}>
            <group position={[p.x, d.h / 2, p.z]} rotation={[0, p.rotY, 0]}>
              <mesh>
                <boxGeometry args={[d.w + (d.frame ? 1.4 : 0.4), d.h + 0.3, 0.12]} />
                <meshStandardMaterial color={d.frame ?? "#5c6774"} />
              </mesh>
              <mesh position={[0, -0.1, 0.05]}>
                <boxGeometry args={[d.w, d.h, 0.1]} />
                <meshStandardMaterial color={d.color ?? (d.dock ? "#b9c2cd" : "#cdd3db")} roughness={0.6} metalness={0.3} />
              </mesh>
              {d.dock && (
                <>
                  <mesh position={[-d.w / 2 - 0.35, -d.h / 2 + 0.9, 0.25]}>
                    <boxGeometry args={[0.3, 0.6, 0.4]} />
                    <meshStandardMaterial color="#1f2328" />
                  </mesh>
                  <mesh position={[d.w / 2 + 0.35, -d.h / 2 + 0.9, 0.25]}>
                    <boxGeometry args={[0.3, 0.6, 0.4]} />
                    <meshStandardMaterial color="#1f2328" />
                  </mesh>
                </>
              )}
            </group>
            {d.dock && (
              <mesh position={[g.x, 0.06, g.z]} rotation={[-Math.PI / 2, 0, -p.rotY]} receiveShadow>
                <planeGeometry args={[d.w + 0.6, 3]} />
                <meshStandardMaterial color="#f2c230" transparent opacity={0.55} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Canopy({ b, face }: { b: BuildingSpec; face: Face }) {
  const along = face === "n" || face === "s" ? b.w : b.d;
  const p = doorPosition(b, { face, at: 0, w: 0, h: 0 }, 2);
  const c = doorPosition(b, { face, at: 0, w: 0, h: 0 }, 2.6);
  return (
    <group>
      <group position={[p.x, 0.6, p.z]} rotation={[0, p.rotY, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[along * 0.92, 1.2, 4]} />
          <meshStandardMaterial color="#cdd2da" roughness={0.9} />
        </mesh>
      </group>
      <group position={[c.x, 5.6, c.z]} rotation={[0, c.rotY, 0]}>
        <mesh rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[along * 0.95, 0.25, 5.4]} />
          <meshStandardMaterial color={b.roof ?? "#2459b8"} roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function Sign({ b, face, text }: { b: BuildingSpec; face: Face; text: string }) {
  // depot code on a coloured panel (accent) – short codes get a square-ish badge
  const short = text.length <= 4;
  const tex = useMemo(
    () =>
      textTexture(text, {
        color: "#ffffff",
        bg: b.accent ?? "transparent",
        font: short ? "900 96px system-ui, -apple-system, Segoe UI, sans-serif" : "800 72px system-ui, -apple-system, Segoe UI, sans-serif",
        w: short ? 384 : 1024,
        h: 128,
      }),
    [text, b.accent, short],
  );
  const along = face === "n" || face === "s" ? b.w : b.d;
  const p = doorPosition(b, { face, at: short && b.doors?.some((d) => d.face === face) ? 0.42 : 0, w: 0, h: 0 }, 0.09);
  const sw = short ? Math.min(along * 0.3, 9) : Math.min(along * 0.9, 16);
  return (
    <mesh position={[p.x, b.h - (short ? 2.4 : 2.2), p.z]} rotation={[0, p.rotY, 0]}>
      <planeGeometry args={[sw, sw / (short ? 3 : 8)]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

export function Footprint({ x, z, w, d, pad = 2.5 }: { x: number; z: number; w: number; d: number; pad?: number }) {
  const hw = w / 2 + pad;
  const hd = d / 2 + pad;
  const pts: [number, number, number][] = [
    [x - hw, 0.2, z - hd],
    [x + hw, 0.2, z - hd],
    [x + hw, 0.2, z + hd],
    [x - hw, 0.2, z + hd],
    [x - hw, 0.2, z - hd],
  ];
  return (
    <group>
      <mesh position={[x, 0.12, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[hw * 2, hd * 2]} />
        <meshBasicMaterial color="#2f6fdc" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      <Line points={pts} color="#2f6fdc" lineWidth={2.5} dashed dashSize={2} gapSize={1.2} />
    </group>
  );
}

function Silo({ b }: { b: BuildingSpec }) {
  const R = Math.min(b.w, b.d) / 2;
  return (
    <group position={[b.x, 0, b.z]}>
      <mesh position={[0, b.h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, b.h, 28]} />
        <meshStandardMaterial color={b.wall ?? "#d3d7dd"} roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, b.h, 0]} scale={[1, 0.5, 1]} castShadow>
        <sphereGeometry args={[R, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e4e7eb" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}

function Ramp({ b, face }: { b: BuildingSpec; face: Face }) {
  const along = face === "n" || face === "s" ? b.w : b.d;
  const p = doorPosition(b, { face, at: 0, w: 0, h: 0 }, 1.6);
  return (
    <group position={[p.x, 0.6, p.z]} rotation={[0, p.rotY, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[along * 0.96, 1.2, 3.2]} />
        <meshStandardMaterial color="#b8bdc4" roughness={0.95} />
      </mesh>
      {/* edge darkening + small steps at one end */}
      <mesh position={[0, 0.61, 1.55]}>
        <boxGeometry args={[along * 0.96, 0.03, 0.12]} />
        <meshStandardMaterial color="#8d939b" />
      </mesh>
      <mesh position={[along * 0.48 + 0.6, -0.3, 0.6]} castShadow>
        <boxGeometry args={[1.2, 0.6, 1.6]} />
        <meshStandardMaterial color="#b8bdc4" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Windows({ b }: { b: BuildingSpec }) {
  const grid = useMemo(() => gridWindowTexture(), []);
  return (
    <group>
      {b.windows!.map((w, i) => {
        const p = doorPosition(b, { face: w.face, at: w.at, w: w.w, h: w.h }, 0.07);
        return (
          <mesh key={i} position={[p.x, w.y, p.z]} rotation={[0, p.rotY, 0]}>
            <planeGeometry args={[w.w, w.h]} />
            {w.grid ? (
              <meshStandardMaterial map={grid} roughness={0.3} metalness={0.2} />
            ) : (
              <meshStandardMaterial color="#dfe8f5" roughness={0.25} metalness={0.2} emissive="#9fb7d8" emissiveIntensity={0.15} />
            )}
          </mesh>
        );
      })}
    </group>
  );
}
