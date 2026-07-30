import Link from "next/link";
import { CalendarDays } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { formatDate } from "@/lib/format";
import {
  cancelMeeting,
  createMeeting,
  reopenMeeting,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    novo?: string;
    turma?: string;
    erro?: string;
    sucesso?: string;
  }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const classScope = catechistClassFilter(session);
  const [meetings, classes] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        deletedAt: null,
        classId: query.turma || undefined,
        class: classScope,
      },
      include: {
        class: true,
        responsible: true,
        _count: { select: { attendances: true } },
      },
      orderBy: { date: "desc" },
      take: 50,
    }),
    query.novo
      ? prisma.class.findMany({
          where: { deletedAt: null, status: "ACTIVE", ...classScope },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AppShell current="/encontros">
      <PageHeader
        title="Encontros"
        description="Planeje conteúdos e acompanhe cada chamada"
        action={
          <Link
            className="btn btn-primary"
            href={`/encontros?novo=1${query.turma ? `&turma=${query.turma}` : ""}`}
          >
            + Novo encontro
          </Link>
        }
      />
      {query.erro && (
        <div className="alert error">
          {query.erro === "sem-permissao"
            ? "Você não está vinculado a esta turma."
            : query.erro === "encerrado"
              ? "Encontros encerrados não podem ser cancelados."
              : "Revise os dados ou a situação do encontro."}
        </div>
      )}
      {query.sucesso && (
        <div className="alert success">Operação concluída com sucesso.</div>
      )}
      {query.novo && (
        <form action={createMeeting} className="card form-card" style={{ marginBottom: 18 }}>
          <section className="form-section">
            <h2>Planejar encontro</h2>
            <div className="form-grid">
              <div className="field">
                <label>Turma *</label>
                <select name="classId" defaultValue={query.turma || ""} required>
                  <option value="">Selecione</option>
                  {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Data *</label><input name="date" type="date" required /></div>
              <div className="field"><label>Início *</label><input name="startTime" type="time" required /></div>
              <div className="field"><label>Término</label><input name="endTime" type="time" /></div>
              <div className="field full"><label>Tema *</label><input name="theme" required placeholder="Ex.: O amor de Deus" /></div>
              <div className="field full"><label>Conteúdo ministrado</label><textarea name="content" /></div>
              <div className="field">
                <label>Situação</label>
                <select name="status" defaultValue="SCHEDULED">
                  <option value="SCHEDULED">Agendado</option>
                  <option value="IN_PROGRESS">Em andamento</option>
                </select>
              </div>
            </div>
          </section>
          <div className="form-actions">
            <Link href="/encontros" className="btn btn-secondary">Cancelar</Link>
            <button className="btn btn-primary">Salvar e abrir chamada</button>
          </div>
        </form>
      )}
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Encontro</th><th>Turma</th><th>Data</th><th>Responsável</th>
              <th>Registros</th><th>Situação</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map(meeting => (
              <tr key={meeting.id}>
                <td><div className="person"><div className="stat-icon"><CalendarDays size={15} /></div><strong>{meeting.theme}</strong></div></td>
                <td>{meeting.class.name}</td>
                <td>{formatDate(meeting.date)} às {meeting.startTime}</td>
                <td>{meeting.responsible.name}</td>
                <td>{meeting._count.attendances}</td>
                <td><StatusBadge status={meeting.status} /></td>
                <td>
                  <div className="row-actions">
                    <Link className="btn btn-secondary" href={`/presencas/${meeting.id}`}>Abrir chamada</Link>
                    {session.role !== "CATECHIST" && ["SCHEDULED", "IN_PROGRESS"].includes(meeting.status) && (
                      <form action={cancelMeeting.bind(null, meeting.id)}>
                        <button className="btn btn-secondary">Cancelar</button>
                      </form>
                    )}
                    {session.role !== "CATECHIST" && ["CLOSED", "CANCELLED"].includes(meeting.status) && (
                      <form action={reopenMeeting.bind(null, meeting.id)}>
                        <button className="btn btn-secondary">Reabrir</button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!meetings.length && <div className="empty">Nenhum encontro disponível.</div>}
      </div>
    </AppShell>
  );
}
