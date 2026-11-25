import type { Object3D } from "three";

/** live Object3D of every moving entity, so the camera / panels can follow them */
export const objectRegistry = new Map<string, Object3D>();

export interface MoverRuntime {
  waiting: boolean;
  label: string | null;
  speed: number; // m/s currently
  progress: number; // 0..1 along the trip
}

/** written by <Mover/> every frame, read by the simulation tick */
export const moverRuntime = new Map<string, MoverRuntime>();
