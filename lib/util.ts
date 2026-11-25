import type { BuildingSpec, DoorSpec, Face, ParkingSpec, Vec3 } from "./types";

/** small deterministic PRNG so the layout (cars, trees) is identical on every load */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** rotation.y so that a model whose "forward" is +x faces the given direction */
export const faceAngle: Record<Face, number> = {
  e: 0,
  n: Math.PI / 2,
  w: Math.PI,
  s: -Math.PI / 2,
};

export function headingFrom(dx: number, dz: number) {
  return Math.atan2(-dz, dx);
}

/** world position of the middle of a door on a building face */
export function doorPosition(b: BuildingSpec, door: DoorSpec, outset = 0): { x: number; z: number; rotY: number } {
  switch (door.face) {
    case "s":
      return { x: b.x + door.at * b.w, z: b.z + b.d / 2 + outset, rotY: 0 };
    case "n":
      return { x: b.x + door.at * b.w, z: b.z - b.d / 2 - outset, rotY: Math.PI };
    case "e":
      return { x: b.x + b.w / 2 + outset, z: b.z + door.at * b.d, rotY: Math.PI / 2 };
    case "w":
      return { x: b.x - b.w / 2 - outset, z: b.z + door.at * b.d, rotY: -Math.PI / 2 };
  }
}

/** local (building-relative) point → world, taking b.rot into account */
export function toWorld(b: BuildingSpec, lx: number, lz: number): { x: number; z: number } {
  const t = b.rot ?? 0;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return { x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c };
}

export function roofTop(b: BuildingSpec): number {
  if (b.kind === "gable") return b.h + (b.roofRise ?? 2);
  if (b.kind === "tent") return b.h;
  if (b.kind === "silo") return b.h + b.w * 0.25;
  return b.h + 0.6;
}

export function buildingPinPosition(b: BuildingSpec): Vec3 {
  return [b.x, roofTop(b) + 4, b.z];
}

export const SLOT_W = 2.7;
export const SLOT_L = 5.2;

export function parkingSlots(p: ParkingSpec): number {
  const along = p.axis === "x" ? p.w : p.d;
  return Math.max(1, Math.floor(along / SLOT_W)) * p.rows;
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
