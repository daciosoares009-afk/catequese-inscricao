"use client";

import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";

export function ConfirmSubmitButton({ children, message, className = "btn btn-secondary", pendingLabel = "Processando..." }: { children: React.ReactNode; message: string; className?: string; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending} aria-busy={pending} onClick={event => { if (!window.confirm(message)) event.preventDefault(); }}>{pending && <LoaderCircle className="spin" size={16} />}{pending ? pendingLabel : children}</button>;
}
