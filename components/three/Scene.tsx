"use client";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { objectRegistry } from "@/lib/registry";
import { isMobileNow } from "@/lib/useIsMobile";
import { SITES } from "@/lib/sites";
import { useStore } from "@/lib/store";
import type { SiteSpec } from "@/lib/types";
import { Building } from "./Building";
import { Fences, Ground, Pallets, Parkings, ScrapHeaps, SolarFields, Trees } from "./Environment";
import { Gates } from "./Gates";
import { Mover, StaticVehicles } from "./Movers";
import { PinProjector } from "./Pins";

export default function Scene() {
  const mobile = isMobileNow();
  const siteId = useStore((s) => s.siteId);
  const select = useStore((s) => s.select);
  const site = SITES[siteId];
  return (
    <Canvas
      shadows
      dpr={mobile ? [1, 1.5] : [1, 2]}
      camera={{ position: mobile ? (site.view.position.map((v, i) => (i === 1 ? v * 1.7 : v * 1.45)) as [number, number, number]) : site.view.position, fov: mobile ? 45 : 35, near: 1, far: 4000 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={["#e9eef6"]} />
      <fog attach="fog" args={["#e9eef6", 520, 1400]} />
      <hemisphereLight args={["#ffffff", "#c6d2e6", 1.05]} />
      <directionalLight
        position={[160, 260, 120]}
        intensity={2.1}
        castShadow
        shadow-mapSize={mobile ? [2048, 2048] : [4096, 4096]}
        shadow-camera-left={-340}
        shadow-camera-right={340}
        shadow-camera-top={340}
        shadow-camera-bottom={-340}
        shadow-camera-far={1200}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      <directionalLight position={[-200, 120, -80]} intensity={0.35} />
      <SiteContent key={site.id} site={site} />
      <OrbitControls
        makeDefault
        target={site.view.target}
        enableDamping
        dampingFactor={0.08}
        maxPolarAngle={1.36}
        minDistance={12}
        maxDistance={850}
        screenSpacePanning={false}
      />
      <CameraRig />
      <PinProjector />
    </Canvas>
  );
}

function SiteContent({ site }: { site: SiteSpec }) {
  const showNeighbours = useStore((s) => s.showNeighbours);
  return (
    <group>
      <Ground site={site} />
      {site.buildings.filter((b) => b.own || showNeighbours).map((b) => (
        <Building key={b.id} b={b} />
      ))}
      <Parkings site={site} />
      <Trees site={site} />
      <Pallets list={site.pallets} />
      <SolarFields list={site.solarFields} />
      <Fences list={site.fences} />
      {site.scrapHeaps && showNeighbours && <ScrapHeaps spec={site.scrapHeaps} />}
      <StaticVehicles list={site.vehicles} />
      <Gates site={site} />
      {site.movers.map((m) => (
        <Mover key={m.id} m={m} />
      ))}
    </group>
  );
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function CameraRig() {
  const fly = useStore((s) => s.fly);
  const selectedId = useStore((s) => s.selectedId);
  const follow = useStore((s) => s.follow);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const anim = useRef<{ fromT: THREE.Vector3; fromP: THREE.Vector3; toT: THREE.Vector3; offset: THREE.Vector3; t: number; trackId: string | null } | null>(null);
  const last = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (!fly || !controls) return;
    const toT = new THREE.Vector3(...fly.target);
    let offset: THREE.Vector3;
    if (fly.position) offset = new THREE.Vector3(...fly.position).sub(toT);
    else {
      const dir = camera.position.clone().sub(controls.target);
      const steep = selectedId && objectRegistry.has(selectedId) ? 2.5 : 0.6;
      dir.y = Math.max(dir.y, Math.hypot(dir.x, dir.z) * steep);
      offset = dir.normalize().multiplyScalar(fly.distance ?? 60);
    }
    // portrait phones see less horizontally → stand further back
    if (isMobileNow()) offset.multiplyScalar(fly.position ? 1.5 : 1.35);
    const trackId = selectedId && objectRegistry.has(selectedId) ? selectedId : null;
    anim.current = { fromT: controls.target.clone(), fromP: camera.position.clone(), toT, offset, t: 0, trackId };
    last.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fly?.nonce, controls]);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => {
      if (anim.current && anim.current.t > 0.05) anim.current = null;
    };
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);

  useEffect(() => {
    last.current = null;
  }, [selectedId]);

  // +/- buttons from the toolbar
  useEffect(() => {
    if (!controls) return;
    const onZoom = (ev: Event) => {
      const f = (ev as CustomEvent<number>).detail;
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(f);
      const len = THREE.MathUtils.clamp(offset.length(), 12, 850);
      offset.setLength(len);
      anim.current = { fromT: controls.target.clone(), fromP: camera.position.clone(), toT: controls.target.clone(), offset, t: 0.35, trackId: null };
    };
    window.addEventListener("yard-zoom", onZoom);
    return () => window.removeEventListener("yard-zoom", onZoom);
  }, [controls, camera]);

  useFrame((_, dt) => {
    if (!controls) return;
    const a = anim.current;
    if (a) {
      a.t = Math.min(1, a.t + dt / 1.2);
      const k = ease(a.t);
      if (a.trackId) {
        const o = objectRegistry.get(a.trackId);
        if (o) a.toT.set(o.position.x, 0, o.position.z);
      }
      const toP = a.toT.clone().add(a.offset);
      controls.target.lerpVectors(a.fromT, a.toT, k);
      camera.position.lerpVectors(a.fromP, toP, k);
      controls.update();
      if (a.t >= 1) anim.current = null;
      return;
    }
    if (follow && selectedId) {
      const o = objectRegistry.get(selectedId);
      if (o) {
        const p = new THREE.Vector3(o.position.x, 0, o.position.z);
        if (last.current) {
          const d = p.clone().sub(last.current);
          if (d.lengthSq() < 400) {
            camera.position.add(d);
            controls.target.add(d);
            controls.update();
          }
        }
        last.current = p;
      }
    }
  });
  return null;
}
