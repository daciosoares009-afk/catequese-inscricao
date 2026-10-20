import type { Metadata } from "next";
import AppShell from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PSJB-Crisma",
  description: "Gestão pastoral de catequese, turmas e frequência.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();

  return (
    <html lang="pt-BR">
      <body>
        <AppShell session={session}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
