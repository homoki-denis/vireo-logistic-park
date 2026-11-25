// Coordinate system (meters):
//   x → east (right when standing in front of the gate, looking at the yard)
//   z → south (toward the street). The street runs along z ≈ +9.
//   y → up
// "Faces" of a building: n = -z side, s = +z side (street side), e = +x, w = -x.

export type SiteId = "park";
export type Face = "n" | "s" | "e" | "w";
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface Rect {
  x: number; // center
  z: number; // center
  w: number; // size along x
  d: number; // size along z
}

export interface DoorSpec {
  face: Face;
  /** position along the face, -0.5 … 0.5 */
  at: number;
  w: number;
  h: number;
  /** loading dock (gets bumpers + leveler, appears in the "Rampe" list) */
  dock?: boolean;
  name?: string;
  color?: string;
  /** coloured side frame around the opening */
  frame?: string;
}

export interface WindowSpec {
  face: Face;
  at: number; // -0.5 … 0.5 along the face
  w: number;
  h: number;
  y: number; // centre height
  /** big framed window with a grid of panes */
  grid?: boolean;
}

export interface StockItem {
  name: string;
  qty: number;
  min: number;
}

export interface BuildingSpec extends Rect {
  id: string;
  name?: string;
  kind: "hall" | "gable" | "tent" | "office" | "silo";
  /** depot code shown on the building (POC, LIR …) */
  code?: string;
  /** accent colour (stripe + sign) */
  accent?: string;
  /** true = part of the park (clickable); false = neighbour / decoration */
  own: boolean;
  h: number; // wall (eave) height
  /** rotation around the vertical axis, radians (negative = clockwise seen from above) */
  rot?: number;
  wall?: string;
  roof?: string;
  /** lower coloured wall band (e.g. blue plinth) */
  band?: { color: string; h: number };
  /** gable roofs: direction of the ridge */
  ridge?: "x" | "z";
  roofRise?: number;
  /** flat roofs: grid of roof lights [cols along x, rows along z] */
  skylights?: [number, number];
  /** solar panels: on which roof slope (gable) or "all" (flat / both slopes) */
  solar?: Face | "all";
  floors?: number; // office: window rows
  sign?: { text: string; face: Face };
  doors?: DoorSpec[];
  /** raised loading platform + canopy along a face */
  canopy?: Face;
  /** raised concrete loading platform (no roof) along a face */
  ramp?: Face;
  windows?: WindowSpec[];
  /** flat roof made of two levels: the part north of `at` (-0.5…0.5 along z) is raised by h */
  roofStep?: { at: number; h: number };
  info?: {
    type: string;
    desc?: string;
    capacity?: number; // pallet places
    stock?: StockItem[];
  };
}

export interface GroundSpec extends Rect {
  kind: "asphalt" | "concrete" | "grass" | "sand" | "scrap" | "road";
}

export interface ParkingSpec extends Rect {
  id: string;
  name: string;
  own: boolean;
  /** direction the rows of slots run along */
  axis: "x" | "z";
  rows: number;
  occupancy: number; // 0..1 (initial)
  seed: number;
}

export interface Waypoint {
  p: Vec2;
  /** seconds to wait when reaching this point */
  wait?: number;
  /** label of what happens at this point (shown in status) */
  label?: string;
}

export type VehicleType = "forklift" | "truck" | "van" | "flatbed";

export interface MoverSpec {
  id: string;
  type: VehicleType;
  name: string;
  color?: string;
  path: Waypoint[];
  speed: number; // m/s
  /** closed loop (true) or one-way trip that restarts from the first point */
  loop: boolean;
  /** starting distance along the path (m), to de-synchronise vehicles */
  offset?: number;
}

export interface StaticVehicle {
  type: "truck" | "trailer" | "van" | "flatbed" | "chassis" | "excavator" | "loader" | "tractor";
  x: number;
  z: number;
  dir: Face;
  color?: string;
}

export interface PalletSpec {
  x: number;
  z: number;
  /** grid of stacks */
  cols: number;
  rows: number;
  kind: "boxes" | "wood" | "crates" | "blue" | "blocks" | "scrap";
  seed: number;
}

export interface GateSpec {
  /** post position */
  x: number;
  z: number;
  /** boom length (m) and direction it points to when closed: -1 = toward -x, +1 = toward +x */
  length: number;
  dir: 1 | -1;
}

export interface SiteSpec {
  id: SiteId;
  name: string;
  short: string;
  address: string;
  bounds: Rect; // camera / fog extent
  view: { target: Vec3; position: Vec3 };
  ground: GroundSpec[];
  buildings: BuildingSpec[];
  parkings: ParkingSpec[];
  movers: MoverSpec[];
  vehicles: StaticVehicle[];
  pallets: PalletSpec[];
  treeZones: { rect: Rect; count: number; seed: number }[];
  treeRows: { from: Vec2; to: Vec2; step: number }[];
  fences: { from: Vec2; to: Vec2; kind?: "wall" | "mesh" | "blue"; h?: number }[];
  solarFields: Rect[];
  scrapHeaps?: { rect: Rect; count: number; seed: number };
  streetLabel?: { text: string; x: number; z: number };
  /** automatic barriers (boom gates) that lift when a vehicle comes close */
  gates?: GateSpec[];
}

export type EntityType = "building" | "dock" | "parking" | "forklift" | "truck" | "van";

export interface Entity {
  id: string;
  siteId: SiteId;
  type: EntityType;
  name: string;
  subtitle: string;
  /** static position (moving entities read their live position from the registry) */
  position: Vec3;
  /** footprint for the selection outline */
  rect?: Rect;
  moving?: boolean;
  buildingId?: string;
}
