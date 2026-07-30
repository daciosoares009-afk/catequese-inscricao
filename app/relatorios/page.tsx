import { Download } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { frequencySummary } from "@/utils/frequency";

export const dynamic = "force-dynamic";
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const classScope = catechistClassFilter(session);
  const [classes, rows, attendances] = await Promise.all([
    prisma.class.findMany({ where: { deletedAt: null, ...classScope }, orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({ where: { status: "ACTIVE", classId: query.classId || undefined, class: classScope }, include: { catechumen: true, class: true }, orderBy: { catechumen: { fullName: "asc" } } }),
    prisma.attendance.findMany({ where: { classId: query.classId || undefined, class: classScope, meeting: { status: "CLOSED", deletedAt: null } }, select: { catechumenId: true, classId: true, status: true } }),
  ]);
  return <AppShell current="/relatorios"><PageHeader title="Relatórios" description="Frequência consolidada por aluno e turma" action={<div style={{ display: "flex", gap: 8 }}><a className="btn btn-secondary" href={`/api/relatorios/frequencia${query.classId ? `?classId=${query.classId}` : ""}`}><Download size={15} />CSV</a><PrintButton label="Imprimir" /></div>} />
    <form className="toolbar no-print"><select className="btn btn-secondary" name="classId" defaultValue={query.classId || ""}><option value="">Todas as turmas</option>{classes.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><button className="btn btn-primary">Aplicar filtro</button></form>
    <div className="card table-wrap"><table className="table"><thead><tr><th>Catequizando</th><th>Turma</th><th>Presenças</th><th>Faltas</th><th>Frequência</th><th>Situação</th></tr></thead><tbody>{rows.map(enrollment => { const own = attendances.filter(a => a.catechumenId === enrollment.catechumenId && a.classId === enrollment.classId); const summary = frequencySummary(own.map(a => a.status)); return <tr key={enrollment.id}><td><strong>{enrollment.catechumen.fullName}</strong></td><td>{enrollment.class.name}</td><td>{summary.present}</td><td>{summary.absent}</td><td><strong>{summary.rate}%</strong></td><td><StatusBadge status={summary.total > 0 && summary.rate < 75 ? "ABSENT" : "ACTIVE"} /></td></tr>; })}</tbody></table>{!rows.length && <div className="empty">Nenhum dado para o filtro.</div>}</div>
  </AppShell>;
}
