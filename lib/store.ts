"use client";
import { create } from "zustand";
import { DEPOT_BY_CODE, EMPLOYEE_BY_ID, PRODUCT_BY_CODE } from "./catalog";
import { ENTITY_BY_ID } from "./entities";
import { initLive, tickLive, type LiveData } from "./sim";
import { PARK } from "./sites";
import type { SiteId, Vec3 } from "./types";

export type Lang = "ro" | "en";
const savedLang = (): Lang => {
  try {
    return localStorage.getItem("vireo-lang") === "en" ? "en" : "ro";
  } catch {
    return "ro";
  }
};

export type SideTab = "depots" | "products" | "people" | "activity";

export interface FlyRequest {
  target: Vec3;
  position?: Vec3;
  distance?: number;
  nonce: number;
}

/**
 * selectedId is one of:
 *  - a 3D entity id (building, forklift, truck, parking, dock)
 *  - "p:POC235"   → a product
 *  - "e:ANG-0142" → an employee
 */
interface State {
  lang: Lang;
  setLang: (l: Lang) => void;
  siteId: SiteId;
  selectedId: string | null;
  hoveredId: string | null;
  showNeighbours: boolean;
  showLabels: boolean;
  follow: boolean;
  tab: SideTab;
  /** mobile: bottom sheet with the tabs is expanded */
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  depotFilter: string | null;
  peopleFilter: "present" | "all";
  fly: FlyRequest | null;
  live: LiveData;
  select: (id: string | null, opts?: { fly?: boolean }) => void;
  hover: (id: string | null) => void;
  toggleNeighbours: () => void;
  toggleLabels: () => void;
  setFollow: (v: boolean) => void;
  setTab: (t: SideTab) => void;
  setDepotFilter: (c: string | null) => void;
  setPeopleFilter: (f: "present" | "all") => void;
  flyTo: (target: Vec3, distance?: number, position?: Vec3) => void;
  resetView: () => void;
  tick: () => void;
}

let nonce = 0;

/** building that should get the camera for a selection id */
export function buildingFor(id: string, live: LiveData): string | null {
  if (id.startsWith("p:")) {
    const p = PRODUCT_BY_CODE.get(id.slice(2));
    return p ? DEPOT_BY_CODE.get(p.depot)!.buildingId : null;
  }
  if (id.startsWith("e:")) {
    const e = EMPLOYEE_BY_ID.get(id.slice(2));
    if (!e) return null;
    const loc = live.presence[e.id]?.location ?? e.depot;
    return DEPOT_BY_CODE.get(loc)!.buildingId;
  }
  return id;
}

export const useStore = create<State>((set, get) => ({
  lang: savedLang(),
  setLang: (l) => {
    try {
      localStorage.setItem("vireo-lang", l);
    } catch {
      /* storage may be unavailable */
    }
    document.documentElement.lang = l;
    set({ lang: l });
  },
  siteId: "park",
  selectedId: null,
  hoveredId: null,
  showNeighbours: true,
  showLabels: true,
  follow: true,
  tab: "depots",
  sheetOpen: false,
  setSheetOpen: (v) => set({ sheetOpen: v }),
  depotFilter: null,
  peopleFilter: "present",
  fly: null,
  live: initLive(),
  select: (id, opts) => {
    if (!id) return set({ selectedId: null });
    const target = buildingFor(id, get().live);
    const e = target ? ENTITY_BY_ID.get(target) : undefined;
    // on phones the list sheet closes so the detail sheet is visible
    const patch: Partial<State> = { selectedId: id, sheetOpen: false };
    if (id.startsWith("p:")) patch.tab = "products";
    if (id.startsWith("e:")) patch.tab = "people";
    if (e && opts?.fly !== false) {
      const size = e.rect ? Math.max(e.rect.w, e.rect.d) : 0;
      const distance = e.type === "building" ? Math.max(70, size * 1.7) : e.type === "parking" ? Math.max(60, size * 1.3) : e.type === "forklift" ? 50 : 70;
      patch.fly = { target: [e.position[0], 0, e.position[2]], distance, nonce: ++nonce };
    }
    set(patch);
  },
  hover: (id) => {
    if (get().hoveredId !== id) set({ hoveredId: id });
  },
  toggleNeighbours: () => set((s) => ({ showNeighbours: !s.showNeighbours })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  setFollow: (v) => set({ follow: v }),
  setTab: (t) => set({ tab: t }),
  setDepotFilter: (c) => set({ depotFilter: c }),
  setPeopleFilter: (f) => set({ peopleFilter: f }),
  flyTo: (target, distance, position) => set({ fly: { target, distance, position, nonce: ++nonce } }),
  resetView: () => set({ selectedId: null, fly: { target: PARK.view.target, position: PARK.view.position, nonce: ++nonce } }),
  tick: () => set((s) => ({ live: tickLive(s.live) })),
}));
