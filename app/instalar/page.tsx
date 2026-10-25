import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import PwaInstallGuide from "@/components/pwa-install-guide";

export const metadata: Metadata = {
  title: "Instalar aplicativo | PSJB-Crisma",
  description: "Veja como instalar o PSJB-Crisma no Android, iPhone, iPad ou computador.",
};

export default function InstallPage() {
  return (
    <>
      <PageHeader
        eyebrow="Aplicativo"
        title="Instalar PSJB-Crisma"
        description="Use o sistema como um aplicativo, direto da tela inicial do seu dispositivo."
      />
      <PwaInstallGuide />
    </>
  );
}
