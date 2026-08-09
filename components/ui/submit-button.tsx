"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, className = "btn btn-primary", pendingLabel = "Salvando...", disabled = false }: { children: React.ReactNode; className?: string; pendingLabel?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={disabled || pending} aria-busy={pending}>{pending && <LoaderCircle className="spin" size={16} />}{pending ? pendingLabel : children}</button>;
}
