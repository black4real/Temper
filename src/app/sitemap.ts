import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Minimal sitemap. The app is auth-gated, so only the public entry point is listed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${siteUrl}/login`, lastModified: new Date() }];
}
