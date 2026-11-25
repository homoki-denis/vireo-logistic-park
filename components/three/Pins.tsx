"use client";
// Screen-space pins (DOM) projected from 3D every frame.
// We use plain DOM + a projector instead of drei <Html> so the labels stay
// cheap and never leak DOM nodes when switching sites.
import { useFrame, useThree } from "@react-three/fiber";
import { Box, Car, Forklift, Truck, Warehouse } from "lucide-react";
import * as THREE from "three";
import { DEPOT_BY_BUILDING } from "@/lib/catalog";
import { ENTITIES } from "@/lib/entities";
import { presentIn } from "@/lib/sim";
import { objectRegistry } from "@/lib/registry";
import { useT } from "@/lib/i18n";
import { useIsMobile } from "@/lib/useIsMobile";
import { buildingFor, useStore } from "@/lib/store";
import type { Entity } from "@/lib/types";

type PinKind = "building" | "forklift" | "truck" | "parking" | "dock";
const ICONS = { building: Warehouse, forklift: Forklift, truck: Truck, parking: Car, dock: Box } as const;

/** DOM elements of the pins, filled by <PinLayer/>, positioned by <PinProjector/> */
const pinEls = new Map<string, HTMLDivElement>();
const PIN_LIFT: Partial<Record<Entity["type"], number>> = { forklift: 4.2, van: 4.8, truck: 6.2 };

export function PinBubble({ kind, title, subtitle, active, small }: { kind: PinKind; title: string; subtitle?: string; active?: boolean; small?: boolean }) {
  const Icon = ICONS[kind];
  return (
    <div className={`pin ${active ? "pin--active" : ""} ${small ? "pin--small" : ""}`}>
      <div className="pin__bubble">
        <span className="pin__icon">
          <Icon size={small ? 12 : 14} strokeWidth={2.4} />
        </span>
        <span className="pin__text">
          <b>{title}</b>
          {subtitle && <small>{subtitle}</small>}
        </span>
      </div>
      <div className="pin__tail" />
    </div>
  );
}

/** DOM overlay, rendered next to the <Canvas/> */
export function PinLayer() {
  const { t, d: tr } = useT();
  const mobile = useIsMobile();
  const selectedId = useStore((s) => s.selectedId);
  const hoveredId = useStore((s) => s.hoveredId);
  const showLabels = useStore((s) => s.showLabels);
  const select = useStore((s) => s.select);
  const live = useStore((s) => s.live);
  const selBuilding = selectedId ? buildingFor(selectedId, live) : null;
  const pins = ENTITIES.filter((e) => (e.type === "building" && DEPOT_BY_BUILDING.has(e.id)) || (e.moving && (!mobile || e.id === selectedId))).filter(
    (e) => showLabels || e.id === selBuilding,
  );
  return (
    <div className="pin-layer">
      {pins.map((e) => {
        const depot = DEPOT_BY_BUILDING.get(e.id);
        const active = e.id === selBuilding;
        const focus = active || e.id === hoveredId;
        let sub: string | undefined;
        if (depot) {
          const n = presentIn(live, depot.code).length;
          sub = t("nPresent", { n });
        } else if (focus) {
          const st = e.type === "forklift" ? live.forklifts[e.id]?.status : live.vehicles[e.id]?.status;
          sub = st ? tr(st) : undefined;
        }
        return (
          <div
            key={e.id}
            className="pin-anchor"
            ref={(el) => {
              if (el) pinEls.set(e.id, el);
              else pinEls.delete(e.id);
            }}
          >
            <button className="pin-btn" onClick={() => select(e.id)}>
              {depot ? (
                <div className={`pin pin--depot ${active ? "pin--active" : ""}`} style={{ ["--accent" as string]: depot.accent }}>
                  <div className="pin__bubble">
                    <span className="pin__code">{depot.code}</span>
                    <span className="pin__text">
                      <b>{tr(depot.name)}</b>
                      <small>{sub}</small>
                    </span>
                  </div>
                  <div className="pin__tail" />
                </div>
              ) : (
                <PinBubble kind={e.type === "forklift" ? "forklift" : "truck"} title={tr(e.name)} subtitle={sub} active={active} small />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

const ENT = new Map(ENTITIES.map((e) => [e.id, e]));
const v = new THREE.Vector3();

/** inside <Canvas/>: moves the DOM pins every frame */
export function PinProjector() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    for (const [id, el] of pinEls) {
      const e = ENT.get(id);
      if (!e) continue;
      const obj = e.moving ? objectRegistry.get(id) : undefined;
      if (e.moving) {
        if (!obj) {
          el.style.display = "none";
          continue;
        }
        v.set(obj.position.x, PIN_LIFT[e.type] ?? 5, obj.position.z);
      } else v.set(e.position[0], e.position[1], e.position[2]);
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.zIndex = String(Math.max(1, Math.round(5000 - dist)));
    }
  });
  return null;
}
