import { AlertTriangle, BarChart3, Download, Search, TrendingUp, UserCheck, Users } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { PrintButton } from "@/components/print-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { frequencySummary } from "@/utils/frequency";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ classId?: string; q?: string; sacramentId?: string; inicio?: string; fim?: string }> }) {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const query = await searchParams;
  const classScope = catechistClassFilter(session);
  const date = query.inicio || query.fim ? { gte: query.inicio ? new Date(`${query.inicio}T00:00:00.000Z`) : undefined, lte: query.fim ? new Date(`${query.fim}T23:59:59.999Z`) : undefined } : undefined;
  const [classes, sacraments, rows, attendances] = await Promise.all([
    prisma.class.findMany({ where: { deletedAt: null, ...classScope }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.sacrament.findMany({ where: { deletedAt: null, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.enrollment.findMany({ where: { status: "ACTIVE", classId: query.classId || undefined, class: { ...classScope, sacramentId: query.sacramentId || undefined }, catechumen: { fullName: query.q ? { contains: query.q, mode: "insensitive" } : undefined } }, include: { catechumen: true, class: { include: { sacrament: true } } }, orderBy: { catechumen: { fullName: "asc" } } }),
    prisma.attendance.findMany({ where: { classId: query.classId || undefined, class: { ...classScope, sacramentId: query.sacramentId || undefined }, meeting: { status: "CLOSED", deletedAt: null, date } }, select: { catechumenId: true, classId: true, status: true } }),
  ]);
  const summaries = rows.map(enrollment => {
    const own = attendances.filter(record => record.catechumenId === enrollment.catechumenId && record.classId === enrollment.classId);
    return { enrollment, summary: frequencySummary(own.map(record => record.status)) };
  });
  const overall = frequencySummary(attendances.map(record => record.status));
  const atRisk = summaries.filter(item => item.summary.total > 0 && item.summary.rate < 75);
  const noRecords = summaries.filter(item => item.summary.total === 0).length;
  const hasFilters = Boolean(query.classId || query.q || query.sacramentId || query.inicio || query.fim);

  return <AppShell current="/relatorios">
    <PageHeader title="Relatórios" description="Frequência consolidada com dados dos encontros encerrados" action={<div className="page-action-group"><a className="btn btn-secondary" href={`/api/relatorios/frequencia${query.classId ? `?classId=${query.classId}` : ""}`}><Download size={15} /> Exportar CSV</a><PrintButton label="Imprimir" /></div>} />
    <form className="toolbar filter-bar no-print" aria-label="Filtros do relatório"><div className="search"><span><Search size={16} /></span><input name="q" defaultValue={query.q} placeholder="Buscar catequizando..." /></div><div className="filter-field"><label htmlFor="report-class">Turma</label><select id="report-class" name="classId" defaultValue={query.classId || ""}><option value="">Todas as turmas</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="filter-field"><label htmlFor="report-sacrament">Sacramento</label><select id="report-sacrament" name="sacramentId" defaultValue={query.sacramentId || ""}><option value="">Todos</option>{sacraments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="filter-field"><label htmlFor="report-start">De</label><input id="report-start" name="inicio" type="date" defaultValue={query.inicio} /></div><div className="filter-field"><label htmlFor="report-end">Até</label><input id="report-end" name="fim" type="date" defaultValue={query.fim} /></div><button className="btn btn-primary">Aplicar</button>{hasFilters && <a href="/relatorios" className="btn btn-secondary">Limpar</a>}</form>

    <section className="metrics-grid report-metrics"><StatCard icon={Users} label="Catequizandos" value={summaries.length} context="Matrículas no filtro" /><StatCard icon={TrendingUp} tone="blue" label="Frequência média" value={`${overall.rate}%`} context={`${overall.total} registros considerados`} /><StatCard icon={AlertTriangle} tone="rose" label="Abaixo de 75%" value={atRisk.length} context="Precisam de acompanhamento" /><StatCard icon={UserCheck} tone="gold" label="Sem registros" value={noRecords} context="Ainda sem encontro encerrado" /></section>

    <div className="report-grid"><section className="card report-chart-card"><div className="card-head"><div><h2>Distribuição de frequência</h2><small>Visão individual no período selecionado</small></div></div><div className="report-bars">{summaries.slice(0, 12).map(({ enrollment, summary }) => <div key={enrollment.id}><span title={enrollment.catechumen.fullName}>{enrollment.catechumen.fullName}</span><div><i style={{ width: `${summary.rate}%` }} className={summary.total && summary.rate < 75 ? "risk" : ""} /></div><strong>{summary.rate}%</strong></div>)}{!summaries.length && <EmptyState icon={BarChart3} title="Sem dados para o gráfico" />}</div></section><section className="card risk-report-card"><div className="card-head"><div><h2>Atenção pastoral</h2><small>Catequizandos abaixo de 75%</small></div><span className="badge danger">{atRisk.length}</span></div><div className="card-body list">{atRisk.slice(0, 8).map(({ enrollment, summary }) => <div className="list-row" key={enrollment.id}><UserAvatar name={enrollment.catechumen.fullName} size="sm" /><div className="grow"><strong>{enrollment.catechumen.fullName}</strong><small>{enrollment.class.name}</small></div><span className="badge danger">{summary.rate}%</span></div>)}{!atRisk.length && <EmptyState icon={UserCheck} title="Nenhum alerta" description="Todos os registros estão dentro da meta ou ainda sem dados." />}</div></section></div>

    <section className="card table-wrap report-table"><table className="table"><thead><tr><th>Catequizando</th><th>Turma</th><th>Sacramento</th><th>Comparecimentos</th><th>Faltas</th><th>Frequência</th><th>Situação</th></tr></thead><tbody>{summaries.map(({ enrollment, summary }) => <tr key={enrollment.id}><td><div className="person"><UserAvatar name={enrollment.catechumen.fullName} /><strong>{enrollment.catechumen.fullName}</strong></div></td><td>{enrollment.class.name}</td><td>{enrollment.class.sacrament.name}</td><td>{summary.present}</td><td>{summary.absent}</td><td><strong>{summary.rate}%</strong></td><td><StatusBadge status={summary.total > 0 && summary.rate < 75 ? "ABSENT" : summary.total ? "ACTIVE" : "WAITING"} /></td></tr>)}</tbody></table>{!summaries.length && <EmptyState icon={BarChart3} title="Nenhum dado encontrado" description="Ajuste os filtros para consultar outro período." />}</section>
  </AppShell>;
}
