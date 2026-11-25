// ─────────────────────────────────────────────────────────────────────────────
// ALL DATA IN THIS FILE IS FICTIONAL. Company, depots, products, people and
// IDs are invented for a demo and do not describe any real place or person.
// ─────────────────────────────────────────────────────────────────────────────
import { mulberry32 } from "./util";

export interface Depot {
  code: string; // e.g. "POC" – prefix of every product code stored here
  name: string;
  category: string;
  accent: string; // UI + 3D accent colour
  buildingId: string; // id of the 3D building
  aisles: string[];
  capacity: number; // pallet places
  hasStock: boolean;
}

export interface Product {
  code: string; // e.g. "POC235"
  name: string;
  depot: string; // depot code
  unit: string;
  qty: number;
  min: number;
  location: string; // "Culoar B · Raft 04 · Nivel 2"
  category: string;
}

export interface Employee {
  id: string; // badge, e.g. "ANG-0142"
  first: string;
  last: string;
  role: string;
  depot: string; // home depot code
  shift: "Tura I" | "Tura II" | "Normal";
  since: number; // year
  ext: string; // internal phone extension
  skills: string[];
  avatar: string; // colour
}

export const COMPANY = {
  name: "Vireo Logistic Park",
  tagline: "Demo · date fictive",
  city: "Orașul Demo",
};

export const DEPOTS: Depot[] = [
  { code: "POC", name: "Depozit POC", category: "Protecție & echipamente de lucru", accent: "#f08a24", buildingId: "dep-poc", aisles: ["A", "B", "C", "D"], capacity: 1800, hasStock: true },
  { code: "LIR", name: "Depozit LIR", category: "Scule & unelte", accent: "#14a39a", buildingId: "dep-lir", aisles: ["A", "B", "C"], capacity: 1400, hasStock: true },
  { code: "VEN", name: "Depozit VEN", category: "Feronerie & fixare", accent: "#7c5cd6", buildingId: "dep-ven", aisles: ["A", "B", "C", "D", "E"], capacity: 2200, hasStock: true },
  { code: "TEM", name: "Depozit TEM", category: "Materiale electrice", accent: "#2f7be0", buildingId: "dep-tem", aisles: ["A", "B", "C"], capacity: 1200, hasStock: true },
  { code: "ARC", name: "Depozit ARC", category: "Ambalaje & consumabile", accent: "#d4a017", buildingId: "dep-arc", aisles: ["A", "B"], capacity: 900, hasStock: true },
  { code: "SEZ", name: "Corturi SEZ", category: "Produse sezoniere & grădină", accent: "#3fae5a", buildingId: "dep-sez", aisles: ["A", "B"], capacity: 700, hasStock: true },
  { code: "ADM", name: "Clădirea ADM", category: "Birouri & dispecerat", accent: "#e0567a", buildingId: "adm", aisles: [], capacity: 0, hasStock: false },
  { code: "MNT", name: "Atelier MNT", category: "Mentenanță & încărcare baterii", accent: "#8a94a6", buildingId: "mnt", aisles: [], capacity: 0, hasStock: false },
];
export const DEPOT_BY_CODE = new Map(DEPOTS.map((d) => [d.code, d]));
export const DEPOT_BY_BUILDING = new Map(DEPOTS.map((d) => [d.buildingId, d]));

// product names per depot (code numbers are generated, stable across reloads)
const PRODUCT_NAMES: Record<string, [string, string][]> = {
  POC: [
    ["Mănuși de lucru", "per."],
    ["Mănuși nitril", "cutie"],
    ["Cască de protecție", "buc."],
    ["Vestă reflectorizantă", "buc."],
    ["Ochelari de protecție", "buc."],
    ["Antifoane", "buc."],
    ["Bocanci S3", "per."],
    ["Salopetă de lucru", "buc."],
    ["Mască FFP2", "cutie"],
    ["Pelerină de ploaie", "buc."],
  ],
  LIR: [
    ["Bormașină cu acumulator", "buc."],
    ["Set chei combinate", "set"],
    ["Polizor unghiular", "buc."],
    ["Ruletă 5 m", "buc."],
    ["Nivelă cu bulă 60 cm", "buc."],
    ["Set șurubelnițe", "set"],
    ["Ciocan 500 g", "buc."],
    ["Fierăstrău pendular", "buc."],
    ["Clește patent", "buc."],
  ],
  VEN: [
    ["Șuruburi autoforante 4,2×19", "cutie"],
    ["Dibluri plastic 8 mm", "cutie"],
    ["Balamale inox", "per."],
    ["Lanț zincat 6 mm", "m"],
    ["Piulițe M10", "cutie"],
    ["Coliere metalice", "set"],
    ["Cuie 70 mm", "kg"],
    ["Cârlige de prindere", "buc."],
    ["Bandă perforată", "rolă"],
    ["Ancore chimice", "buc."],
  ],
  TEM: [
    ["Cablu MYYM 3×1,5", "m"],
    ["Prelungitor 5 prize", "buc."],
    ["Bec LED 9 W", "buc."],
    ["Doză aparentă", "buc."],
    ["Siguranță automată 16 A", "buc."],
    ["Bandă izolatoare", "rolă"],
    ["Proiector LED 50 W", "buc."],
    ["Tub gofrat 20 mm", "m"],
  ],
  ARC: [
    ["Cutie carton 40×30×30", "buc."],
    ["Folie stretch 23 µm", "rolă"],
    ["Bandă adezivă maro", "rolă"],
    ["Palet EUR", "buc."],
    ["Colțar carton", "buc."],
    ["Etichete termice 100×150", "rolă"],
    ["Folie cu bule", "rolă"],
  ],
  SEZ: [
    ["Furtun grădină 25 m", "buc."],
    ["Lopată pentru zăpadă", "buc."],
    ["Sare deszăpezire 25 kg", "sac"],
    ["Greblă metalică", "buc."],
    ["Stropitoare 10 L", "buc."],
    ["Sac compost 50 L", "sac"],
    ["Ghiveci 30 cm", "buc."],
  ],
};

