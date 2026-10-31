import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/components/legal-page";
import { PrivacyContent } from "@/features/legal/components/privacy-content";

export const metadata: Metadata = { title: "Política de privacidad · AVORA", description: "Cómo AVORA cuida y usa tus datos." };

export default function Page() {
  return <LegalPage title="Política de privacidad"><PrivacyContent /></LegalPage>;
}
