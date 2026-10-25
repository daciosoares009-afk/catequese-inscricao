import type { Metadata, Viewport } from "next";
import AppShell from "@/components/app-shell";
import PwaRegistration from "@/components/pwa-registration";
import { getSession } from "@/lib/auth";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  applicationName: "PSJB-Crisma",
  title: "PSJB-Crisma",
  description: "Gestão pastoral de catequese, turmas e frequência.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PSJB-Crisma",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e2940",
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
        <PwaRegistration />
      </body>
    </html>
  );
}
