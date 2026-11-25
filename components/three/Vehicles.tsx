"use client";
// Low-poly vehicle models. Forward = +x, origin on the ground at the model centre.
import type { ReactNode } from "react";

const GLASS = "#3a4656";
const TYRE = "#22262b";
const CHASSIS = "#3b4148";

function Wheel({ x, z, r = 0.5, w = 0.35 }: { x: number; z: number; r?: number; w?: number }) {
  return (
    <mesh position={[x, r, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[r, r, w, 12]} />
      <meshStandardMaterial color={TYRE} roughness={0.9} />
    </mesh>
  );
}

function Box({ p, s, c, rough = 0.7, metal = 0.05, children }: { p: [number, number, number]; s: [number, number, number]; c: string; rough?: number; metal?: number; children?: ReactNode }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={rough} metalness={metal} />
      {children}
    </mesh>
  );
}

function Cab({ x, color }: { x: number; color: string }) {
  return (
    <group position={[x, 0, 0]}>
      <Box p={[0, 2.05, 0]} s={[2.3, 2.7, 2.5]} c={color} rough={0.45} metal={0.15} />
      <Box p={[1.16, 2.55, 0]} s={[0.04, 1.1, 2.2]} c={GLASS} rough={0.2} />
      <Box p={[0.3, 2.55, 1.26]} s={[1.2, 0.9, 0.03]} c={GLASS} rough={0.2} />
      <Box p={[0.3, 2.55, -1.26]} s={[1.2, 0.9, 0.03]} c={GLASS} rough={0.2} />
      <Box p={[0, 3.55, 0]} s={[1.8, 0.35, 2.3]} c={color} />
      <Box p={[1.18, 1.0, 0]} s={[0.1, 0.5, 2.4]} c="#2b3036" />
    </group>
  );
}

export function Truck({ color = "#ffffff", stripe = "#2f6fdc" }: { color?: string; stripe?: string }) {
  return (
    <group>
      <Cab x={6.9} color={color} />
      <Trailer stripe={stripe} />
      <Wheel x={7.2} z={1.05} />
      <Wheel x={7.2} z={-1.05} />
      <Wheel x={5.2} z={1.05} />
      <Wheel x={5.2} z={-1.05} />
    </group>
  );
}

export function Trailer({ stripe = "#2f6fdc", legs = false }: { stripe?: string; legs?: boolean }) {
  return (
    <group>
      <Box p={[-1.3, 0.95, 0]} s={[13.4, 0.3, 2.2]} c={CHASSIS} />
      <Box p={[-1.3, 2.65, 0]} s={[13.6, 3.1, 2.55]} c="#f7f8fa" rough={0.6} />
      <Box p={[-1.3, 1.6, 1.285]} s={[13.6, 0.35, 0.02]} c={stripe} />
      <Box p={[-1.3, 1.6, -1.285]} s={[13.6, 0.35, 0.02]} c={stripe} />
      {[-6.2, -5.0, -3.8].map((x) => (
        <group key={x}>
          <Wheel x={x} z={1.05} />
          <Wheel x={x} z={-1.05} />
        </group>
      ))}
      {legs && (
        <>
          <Box p={[3.5, 0.5, 0.9]} s={[0.15, 1, 0.15]} c={CHASSIS} />
          <Box p={[3.5, 0.5, -0.9]} s={[0.15, 1, 0.15]} c={CHASSIS} />
        </>
      )}
    </group>
  );
}

