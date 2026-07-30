import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Catequese Presente", description: "Gestão pastoral de catequese, turmas e frequência." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
