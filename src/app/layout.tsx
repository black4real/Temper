import type { Metadata, Viewport } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

// One family does almost everything: Archivo's width axis gives an expanded display voice
// (day numerals, headings) and a normal-width text voice from the same file.
const sans = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Figures and data only, like heat numbers stamped into steel.
const mono = Martian_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "A 120 day discipline system. Every day of work heats the bar, and the record keeps its color.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Temper",
    template: "%s · Temper",
  },
  description,
  applicationName: "Temper",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Temper" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-icon-180.png",
  },
  openGraph: {
    type: "website",
    siteName: "Temper",
    title: "Temper",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Temper",
    description,
  },
  // Private personal beta: keep it out of search indexes. Flip to `{ index: true }`
  // (and update robots.ts) when you want it public.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#EEF0F2" },
    { media: "(prefers-color-scheme: dark)", color: "#0D0E10" },
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
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <nav aria-label="Skip links">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[2px] focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
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
