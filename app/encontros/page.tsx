import Link from "next/link";
import { CalendarDays } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { createMeeting } from "./actions";

export const dynamic = "force-dynamic";
export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ novo?: string; turma?: string; erro?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const classScope = catechistClassFilter(session);
  const [meetings, classes] = await Promise.all([
    prisma.meeting.findMany({ where: { deletedAt: null, classId: query.turma || undefined, class: classScope }, include: { class: true, responsible: true, _count: { select: { attendances: true } } }, orderBy: { date: "desc" }, take: 50 }),
    prisma.class.findMany({ where: { deletedAt: null, status: "ACTIVE", ...classScope }, orderBy: { name: "asc" } }),
  ]);
  return <AppShell current="/encontros">
    <PageHeader title="Encontros" description="Planeje conteúdos e acompanhe cada chamada" action={<Link className="btn btn-primary" href={`/encontros?novo=1${query.turma ? `&turma=${query.turma}` : ""}`}>+ Novo encontro</Link>} />
    {query.erro && <div className="alert error">{query.erro === "sem-permissao" ? "Você não está vinculado a esta turma." : "Revise os dados do encontro."}</div>}
    {query.novo && <form action={createMeeting} className="card form-card" style={{ marginBottom: 18 }}><section className="form-section"><h2>Planejar encontro</h2><div className="form-grid">
      <div className="field"><label>Turma *</label><select name="classId" defaultValue={query.turma || ""} required><option value="">Selecione</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="field"><label>Data *</label><input name="date" type="date" required /></div><div className="field"><label>Início *</label><input name="startTime" type="time" required /></div><div className="field"><label>Término</label><input name="endTime" type="time" /></div>
      <div className="field full"><label>Tema *</label><input name="theme" required placeholder="Ex.: O amor de Deus" /></div><div className="field full"><label>Conteúdo ministrado</label><textarea name="content" /></div><div className="field"><label>Situação</label><select name="status" defaultValue="SCHEDULED"><option value="SCHEDULED">Agendado</option><option value="IN_PROGRESS">Em andamento</option></select></div>
    </div></section><div className="form-actions"><Link href="/encontros" className="btn btn-secondary">Cancelar</Link><button className="btn btn-primary">Salvar e abrir chamada</button></div></form>}
    <div className="card table-wrap"><table className="table"><thead><tr><th>Encontro</th><th>Turma</th><th>Data</th><th>Responsável</th><th>Registros</th><th>Situação</th><th></th></tr></thead><tbody>{meetings.map(m => <tr key={m.id}><td><div className="person"><div className="stat-icon"><CalendarDays size={15} /></div><strong>{m.theme}</strong></div></td><td>{m.class.name}</td><td>{formatDate(m.date)} às {m.startTime}</td><td>{m.responsible.name}</td><td>{m._count.attendances}</td><td><StatusBadge status={m.status} /></td><td><Link className="btn btn-secondary" href={`/presencas/${m.id}`}>Abrir chamada</Link></td></tr>)}</tbody></table>{!meetings.length && <div className="empty">Nenhum encontro disponível.</div>}</div>
  </AppShell>;
}
