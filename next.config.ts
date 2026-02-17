import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for production server
  output: 'standalone',

  // Deploy under /reclutamiento in production, no basePath in dev
  basePath: process.env.NODE_ENV === 'production' ? '/reclutamiento' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/reclutamiento' : '',

  // Trailing slash for consistent routing (helps with static hosting)
  trailingSlash: true,

  // Disable Next.js image optimization in environments where it isn't needed
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
