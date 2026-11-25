"use client";
import dynamic from "next/dynamic";

// The whole app is client-only (WebGL + live simulated data)
const App = dynamic(() => import("@/components/App"), {
  ssr: false,
  loading: () => <div className="boot">Se încarcă harta 3D… / Loading the 3D map…</div>,
});

export default function Page() {
  return <App />;
}
