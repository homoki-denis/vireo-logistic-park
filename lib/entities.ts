import { SITE_LIST } from "./sites";
import type { Entity, SiteId } from "./types";
import { buildingPinPosition, doorPosition, parkingSlots, toWorld } from "./util";

const TYPE_LABEL = { forklift: "Stivuitor", truck: "Camion", van: "Dubă", flatbed: "Camion" } as const;

function build(): Entity[] {
  const out: Entity[] = [];
  for (const site of SITE_LIST) {
    for (const b of site.buildings) {
      if (!b.own) continue;
      out.push({
        id: b.id,
        siteId: site.id,
        type: "building",
        name: b.name ?? b.id,
        subtitle: b.info?.type ?? "Clădire",
        position: buildingPinPosition(b),
        rect: { x: b.x, z: b.z, w: b.w, d: b.d },
      });
      (b.doors ?? []).forEach((door, i) => {
        if (!door.dock) return;
        const l = doorPosition({ ...b, x: 0, z: 0 }, door, 3);
        const p = toWorld(b, l.x, l.z);
        out.push({
          id: `${b.id}-dock-${i}`,
          siteId: site.id,
          type: "dock",
          name: door.name ?? `Rampa ${i + 1}`,
          subtitle: b.name ?? "",
          position: [p.x, 1, p.z],
          buildingId: b.id,
        });
      });
    }
    for (const p of site.parkings) {
      if (!p.own) continue;
      out.push({
        id: p.id,
        siteId: site.id,
        type: "parking",
        name: p.name,
        subtitle: `${parkingSlots(p)} locuri`,
        position: [p.x, 1, p.z],
        rect: { x: p.x, z: p.z, w: p.w, d: p.d },
      });
    }
    for (const m of site.movers) {
      out.push({
        id: m.id,
        siteId: site.id,
        type: m.type === "forklift" ? "forklift" : m.type === "van" ? "van" : "truck",
        name: m.name,
        subtitle: TYPE_LABEL[m.type],
        position: [m.path[0].p[0], 1, m.path[0].p[1]],
        moving: true,
      });
    }
  }
  return out;
}

export const ENTITIES: Entity[] = build();
export const ENTITY_BY_ID = new Map(ENTITIES.map((e) => [e.id, e]));
export const entitiesOf = (siteId: SiteId) => ENTITIES.filter((e) => e.siteId === siteId);
