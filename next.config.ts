import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt into the Next.js 16 Cache Components model so puzzle reads can use
  // `use cache` + cacheLife + cacheTag with admin-configurable, on-demand
  // invalidation. NOTE: this makes PPR the default and removes route-segment
  // config (export const revalidate/dynamic/fetchCache) — do not use those.
  cacheComponents: true,
};

export default nextConfig;