export function Flatbed({ color = "#f2f4f7", empty = false }: { color?: string; empty?: boolean }) {
  return (
    <group>
      <Cab x={6.9} color={color} />
      {!empty && <Box p={[-1.3, 1.25, 0]} s={[13.6, 0.35, 2.5]} c="#7b6a58" />}
      {empty && (
        <>
          <Box p={[-1.3, 1.15, 0.85]} s={[13.4, 0.25, 0.2]} c="#8a5a3c" />
          <Box p={[-1.3, 1.15, -0.85]} s={[13.4, 0.25, 0.2]} c="#8a5a3c" />
          {[-7, -4.5, -2, 0.5, 3].map((x) => (
            <Box key={x} p={[x, 1.15, 0]} s={[0.2, 0.2, 1.9]} c="#8a5a3c" />
          ))}
        </>
      )}
      <Box p={[-1.3, 0.85, 0]} s={[13.2, 0.3, 1.2]} c={CHASSIS} />
      {[-6.2, -5.0, -3.8, 5.2, 7.2].map((x) => (
        <group key={x}>
          <Wheel x={x} z={1.05} />
          <Wheel x={x} z={-1.05} />
        </group>
      ))}
      {!empty && [-5, -2.5].map((x) => (
        <group key={x} position={[x, 1.45, 0]}>
          <Box p={[0, 0.08, 0]} s={[1.2, 0.15, 1]} c="#c49a62" />
          <Box p={[0, 0.65, 0]} s={[1.1, 1, 0.95]} c="#d7aa6c" />
        </group>
      ))}
    </group>
  );
}

export function Van({ color = "#f7f8fa" }: { color?: string }) {
  return (
    <group>
      <Box p={[-0.55, 1.45, 0]} s={[4.3, 2.2, 2.0]} c={color} rough={0.4} metal={0.1} />
      <Box p={[2.0, 1.05, 0]} s={[0.9, 1.3, 1.95]} c={color} rough={0.4} metal={0.1} />
      <mesh position={[1.55, 2.05, 0]} rotation={[0, 0, -0.55]} castShadow>
        <boxGeometry args={[0.05, 1.1, 1.85]} />
        <meshStandardMaterial color={GLASS} roughness={0.2} />
      </mesh>
      <Box p={[1.0, 1.95, 1.0]} s={[0.9, 0.7, 0.03]} c={GLASS} rough={0.2} />
      <Box p={[1.0, 1.95, -1.0]} s={[0.9, 0.7, 0.03]} c={GLASS} rough={0.2} />
      <Box p={[-1, 1.2, 1.005]} s={[2.6, 0.25, 0.01]} c="#2f6fdc" />
      <Box p={[-1, 1.2, -1.005]} s={[2.6, 0.25, 0.01]} c="#2f6fdc" />
      <Wheel x={1.6} z={0.9} r={0.38} w={0.25} />
      <Wheel x={1.6} z={-0.9} r={0.38} w={0.25} />
      <Wheel x={-1.9} z={0.9} r={0.38} w={0.25} />
      <Wheel x={-1.9} z={-0.9} r={0.38} w={0.25} />
    </group>
  );
}

export function Forklift({ loaded = false, color = "#f5b301" }: { loaded?: boolean; color?: string }) {
  return (
    <group>
      {/* body + counterweight */}
      <Box p={[-0.1, 0.75, 0]} s={[1.7, 0.9, 1.1]} c={color} rough={0.5} />
      <Box p={[-0.95, 0.85, 0]} s={[0.45, 1.0, 1.1]} c="#3a3f46" />
      {/* seat + overhead guard */}
      <Box p={[-0.3, 1.45, 0]} s={[0.5, 0.5, 0.5]} c="#2b3036" />
      {[[-0.75, 0.48], [-0.75, -0.48], [0.45, 0.48], [0.45, -0.48]].map(([x, z]) => (
        <Box key={`${x}${z}`} p={[x, 1.8, z]} s={[0.07, 1.3, 0.07]} c="#2b3036" />
      ))}
      <Box p={[-0.15, 2.47, 0]} s={[1.35, 0.06, 1.05]} c="#2b3036" />
      {/* mast */}
      <Box p={[0.85, 1.4, 0.32]} s={[0.1, 2.6, 0.1]} c="#4a5059" metal={0.4} />
      <Box p={[0.85, 1.4, -0.32]} s={[0.1, 2.6, 0.1]} c="#4a5059" metal={0.4} />
      <Box p={[0.85, 2.65, 0]} s={[0.1, 0.1, 0.75]} c="#4a5059" />
      {/* forks */}
      <Box p={[1.45, loaded ? 0.45 : 0.15, 0.22]} s={[1.15, 0.05, 0.12]} c="#2b3036" metal={0.5} />
      <Box p={[1.45, loaded ? 0.45 : 0.15, -0.22]} s={[1.15, 0.05, 0.12]} c="#2b3036" metal={0.5} />
      {loaded && (
        <group position={[1.5, 0.5, 0]}>
          <Box p={[0, 0.08, 0]} s={[1.2, 0.14, 1.0]} c="#c49a62" />
          <Box p={[0, 0.6, 0]} s={[1.1, 0.9, 0.95]} c="#d7aa6c" />
        </group>
      )}
      <Wheel x={0.55} z={0.5} r={0.3} w={0.22} />
      <Wheel x={0.55} z={-0.5} r={0.3} w={0.22} />
      <Wheel x={-0.7} z={0.5} r={0.25} w={0.2} />
      <Wheel x={-0.7} z={-0.5} r={0.25} w={0.2} />
    </group>
  );
}

