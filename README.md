# Vireo Logistic Park · 3D demo

A showcase demo (Romanian / English, mobile-friendly): a 3D map of a **fictional** logistics park with warehouses, product codes and staff attendance.
**All data is made up**: the company, warehouses, products, employees and badges. None of it describes a real place or person.

Stack: **Next.js 15 · React 19 · TypeScript · React Three Fiber (three.js) · drei · zustand**.

## Getting started

```bash
npm install
npm run dev                      # http://localhost:3000
npm run build && npm start       # production
STATIC_EXPORT=1 npm run build    # static site in out/
```

## Features

- **3D map** with 6 warehouses (POC, LIR, VEN, TEM, ARC, SEZ), the ADM office building and the MNT workshop. Forklifts and trucks are animated, and the gate barriers lift automatically.
- **Product codes.** Every code starts with its warehouse prefix: `POC235` = Work gloves in the POC warehouse. Codes are searchable from the top bar (press `/`) and from the *Products* tab.
- **Attendance.** See who is on site right now in each main building (the *Attendance* tab, or click a warehouse). Each person's card shows their badge, role, shift, clock-in time, phone extension and last scan.
- **Live activity** (simulated): clock-ins, breaks, product scans and moves between warehouses.
- **Language switch** (RO / EN) in the header, remembered between visits.
- **Mobile layout** below 760 px: full-screen map, bottom tab bar and slide-up sheets.

## Where to edit

| File | Contents |
| --- | --- |
| `lib/catalog.ts` | warehouses (code, name, colour), products and employees (generated deterministically) |
| `lib/sites.ts` | the 3D layout: buildings, parking lots, vehicle routes, barriers |
| `lib/i18n.ts` | translations: UI strings (RO/EN) and the RO → EN table for data |
| `lib/sim.ts` | simulated "live" data (attendance, stock, feed). Can be replaced with a real API |
| `components/ui/Panels.tsx` | the interface: search, tabs, detail panels |
| `components/three/*` | 3D models and the camera |

To add a warehouse, add an entry to `DEPOTS` (catalog) and a building with the same `code` in `sites.ts`.

## Deploy

The easiest way is [Vercel](https://vercel.com): import the GitHub repository and click **Deploy**. No configuration is needed, and every push to `main` redeploys automatically.
