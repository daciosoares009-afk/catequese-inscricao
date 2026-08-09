import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, context, icon: Icon, tone = "green" }: { label: string; value: React.ReactNode; context?: string; icon: LucideIcon; tone?: "green" | "gold" | "blue" | "rose" }) {
  return <article className={`metric-card metric-${tone}`}><div className="metric-top"><span><Icon size={19} /></span><i aria-hidden="true" /></div><strong className="metric-value">{value}</strong><h2>{label}</h2>{context && <p>{context}</p>}</article>;
}
