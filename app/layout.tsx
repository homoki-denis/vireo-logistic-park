import type { Metadata, Viewport } from "next";
import type React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vireo Logistic Park · Demo 3D",
  description: "Demo cu date fictive: hartă 3D, coduri produs, pontaj",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0e8f85",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
