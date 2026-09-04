import type { Metadata } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import SettingsController from "./settings-controller";
import "./globals.css";

const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", display: "swap" });
const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://productivity-app-git-feat-vercel-supabase-c7675b-ralvarado-3362.vercel.app");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "AVORA",
  description: "Todo tu progreso en un solo lugar.",
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
    <html lang="es" className={`${instrumentSans.variable} ${newsreader.variable}`}>
      <body>
        <SettingsController />
        {children}
      </body>
    </html>
  );
}
