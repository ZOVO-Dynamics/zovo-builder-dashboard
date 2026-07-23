import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: "/home/ubuntu/zovo-builder-dashboard",
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
