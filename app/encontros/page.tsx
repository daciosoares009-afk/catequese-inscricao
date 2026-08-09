import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { MeetingStatus } from "@prisma/client";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { cancelMeeting, createMeeting, reopenMeeting } from "./actions";

export const dynamic = "force-dynamic";
const allowedStatuses: MeetingStatus[] = ["SCHEDULED", "IN_PROGRESS", "CLOSED", "CANCELLED"];

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ novo?: string; turma?: string; status?: string; inicio?: string; fim?: string; erro?: string; sucesso?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const classScope = catechistClassFilter(session);
  const status = allowedStatuses.includes(query.status as MeetingStatus) ? query.status as MeetingStatus : undefined;
  const date = query.inicio || query.fim ? { gte: query.inicio ? new Date(`${query.inicio}T00:00:00.000Z`) : undefined, lte: query.fim ? new Date(`${query.fim}T23:59:59.999Z`) : undefined } : undefined;
  const [meetings, classes] = await Promise.all([
    prisma.meeting.findMany({
      where: { deletedAt: null, classId: query.turma || undefined, status, date, class: classScope },
      include: { class: true, responsible: true, _count: { select: { attendances: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.class.findMany({ where: { deletedAt: null, status: "ACTIVE", ...classScope }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const hasFilters = Boolean(query.turma || query.status || query.inicio || query.fim);

  return <AppShell current="/encontros">
    <PageHeader title="Encontros" description="Planeje conteúdos, acompanhe a agenda e abra a chamada" action={<Link className="btn btn-primary" href={`/encontros?novo=1${query.turma ? `&turma=${query.turma}` : ""}`}>+ Novo encontro</Link>} />
    {query.erro && <div className="alert error" role="alert">{query.erro === "sem-permissao" ? "Você não está vinculado a esta turma." : query.erro === "encerrado" ? "Encontros encerrados não podem ser cancelados." : "Revise os dados ou a situação do encontro."}</div>}
    {query.sucesso && <div className="alert success" role="status">Operação concluída com sucesso.</div>}

    <form className="toolbar filter-bar" aria-label="Filtros de encontros">
      <div className="filter-field"><label htmlFor="meeting-class">Turma</label><select id="meeting-class" name="turma" defaultValue={query.turma || ""}><option value="">Todas as turmas</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="filter-field"><label htmlFor="meeting-status">Status</label><select id="meeting-status" name="status" defaultValue={query.status || ""}><option value="">Todos</option><option value="SCHEDULED">Agendados</option><option value="IN_PROGRESS">Em andamento</option><option value="CLOSED">Realizados</option><option value="CANCELLED">Cancelados</option></select></div>
      <div className="filter-field"><label htmlFor="meeting-start">De</label><input id="meeting-start" type="date" name="inicio" defaultValue={query.inicio} /></div>
      <div className="filter-field"><label htmlFor="meeting-end">Até</label><input id="meeting-end" type="date" name="fim" defaultValue={query.fim} /></div>
      <button className="btn btn-primary">Aplicar filtros</button>{hasFilters && <Link className="btn btn-secondary" href="/encontros">Limpar</Link>}
    </form>

    {query.novo && <form action={createMeeting} className="card form-card form-reveal">
      <section className="form-section"><h2>Planejar encontro</h2><p className="form-section-intro">Defina o tema, o horário e a turma responsável.</p><div className="form-grid">
        <div className="field"><label htmlFor="new-meeting-class">Turma *</label><select id="new-meeting-class" name="classId" defaultValue={query.turma || ""} required><option value="">Selecione</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label htmlFor="new-meeting-date">Data *</label><input id="new-meeting-date" name="date" type="date" required /></div>
        <div className="field"><label htmlFor="new-meeting-start">Início *</label><input id="new-meeting-start" name="startTime" type="time" required /></div>
        <div className="field"><label htmlFor="new-meeting-end">Término</label><input id="new-meeting-end" name="endTime" type="time" /></div>
        <div className="field full"><label htmlFor="new-meeting-theme">Tema *</label><input id="new-meeting-theme" name="theme" required placeholder="Ex.: O amor de Deus" /></div>
        <div className="field full"><label htmlFor="new-meeting-content">Conteúdo ministrado</label><textarea id="new-meeting-content" name="content" /></div>
        <div className="field"><label htmlFor="new-meeting-status">Situação</label><select id="new-meeting-status" name="status" defaultValue="SCHEDULED"><option value="SCHEDULED">Agendado</option><option value="IN_PROGRESS">Em andamento</option></select></div>
      </div></section>
      <div className="form-actions"><Link href="/encontros" className="btn btn-secondary">Cancelar</Link><SubmitButton pendingLabel="Salvando encontro...">Salvar e abrir chamada</SubmitButton></div>
    </form>}

    {!!meetings.length && <section className="meeting-calendar" aria-label="Calendário de encontros">{meetings.slice(0, 12).map(meeting => <Link href={`/presencas/${meeting.id}`} key={meeting.id} className={`meeting-calendar-item status-${meeting.status.toLowerCase()}`}><time dateTime={meeting.date.toISOString()}><strong>{String(meeting.date.getUTCDate()).padStart(2, "0")}</strong><span>{meeting.date.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }).replace(".", "")}</span></time><div><strong>{meeting.theme}</strong><small>{meeting.class.name} · {meeting.startTime}</small></div><StatusBadge status={meeting.status} /></Link>)}</section>}

    <section className="card table-wrap"><table className="table"><thead><tr><th>Encontro</th><th>Turma</th><th>Data e hora</th><th>Responsável</th><th>Registros</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      {meetings.map(meeting => <tr key={meeting.id}><td><div className="person"><div className="stat-icon"><CalendarDays size={15} /></div><strong>{meeting.theme}</strong></div></td><td>{meeting.class.name}</td><td>{formatDate(meeting.date)} às {meeting.startTime}</td><td>{meeting.responsible.name}</td><td>{meeting._count.attendances}</td><td><StatusBadge status={meeting.status} /></td><td><div className="row-actions"><Link className="btn btn-secondary" href={`/presencas/${meeting.id}`}>Abrir chamada</Link>{session.role !== "CATECHIST" && ["SCHEDULED", "IN_PROGRESS"].includes(meeting.status) && <form action={cancelMeeting.bind(null, meeting.id)}><ConfirmSubmitButton message={`Cancelar o encontro “${meeting.theme}”?`}>Cancelar</ConfirmSubmitButton></form>}{session.role !== "CATECHIST" && ["CLOSED", "CANCELLED"].includes(meeting.status) && <form action={reopenMeeting.bind(null, meeting.id)}><SubmitButton className="btn btn-secondary" pendingLabel="Reabrindo...">Reabrir</SubmitButton></form>}</div></td></tr>)}
    </tbody></table>{!meetings.length && <EmptyState icon={CalendarDays} title="Nenhum encontro encontrado" description="Ajuste os filtros ou planeje um novo encontro." action={<Link href="/encontros?novo=1" className="btn btn-primary">Novo encontro</Link>} />}</section>
  </AppShell>;
}
