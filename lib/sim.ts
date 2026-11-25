// Simulated "live" data for the demo: stock levels, attendance (pontaj),
// vehicles and an activity feed. Everything is fictional.
import { DEPOTS, EMPLOYEES, PRODUCTS, SHIFT_HOURS, fullName, type Employee } from "./catalog";
import { moverRuntime } from "./registry";
import { SITE_LIST } from "./sites";
import { clamp, mulberry32, parkingSlots } from "./util";

export type PresenceStatus = "Prezent" | "Pauză" | "Absent" | "Concediu";

export interface Presence {
  status: PresenceStatus;
  clockIn: string | null; // "06:04"
  location: string; // depot code where the person is right now
  lastScan: { code: string; time: string } | null;
  tasks: number;
}

export type FeedKind = "clockIn" | "breakOut" | "breakBack" | "scan" | "move";

/** structured so the UI can render it in any language */
export interface FeedItem {
  id: number;
  time: string;
  kind: FeedKind;
  tone: "in" | "out" | "scan" | "info";
  name: string;
  depot?: string;
  code?: string;
  delta?: number;
  unit?: string;
}

export interface ForkliftLive {
  battery: number;
  status: string;
  speedKmh: number;
  load: string | null;
}

export interface VehicleLive {
  plate: string;
  status: string;
  speedKmh: number;
}

export interface DockLive {
  status: "Liberă" | "Încărcare" | "Descărcare" | "Rezervată";
  vehicle: string | null;
  progress: number;
}

export interface LiveData {
  presence: Record<string, Presence>;
  stock: Record<string, number>; // product code → qty
  occupancy: Record<string, number>; // depot code → 0..1
  forklifts: Record<string, ForkliftLive>;
  vehicles: Record<string, VehicleLive>;
  docks: Record<string, DockLive>;
  parkings: Record<string, { occupied: number; total: number }>;
  feed: FeedItem[];
  tick: number;
}

const pad = (n: number) => String(n).padStart(2, "0");
const now = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const shiftStart = (e: Employee) => Number(SHIFT_HOURS[e.shift].slice(0, 2));

let feedId = 0;
const OPERATOR_ROLES = ["Operator stivuitor", "Picker", "Expediție", "Recepție marfă"];

export function initLive(): LiveData {
  const rnd = mulberry32(777);
  const presence: Record<string, Presence> = {};
  for (const e of EMPLOYEES) {
    const x = rnd();
    // demo: most people are "on site" whatever time you open the page
    const status: PresenceStatus = x < 0.74 ? "Prezent" : x < 0.84 ? "Pauză" : x < 0.95 ? "Absent" : "Concediu";
    const here = status === "Prezent" || status === "Pauză";
    const h = shiftStart(e);
    const m = Math.floor(rnd() * 20) - 8;
    const clock = here ? `${pad(m < 0 ? h - 1 : h)}:${pad((m + 60) % 60)}` : null;
    presence[e.id] = { status, clockIn: clock, location: e.depot, lastScan: null, tasks: here ? Math.floor(rnd() * 25) : 0 };
  }
  const stock: Record<string, number> = {};
  for (const p of PRODUCTS) stock[p.code] = p.qty;
  const occupancy: Record<string, number> = {};
  for (const d of DEPOTS) occupancy[d.code] = d.capacity ? 0.45 + rnd() * 0.45 : 0;

  const forklifts: Record<string, ForkliftLive> = {};
  const vehicles: Record<string, VehicleLive> = {};
  for (const site of SITE_LIST)
    for (const m of site.movers) {
      if (m.type === "forklift") forklifts[m.id] = { battery: Math.round(50 + rnd() * 45), status: "În mișcare", speedKmh: 0, load: null };
      else vehicles[m.id] = { plate: m.name, status: "Sosește", speedKmh: 0 };
    }
  const parkings: LiveData["parkings"] = {};
  for (const site of SITE_LIST)
    for (const p of site.parkings) {
      const total = parkingSlots(p);
      parkings[p.id] = { total, occupied: Math.round(total * p.occupancy) };
    }
  const feed: FeedItem[] = EMPLOYEES.filter((e) => presence[e.id].clockIn)
    .sort((a, b) => (presence[b.id].clockIn! < presence[a.id].clockIn! ? -1 : 1))
    .slice(0, 6)
    .map((e) => ({ id: ++feedId, time: presence[e.id].clockIn!, kind: "clockIn" as const, tone: "in" as const, name: fullName(e), depot: e.depot }));
  return { presence, stock, occupancy, forklifts, vehicles, docks: {}, parkings, feed, tick: 0 };
}

