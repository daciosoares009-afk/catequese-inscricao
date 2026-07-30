import { statusLabel } from "@/lib/format";
export function StatusBadge({ status }: { status: string }) { const kind = ["ABSENT","DROPOUT","CANCELLED"].includes(status)?"danger":["WAITING","LATE","PLANNED","JUSTIFIED"].includes(status)?"warn":""; return <span className={`badge ${kind}`}>{statusLabel[status] || status}</span>; }
