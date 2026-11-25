import type { NextConfig } from "next";

// STATIC_EXPORT=1 npm run build  → plain static files in out/ (no Node server needed)
const isStatic = !!process.env.STATIC_EXPORT;

const nextConfig: NextConfig = {
  output: isStatic ? "export" : undefined,
  // relative asset paths so the exported site works from any sub-folder
  assetPrefix: isStatic ? "./" : undefined,
  reactStrictMode: true,
};

export default nextConfig;
