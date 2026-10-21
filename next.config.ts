import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite loads its WASM build and data files from its own package folder.
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "m.media-amazon.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
