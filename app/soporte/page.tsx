import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/legal-page";
import { SupportContent } from "@/features/legal/components/support-content";

export const metadata: Metadata = { title: "Ayuda y soporte · AVORA", description: "Resolvemos tus dudas sobre AVORA." };

export default function Page() {
  return <LegalPage title="Ayuda y soporte"><SupportContent /></LegalPage>;
}
