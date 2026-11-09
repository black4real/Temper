import type { MetadataRoute } from "next";

// Private personal beta: disallow all crawlers. When you make the app public, change this to
// `allow: "/"` with `disallow: ["/auth", "/import"]` (and flip metadata.robots in layout.tsx).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