export function tickLive(prev: LiveData): LiveData {
  const live: LiveData = {
    ...prev,
    tick: prev.tick + 1,
    presence: { ...prev.presence },
    stock: { ...prev.stock },
    occupancy: { ...prev.occupancy },
    forklifts: { ...prev.forklifts },
    vehicles: { ...prev.vehicles },
    docks: { ...prev.docks },
  };
  const feed: FeedItem[] = [];
  const TONE: Record<FeedKind, FeedItem["tone"]> = { clockIn: "in", breakBack: "in", breakOut: "out", scan: "scan", move: "info" };
  const push = (kind: FeedKind, x: Omit<FeedItem, "id" | "time" | "kind" | "tone">) => feed.push({ id: ++feedId, time: now(), kind, tone: TONE[kind], ...x });

  // attendance events (one or two per tick at most)
  if (Math.random() < 0.55) {
    const e = EMPLOYEES[Math.floor(Math.random() * EMPLOYEES.length)];
    const p = { ...live.presence[e.id] };
    if (p.status === "Prezent" && Math.random() < 0.3) {
      p.status = "Pauză";
      push("breakOut", { name: fullName(e), depot: p.location });
    } else if (p.status === "Pauză") {
      p.status = "Prezent";
      push("breakBack", { name: fullName(e), depot: p.location });
    } else if (p.status === "Absent" && Math.random() < 0.25) {
      p.status = "Prezent";
      p.clockIn = now();
      p.location = e.depot;
      push("clockIn", { name: fullName(e), depot: e.depot });
    } else if (p.status === "Prezent" && OPERATOR_ROLES.includes(e.role)) {
      // product scan in the depot where the person is
      const items = PRODUCTS.filter((x) => x.depot === p.location);
      if (items.length) {
        const item = items[Math.floor(Math.random() * items.length)];
        const delta = Math.random() < 0.7 ? -Math.ceil(Math.random() * 6) : Math.ceil(Math.random() * 20);
        live.stock[item.code] = Math.max(0, live.stock[item.code] + delta);
        p.lastScan = { code: item.code, time: now() };
        p.tasks += 1;
        push("scan", { name: `${e.first} ${e.last[0]}.`, code: item.code, delta, unit: item.unit });
      }
    } else if (p.status === "Prezent" && e.role === "Operator stivuitor" && Math.random() < 0.4) {
      // forklift drivers sometimes help in another depot
      const others = DEPOTS.filter((d) => d.hasStock && d.code !== p.location);
      const to = Math.random() < 0.5 ? e.depot : others[Math.floor(Math.random() * others.length)].code;
      if (to !== p.location) {
        p.location = to;
        push("move", { name: fullName(e), depot: to });
      }
    }
    live.presence[e.id] = p;
  }

  for (const d of DEPOTS) if (d.capacity) live.occupancy[d.code] = clamp(live.occupancy[d.code] + (Math.random() - 0.5) * 0.006, 0.2, 0.97);

  for (const [id, f] of Object.entries(prev.forklifts)) {
    const rt = moverRuntime.get(id);
    const n = { ...f };
    n.battery = rt?.waiting ? n.battery : Math.max(12, n.battery - 0.15);
    if (n.battery <= 12) n.battery = 96;
    n.status = rt?.waiting ? rt.label ?? "Manipulare" : "În mișcare";
    if (rt?.waiting && f.status === "În mișcare") n.load = n.load ? null : "palet";
    n.speedKmh = rt && !rt.waiting ? Math.round(rt.speed * 36) / 10 : 0;
    live.forklifts[id] = n;
  }
  for (const [id, v] of Object.entries(prev.vehicles)) {
    const rt = moverRuntime.get(id);
    const p = rt?.progress ?? 0;
    live.vehicles[id] = {
      ...v,
      status: rt?.waiting ? rt.label ?? "La rampă" : p < 0.1 ? "Sosește" : p > 0.88 ? "Pleacă" : "În parc",
      speedKmh: rt && !rt.waiting ? Math.round(rt.speed * 3.6) : 0,
    };
  }

  if (feed.length) live.feed = [...feed, ...prev.feed].slice(0, 30);
  return live;
}

export const presentIn = (live: LiveData, code: string) =>
  EMPLOYEES.filter((e) => {
    const p = live.presence[e.id];
    return (p.status === "Prezent" || p.status === "Pauză") && p.location === code;
  });
