import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import PwaRegistration from "./pwa-registration";
import "./globals.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://productivity-app-git-feat-vercel-supabase-c7675b-ralvarado-3362.vercel.app");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#164735",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "AVORA",
  title: "AVORA",
  description: "Todo tu progreso en un solo lugar.",
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    title: "AVORA",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/api/pwa-icon?size=192", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: [{ url: "/api/pwa-icon?size=180", sizes: "180x180", type: "image/png" }],
  },
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
    <html lang="es">
      <body className={`${instrumentSans.variable} ${newsreader.variable}`}>
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
