import type { AttendanceStatus } from "@prisma/client";

export function frequencySummary(statuses: AttendanceStatus[]) {
  const total = statuses.length;
  const present = statuses.filter(status => status === "PRESENT" || status === "LATE").length;
  return { total, present, absent: total - present, rate: total ? Math.round(present / total * 100) : 0 };
}
