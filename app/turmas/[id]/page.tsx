import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarDays, Clock3, MapPin, UserPlus, Users } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { SubmitButton } from "@/components/ui/submit-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { frequencySummary } from "@/utils/frequency";
import { assignCatechist, enrollStudent } from "../actions";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ matricular?: string; equipe?: string; erro?: string; sucesso?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const session = await requireSession();
  const canManage = session.role !== "CATECHIST";
  const [item, available, catechists, attendances] = await Promise.all([
    prisma.class.findFirst({
      where: { id, deletedAt: null, ...catechistClassFilter(session) },
      include: {
        community: true, parish: true, sacrament: true, stage: true,
        enrollments: { where: { status: "ACTIVE" }, include: { catechumen: true }, orderBy: { catechumen: { fullName: "asc" } } },
        meetings: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 12 },
        catechists: { include: { catechist: { include: { user: true } } } },
      },
    }),
    query.matricular && canManage ? prisma.catechumen.findMany({ where: { deletedAt: null, status: { in: ["WAITING", "ACTIVE"] } }, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }) : Promise.resolve([]),
    query.equipe && canManage ? prisma.catechist.findMany({ where: { deletedAt: null, user: { active: true, deletedAt: null } }, include: { user: true }, orderBy: { user: { name: "asc" } } }) : Promise.resolve([]),
    prisma.attendance.findMany({ where: { classId: id, meeting: { status: "CLOSED", deletedAt: null } }, select: { status: true } }),
  ]);
  if (!item) notFound();
  const frequency = frequencySummary(attendances.map(record => record.status));
  const upcoming = item.meetings.filter(meeting => meeting.date >= new Date() && ["SCHEDULED", "IN_PROGRESS"].includes(meeting.status)).sort((a, b) => a.date.getTime() - b.date.getTime());

  return <AppShell current="/turmas">
    <PageHeader title={item.name} description={`${item.sacrament.name} · ${item.stage.name} · ${item.year}`} action={<div className="page-action-group"><Link href={`/encontros?turma=${item.id}&novo=1`} className="btn btn-secondary">+ Encontro</Link>{canManage && <Link href={`/turmas/${id}?equipe=1`} className="btn btn-secondary"><UserPlus size={15} /> Catequista</Link>}{canManage && <Link href={`/turmas/${id}?matricular=1`} className="btn btn-primary">+ Matricular</Link>}</div>} />
    {query.erro && <div className="alert error" role="alert">{query.erro === "turma-lotada" ? "A turma atingiu o limite de catequizandos." : query.erro === "catequista" ? "Não foi possível atribuir o catequista." : "Não foi possível concluir a matrícula."}</div>}
    {query.sucesso && <div className="alert success" role="status">Equipe pastoral atualizada com sucesso.</div>}

    {query.matricular && canManage && <form action={enrollStudent.bind(null, id)} className="card form-card form-reveal"><section className="form-section"><h2>Matricular catequizando</h2><p className="form-section-intro">Se houver matrícula ativa em outra turma, a transferência será registrada no histórico.</p><div className="form-grid"><div className="field full"><label htmlFor="enrollment-student">Catequizando</label><select id="enrollment-student" name="catechumenId" required><option value="">Selecione</option>{available.map(item => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></div></div></section><div className="form-actions"><Link className="btn btn-secondary" href={`/turmas/${id}`}>Cancelar</Link><SubmitButton pendingLabel="Matriculando...">Confirmar matrícula</SubmitButton></div></form>}
    {query.equipe && canManage && <form action={assignCatechist.bind(null, id)} className="card form-card form-reveal"><section className="form-section"><h2>Atribuir catequista</h2><p className="form-section-intro">O catequista passará a visualizar esta turma e seus encontros.</p><div className="form-grid"><div className="field full"><label htmlFor="class-catechist">Catequista</label><select id="class-catechist" name="catechistId" required><option value="">Selecione</option>{catechists.map(item => <option key={item.id} value={item.id}>{item.user.name}</option>)}</select></div></div></section><div className="form-actions"><Link className="btn btn-secondary" href={`/turmas/${id}`}>Cancelar</Link><SubmitButton pendingLabel="Atribuindo...">Adicionar à equipe</SubmitButton></div></form>}

    <section className="class-overview card"><div><span className="class-icon"><BookOpen size={24} /></span><div><strong>{item.community.name}</strong><small><MapPin size={12} /> {item.location} · {item.parish.name}</small></div></div><div className="class-team"><span>Equipe</span>{item.catechists.length ? item.catechists.map(link => <div key={link.catechistId}><UserAvatar name={link.catechist.user.name} size="sm" /><strong>{link.catechist.user.name}</strong></div>) : <small>Nenhum catequista atribuído</small>}</div><StatusBadge status={item.status} /></section>

    <section className="metrics-grid"><StatCard icon={Users} label="Catequizandos" value={`${item.enrollments.length}/${item.capacity}`} context="Matrículas ativas" /><StatCard icon={CalendarDays} tone="gold" label="Encontros" value={item.meetings.length} context={`${upcoming.length} próximo(s)`} /><StatCard icon={Clock3} tone="blue" label="Frequência média" value={`${frequency.rate}%`} context={`${frequency.total} registros encerrados`} /><StatCard icon={MapPin} tone="rose" label="Horário" value={item.startTime} context={["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][item.weekday]} /></section>

    <div className="dashboard-grid class-detail-grid"><section className="card"><div className="card-head"><div><h2>Catequizandos matriculados</h2><small>{item.enrollments.length} vínculo(s) ativo(s)</small></div></div><div className="table-wrap"><table className="table"><thead><tr><th>Catequizando</th><th>Status</th><th>Matrícula</th><th></th></tr></thead><tbody>{item.enrollments.map(enrollment => <tr key={enrollment.id}><td><div className="person"><UserAvatar name={enrollment.catechumen.fullName} /><strong>{enrollment.catechumen.fullName}</strong></div></td><td><StatusBadge status={enrollment.catechumen.status} /></td><td>{formatDate(enrollment.enrolledAt)}</td><td><Link className="btn btn-secondary" href={`/catequizandos/${enrollment.catechumenId}`}>Perfil</Link></td></tr>)}</tbody></table>{!item.enrollments.length && <EmptyState icon={Users} title="Turma sem catequizandos" description="Use o botão Matricular para adicionar o primeiro cadastro." />}</div></section>
      <section className="card"><div className="card-head"><div><h2>Próximos encontros</h2><small>Agenda desta turma</small></div><Link href={`/encontros?turma=${id}`}>Ver agenda</Link></div><div className="card-body list">{upcoming.slice(0, 5).map(meeting => <Link className="list-row list-row-link" href={`/presencas/${meeting.id}`} key={meeting.id}><span className="stat-icon"><CalendarDays size={15} /></span><div className="grow"><strong>{meeting.theme}</strong><small>{formatDate(meeting.date)} · {meeting.startTime}</small></div><StatusBadge status={meeting.status} /></Link>)}{!upcoming.length && <EmptyState icon={CalendarDays} title="Sem próximos encontros" description="Planeje o próximo encontro desta turma." action={<Link href={`/encontros?turma=${id}&novo=1`} className="btn btn-secondary">Planejar encontro</Link>} />}</div></section></div>
  </AppShell>;
}