// ------------------------------------------------------------------ construction machinery (yard by the gate)
const YELLOW = "#f2b40c";

export function Excavator() {
  return (
    <group>
      {/* tracks */}
      <Box p={[0, 0.4, 0.75]} s={[2.4, 0.8, 0.45]} c={TYRE} rough={0.9} />
      <Box p={[0, 0.4, -0.75]} s={[2.4, 0.8, 0.45]} c={TYRE} rough={0.9} />
      {/* upper body + cab */}
      <Box p={[-0.2, 1.2, 0]} s={[2.0, 0.8, 1.7]} c={YELLOW} rough={0.5} />
      <Box p={[0.35, 2.0, 0.4]} s={[0.9, 1.0, 0.8]} c={YELLOW} rough={0.5} />
      <Box p={[0.81, 2.05, 0.4]} s={[0.03, 0.7, 0.65]} c={GLASS} rough={0.2} />
      {/* boom + stick + bucket */}
      <mesh position={[1.4, 2.2, -0.3]} rotation={[0, 0, -0.75]} castShadow>
        <boxGeometry args={[2.2, 0.3, 0.3]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <mesh position={[2.35, 1.55, -0.3]} rotation={[0, 0, 0.5]} castShadow>
        <boxGeometry args={[0.25, 1.6, 0.25]} />
        <meshStandardMaterial color={YELLOW} />
      </mesh>
      <Box p={[2.65, 0.45, -0.3]} s={[0.6, 0.5, 0.7]} c="#3b4148" metal={0.4} />
    </group>
  );
}

export function Loader() {
  return (
    <group>
      <Box p={[-0.3, 0.95, 0]} s={[2.6, 0.9, 1.5]} c={YELLOW} rough={0.5} />
      <Box p={[-0.4, 1.95, 0]} s={[1.1, 1.1, 1.2]} c={YELLOW} rough={0.5} />
      <Box p={[0.16, 2.0, 0]} s={[0.03, 0.8, 1.0]} c={GLASS} rough={0.2} />
      <Box p={[1.45, 0.75, 0]} s={[0.25, 0.25, 1.4]} c="#3b4148" />
      <Box p={[1.8, 0.45, 0]} s={[0.55, 0.7, 2.0]} c="#3b4148" metal={0.4} />
      <Wheel x={0.6} z={0.85} r={0.55} w={0.4} />
      <Wheel x={0.6} z={-0.85} r={0.55} w={0.4} />
      <Wheel x={-1.2} z={0.85} r={0.55} w={0.4} />
      <Wheel x={-1.2} z={-0.85} r={0.55} w={0.4} />
    </group>
  );
}

export function Tractor() {
  return (
    <group>
      <Box p={[0.5, 1.0, 0]} s={[1.8, 0.8, 0.9]} c="#c62f2a" rough={0.45} />
      <Box p={[-0.7, 1.75, 0]} s={[1.0, 1.3, 1.1]} c="#c62f2a" rough={0.45} />
      <Box p={[-0.18, 1.95, 0]} s={[0.03, 0.8, 0.9]} c={GLASS} rough={0.2} />
      <Wheel x={-0.8} z={0.8} r={0.8} w={0.45} />
      <Wheel x={-0.8} z={-0.8} r={0.8} w={0.45} />
      <Wheel x={1.1} z={0.65} r={0.45} w={0.3} />
      <Wheel x={1.1} z={-0.65} r={0.45} w={0.3} />
    </group>
  );
}
