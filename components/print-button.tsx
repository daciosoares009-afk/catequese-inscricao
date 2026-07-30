"use client";
import { Printer } from "lucide-react";
export function PrintButton({ label = "Imprimir cartão" }: { label?: string }) {
  return <button type="button" className="btn btn-secondary no-print" onClick={() => window.print()}><Printer size={15} />{label}</button>;
}
