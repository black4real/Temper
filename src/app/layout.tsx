import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "A 120-day discipline system. Execute nine daily commitments; reflect on the record.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ghost Mode",
    template: "%s · Ghost Mode",
  },
  description,
  applicationName: "Ghost Mode",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Ghost Mode" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-icon-180.png",
  },
  openGraph: {
    type: "website",
    siteName: "Ghost Mode",
    title: "Ghost Mode",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ghost Mode",
    description,
  },
  // Private personal beta: keep it out of search indexes. Flip to `{ index: true }`
  // (and update robots.ts) when you want it public.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F6F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0E10" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Set the theme class before paint to avoid a flash. Respects a stored preference, else system.
const themeInit = `(function(){try{var t=localStorage.getItem('gm-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||((t===null||t==='system')&&m);document.documentElement.classList.toggle('dark',dark);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <nav aria-label="Skip links">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
          >
            Skip to content
          </a>
        </nav>
        {children}
        <Toaster position="top-center" />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
