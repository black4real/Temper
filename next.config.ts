import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app is per-user and auth-gated, so pages are inherently dynamic. We opt out of
  // Cache Components / Partial Prefetching (PPR) to avoid prerendering cookie-dependent routes.
  cacheComponents: false,
  experimental: {
    // Every page here is dynamic, and the default client router cache for dynamic routes
    // is 0s — so navigating back to a page you just viewed refetches it from the server
    // (auth round-trip + queries) and feels slow. Reusing it briefly makes page turns
    // instant; server actions still call revalidatePath, which busts this cache.
    staleTimes: {
      dynamic: 30,
      static: 180,
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
