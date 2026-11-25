"use client";
import { useEffect } from "react";
import { objectRegistry } from "@/lib/registry";
import { useT } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { PinLayer } from "./three/Pins";
import Scene from "./three/Scene";
import { ActivityFeed, DetailPanel, Header, KpiBar, Sidebar, Toolbar } from "./ui/Panels";

export default function App() {
  const { t } = useT();
  const lang = useStore((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const tick = useStore((s) => s.tick);
  const hasSelection = useStore((s) => !!s.selectedId);
  // small debug hook: window.__yardFly([x,0,z],[camX,camY,camZ])
  useEffect(() => {
    const w = window as unknown as { __yardFly: unknown; __yardObjects: unknown };
    w.__yardFly = (t: [number, number, number], p: [number, number, number]) => useStore.getState().flyTo(t, undefined, p);
    w.__yardObjects = objectRegistry;
  }, []);
  useEffect(() => {
    const t = setInterval(tick, 1500);
    return () => clearInterval(t);
  }, [tick]);
  return (
    <div className="app">
      <Header />
      <div className="body">
        <Sidebar />
        <main className="stage">
          <Scene />
          <PinLayer />
          <div className="overlay overlay--tl">
            <KpiBar />
          </div>
          <div className="overlay overlay--tr">
            <DetailPanel />
          </div>
          <div className="overlay overlay--bl">
            <Toolbar />
          </div>
          <div className="overlay overlay--br">
            <ActivityFeed />
          </div>
          {!hasSelection && <div className="hint">{t("hint")}</div>}
        </main>
      </div>
    </div>
  );
}
