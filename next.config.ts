import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export for production
  output: 'export',
  
  // Production: deploy under /reclutamiento subpath
  basePath: process.env.NODE_ENV === 'production' ? '/reclutamiento' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/reclutamiento' : '',
  
  // Trailing slash for consistent routing
  trailingSlash: true,
  
  // Image optimization
  images: {
    unoptimized: true, // If deploying static or without Next.js server
  },
};

export default nextConfig;