function buildProducts(): Product[] {
  const out: Product[] = [];
  const used = new Set<string>();
  for (const d of DEPOTS) {
    if (!d.hasStock) continue;
    const rnd = mulberry32(d.code.charCodeAt(0) * 977 + d.code.charCodeAt(2));
    for (const [name, unit] of PRODUCT_NAMES[d.code] ?? []) {
      let num = 100 + Math.floor(rnd() * 880);
      while (used.has(`${d.code}${num}`)) num++;
      used.add(`${d.code}${num}`);
      const min = [20, 40, 50, 80, 100, 150][Math.floor(rnd() * 6)];
      const low = rnd() < 0.18;
      const qty = low ? Math.floor(min * (0.2 + rnd() * 0.6)) : Math.floor(min * (1.2 + rnd() * 6));
      out.push({
        code: `${d.code}${num}`,
        name,
        depot: d.code,
        unit,
        qty,
        min,
        location: `Culoar ${d.aisles[Math.floor(rnd() * d.aisles.length)]} · Raft ${String(1 + Math.floor(rnd() * 14)).padStart(2, "0")} · Nivel ${1 + Math.floor(rnd() * 4)}`,
        category: d.category,
      });
    }
  }
  // the example from the brief
  const gloves = out.find((p) => p.name === "Mănuși de lucru");
  if (gloves) gloves.code = "POC235";
  return out;
}

export const PRODUCTS: Product[] = buildProducts();
export const PRODUCT_BY_CODE = new Map(PRODUCTS.map((p) => [p.code, p]));

// ── people ──────────────────────────────────────────────────────────────────
const FIRST = ["Andreea", "Bogdan", "Carmen", "Dragoș", "Elena", "Florin", "Gabriela", "Horia", "Ioana", "Iulian", "Larisa", "Marius", "Nicoleta", "Ovidiu", "Paula", "Radu", "Sorina", "Tudor", "Valentina", "Vlad", "Cristina", "Adrian", "Monica", "Sergiu", "Diana", "Cosmin", "Alina", "Petru", "Roxana", "Emil"];
const LAST = ["Albu", "Barbu", "Ciocan", "Dinu", "Enache", "Filip", "Ghiță", "Hârșan", "Iordache", "Jitaru", "Lazăr", "Mocanu", "Neagu", "Oprea", "Pavel", "Rusu", "Sârbu", "Tănase", "Ungur", "Vlase", "Zamfir", "Cozma", "Bălan", "Matei", "Stoica"];
const ROLES_STOCK = ["Operator stivuitor", "Operator stivuitor", "Picker", "Picker", "Gestionar", "Recepție marfă", "Expediție"];
const AVATARS = ["#f08a24", "#14a39a", "#7c5cd6", "#2f7be0", "#d4a017", "#3fae5a", "#e0567a", "#5b6b85"];

function buildEmployees(): Employee[] {
  const rnd = mulberry32(4242);
  const out: Employee[] = [];
  const names = new Set<string>();
  let n = 101;
  const add = (depot: string, role: string) => {
    let first = "";
    let last = "";
    do {
      first = FIRST[Math.floor(rnd() * FIRST.length)];
      last = LAST[Math.floor(rnd() * LAST.length)];
    } while (names.has(first + last));
    names.add(first + last);
    const skills: string[] = [];
    if (role.includes("stivuitor")) skills.push("Autorizare stivuitor");
    if (rnd() < 0.35) skills.push("Prim ajutor");
    if (rnd() < 0.3) skills.push("PSI");
    if (role === "Gestionar" || role.startsWith("Șef")) skills.push("Inventar");
    out.push({
      id: `ANG-${String(n++).padStart(4, "0")}`,
      first,
      last,
      role,
      depot,
      shift: rnd() < 0.55 ? "Tura I" : rnd() < 0.6 ? "Tura II" : "Normal",
      since: 2016 + Math.floor(rnd() * 10),
      ext: String(200 + Math.floor(rnd() * 600)),
      skills,
      avatar: AVATARS[Math.floor(rnd() * AVATARS.length)],
    });
  };
  for (const d of DEPOTS) {
    if (d.hasStock) {
      add(d.code, `Șef depozit ${d.code}`);
      const count = d.code === "POC" || d.code === "VEN" ? 7 : d.code === "SEZ" || d.code === "ARC" ? 4 : 5;
      for (let i = 0; i < count; i++) add(d.code, ROLES_STOCK[Math.floor(rnd() * ROLES_STOCK.length)]);
    }
  }
  for (const role of ["Dispecer", "Dispecer", "Contabil", "Resurse umane", "Planificare transport", "Director logistică", "Achiziții"]) add("ADM", role);
  for (const role of ["Tehnician mentenanță", "Tehnician mentenanță", "Electrician"]) add("MNT", role);
  // normal-schedule for office people
  for (const e of out) if (e.depot === "ADM") e.shift = "Normal";
  return out;
}

export const EMPLOYEES: Employee[] = buildEmployees();
export const EMPLOYEE_BY_ID = new Map(EMPLOYEES.map((e) => [e.id, e]));

export const SHIFT_HOURS: Record<Employee["shift"], string> = {
  "Tura I": "06:00 – 14:00",
  "Tura II": "14:00 – 22:00",
  Normal: "08:00 – 16:30",
};

export const fullName = (e: Employee) => `${e.first} ${e.last}`;
export const initials = (e: Employee) => `${e.first[0]}${e.last[0]}`;
