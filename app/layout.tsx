import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mi Progreso",
  description: "Tu gimnasio, alimentación, lectura y progreso diario en un solo lugar.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  openGraph: {
    title: "Mi Progreso",
    description: "Tu día, en equilibrio.",
    url: "https://mi-progreso.ralvarado377764.chatgpt.site",
    siteName: "Mi Progreso",
    images: [{ url: "https://mi-progreso.ralvarado377764.chatgpt.site/og.png", width: 1200, height: 630, alt: "Mi Progreso — Tu día, en equilibrio." }],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mi Progreso",
    description: "Tu día, en equilibrio.",
    images: ["https://mi-progreso.ralvarado377764.chatgpt.site/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
