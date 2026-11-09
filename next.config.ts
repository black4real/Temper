import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is per-user and auth-gated, so pages are inherently dynamic. We opt out of
  // Cache Components / Partial Prefetching (PPR) to avoid prerendering cookie-dependent routes.
  cacheComponents: false,
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
