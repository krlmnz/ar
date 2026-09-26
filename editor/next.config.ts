import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Keep file tracing inside this app. The repo root has a separate Eleventy lockfile.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
