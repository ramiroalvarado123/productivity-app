import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/legal-page";
import { TermsContent } from "@/features/legal/components/terms-content";

export const metadata: Metadata = { title: "Términos de uso · AVORA", description: "Las reglas para usar AVORA." };

export default function Page() {
  return <LegalPage title="Términos de uso"><TermsContent /></LegalPage>;
}
