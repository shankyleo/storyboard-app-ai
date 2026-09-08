import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Avoids RSC manifest errors when .next is rebuilt while dev is running.
    devtoolSegmentExplorer: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
