import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for production server
  output: 'standalone',
  
  // Production: deploy under /reclutamiento subpath
  basePath: process.env.NODE_ENV === 'production' ? '/reclutamiento' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/reclutamiento' : '',
  
  // Trailing slash for consistent routing
  trailingSlash: true,
  
  // Image optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
