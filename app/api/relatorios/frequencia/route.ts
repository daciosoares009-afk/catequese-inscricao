import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { frequencySummary } from "@/utils/frequency";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado" } }, { status: 401 });
  const classId = request.nextUrl.searchParams.get("classId") || undefined;
  const classScope = catechistClassFilter(session);
  const [rows, attendances] = await Promise.all([
    prisma.enrollment.findMany({ where: { status: "ACTIVE", classId, class: classScope }, include: { catechumen: true, class: true } }),
    prisma.attendance.findMany({ where: { classId, class: classScope }, select: { catechumenId: true, classId: true, status: true } }),
  ]);
  const lines = [["Catequizando", "Turma", "Presenças", "Faltas", "Frequência"], ...rows.map(enrollment => { const own = attendances.filter(a => a.catechumenId === enrollment.catechumenId && a.classId === enrollment.classId); const summary = frequencySummary(own.map(a => a.status)); return [enrollment.catechumen.fullName, enrollment.class.name, String(summary.present), String(summary.absent), `${summary.rate}%`]; })];
  const csv = "\uFEFF" + lines.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(";")).join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=frequencia.csv", "Cache-Control": "no-store" } });
}
