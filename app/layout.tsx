import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Instrument_Sans, Newsreader } from "next/font/google";
import { ServiceWorkerRegistration } from "./service-worker-registration";
import "./globals.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-cormorant", display: "swap" });
const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://productivity-app-git-feat-vercel-supabase-c7675b-ralvarado-3362.vercel.app");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "AVORA",
  description: "Todo tu progreso en un solo lugar.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "AVORA",
    statusBarStyle: "default",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "AVORA",
    description: "Todo tu progreso en un solo lugar.",
    url: "/",
    siteName: "AVORA",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AVORA",
    description: "Todo tu progreso en un solo lugar.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${instrumentSans.variable} ${newsreader.variable} ${cormorantGaramond.variable}`}>
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
