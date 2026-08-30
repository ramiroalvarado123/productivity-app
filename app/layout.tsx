import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeTrack",
  description: "Todo tu progreso en un solo lugar.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "LifeTrack",
    description: "Todo tu progreso en un solo lugar.",
    url: "https://mi-progreso.ralvarado377764.chatgpt.site",
    siteName: "LifeTrack",
    images: [{ url: "https://mi-progreso.ralvarado377764.chatgpt.site/og.png", width: 1200, height: 630, alt: "LifeTrack — Todo tu progreso en un solo lugar." }],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LifeTrack",
    description: "Todo tu progreso en un solo lugar.",
    images: ["https://mi-progreso.ralvarado377764.chatgpt.site/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
