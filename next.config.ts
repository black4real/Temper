import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is per-user and auth-gated, so pages are inherently dynamic. We opt out of
  // Cache Components / Partial Prefetching (PPR) to avoid prerendering cookie-dependent routes.
  cacheComponents: false,
  experimental: {
    // Every page here is dynamic, and the default client router cache for dynamic routes
    // is 0s, so each page turn waited on the server. The nav links prefetch full pages
    // (prefetch={true}); these windows keep those prefetches and visited pages reusable so
    // page turns are instant. Server actions call revalidatePath, which busts this cache
    // whenever data changes.
    staleTimes: {
      dynamic: 120,
      static: 300,
    },
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
