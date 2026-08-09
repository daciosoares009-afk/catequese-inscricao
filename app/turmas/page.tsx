import Link from "next/link";
import { BookOpen, CalendarDays, Clock, MapPin, Search, Users } from "lucide-react";
import type { ClassStatus } from "@prisma/client";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { createClass } from "./actions";

export const dynamic = "force-dynamic";
const statuses: ClassStatus[] = ["ACTIVE", "PLANNED", "CLOSED", "CANCELLED"];
const weekday = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ novo?: string; erro?: string; q?: string; year?: string; status?: string; sacramentId?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const canManage = session.role !== "CATECHIST";
  const loadFormOptions = Boolean(query.novo && canManage);
  const year = query.year && /^\d{4}$/.test(query.year) ? Number(query.year) : undefined;
  const status = statuses.includes(query.status as ClassStatus) ? query.status as ClassStatus : undefined;
  const classScope = catechistClassFilter(session);
  const [rows, parishes, communities, sacraments, stages, classYears] = await Promise.all([
    prisma.class.findMany({ where: { deletedAt: null, name: query.q ? { contains: query.q, mode: "insensitive" } : undefined, year, status, sacramentId: query.sacramentId || undefined, ...classScope }, include: { community: true, sacrament: true, stage: true, catechists: { include: { catechist: { include: { user: true } } } }, _count: { select: { enrollments: { where: { status: "ACTIVE" } }, meetings: true } } }, orderBy: [{ year: "desc" }, { name: "asc" }] }),
    loadFormOptions ? prisma.parish.findMany({ where: { deletedAt: null } }) : Promise.resolve([]),
    loadFormOptions ? prisma.community.findMany({ where: { deletedAt: null } }) : Promise.resolve([]),
    prisma.sacrament.findMany({ where: { deletedAt: null, active: true }, orderBy: { name: "asc" } }),
    loadFormOptions ? prisma.stage.findMany({ where: { deletedAt: null } }) : Promise.resolve([]),
    prisma.class.findMany({ where: { deletedAt: null, ...classScope }, distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } }),
  ]);
  const hasFilters = Boolean(query.q || query.year || query.status || query.sacramentId);

  return <AppShell current="/turmas">
    <PageHeader title="Turmas" description="Organize equipes, etapas, matrículas e encontros" action={canManage ? <Link className="btn btn-primary" href="/turmas?novo=1">+ Nova turma</Link> : undefined} />
    {query.erro && <div className="alert error" role="alert">{query.erro === "vinculos-invalidos" ? "Comunidade, paróquia, sacramento ou etapa incompatíveis." : "Revise os dados informados."}</div>}
    <form className="toolbar filter-bar"><div className="search"><span><Search size={16} /></span><input name="q" defaultValue={query.q} placeholder="Buscar turma..." aria-label="Buscar turma" /></div><div className="filter-field"><label htmlFor="class-year">Ano</label><select id="class-year" name="year" defaultValue={query.year || ""}><option value="">Todos</option>{classYears.map(item => <option key={item.year}>{item.year}</option>)}</select></div><div className="filter-field"><label htmlFor="class-sacrament">Sacramento</label><select id="class-sacrament" name="sacramentId" defaultValue={query.sacramentId || ""}><option value="">Todos</option>{sacraments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="filter-field"><label htmlFor="class-status">Status</label><select id="class-status" name="status" defaultValue={query.status || ""}><option value="">Todos</option><option value="ACTIVE">Ativas</option><option value="PLANNED">Planejadas</option><option value="CLOSED">Encerradas</option><option value="CANCELLED">Canceladas</option></select></div><button className="btn btn-primary">Filtrar</button>{hasFilters && <Link href="/turmas" className="btn btn-secondary">Limpar</Link>}</form>

    {query.novo && canManage && <form action={createClass} className="card form-card form-reveal"><section className="form-section"><h2>Dados da turma</h2><p className="form-section-intro">Organize local, etapa, capacidade e período pastoral.</p><div className="form-grid">
      <div className="field"><label htmlFor="class-name">Nome *</label><input id="class-name" name="name" required placeholder="Eucaristia I — Sábado" /></div><div className="field"><label htmlFor="class-new-year">Ano *</label><input id="class-new-year" name="year" type="number" defaultValue={new Date().getFullYear()} required /></div>
      <div className="field"><label htmlFor="class-parish">Paróquia *</label><select id="class-parish" name="parishId" required><option value="">Selecione</option>{parishes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="class-community">Comunidade *</label><select id="class-community" name="communityId" required><option value="">Selecione</option>{communities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="field"><label htmlFor="class-sacrament-new">Sacramento *</label><select id="class-sacrament-new" name="sacramentId" required><option value="">Selecione</option>{sacraments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="field"><label htmlFor="class-stage">Etapa *</label><select id="class-stage" name="stageId" required><option value="">Selecione</option>{stages.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="field"><label htmlFor="class-weekday">Dia da semana</label><select id="class-weekday" name="weekday"><option value="6">Sábado</option><option value="0">Domingo</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option></select></div><div className="field"><label htmlFor="class-time">Horário</label><input id="class-time" type="time" name="startTime" required /></div><div className="field"><label htmlFor="class-location">Local</label><input id="class-location" name="location" required /></div><div className="field"><label htmlFor="class-capacity">Limite de catequizandos</label><input id="class-capacity" name="capacity" type="number" min="1" max="500" defaultValue="25" /></div>
      <div className="field"><label htmlFor="class-start">Data de início</label><input id="class-start" name="startsAt" type="date" required /></div><div className="field"><label htmlFor="class-end">Conclusão prevista</label><input id="class-end" name="expectedEndAt" type="date" /></div><div className="field"><label htmlFor="class-new-status">Situação</label><select id="class-new-status" name="status" defaultValue="PLANNED"><option value="PLANNED">Planejada</option><option value="ACTIVE">Ativa</option></select></div>
    </div></section><div className="form-actions"><Link href="/turmas" className="btn btn-secondary">Cancelar</Link><SubmitButton pendingLabel="Criando turma...">Criar turma</SubmitButton></div></form>}

    <section className="class-card-grid">{rows.map(row => <Link key={row.id} href={`/turmas/${row.id}`} className="class-card interactive-card"><div className="class-card-head"><span className="class-card-icon"><BookOpen size={20} /></span><StatusBadge status={row.status} /></div><div className="class-card-copy"><span>{row.sacrament.name} · {row.stage.name}</span><h2>{row.name}</h2><p><MapPin size={13} /> {row.community.name} · {row.location}</p></div><div className="class-card-meta"><span><Users size={14} /><strong>{row._count.enrollments}/{row.capacity}</strong> catequizandos</span><span><Clock size={14} /><strong>{weekday[row.weekday]}, {row.startTime}</strong></span><span><CalendarDays size={14} /><strong>{row._count.meetings}</strong> encontros</span></div><div className="class-card-team">{row.catechists.slice(0, 3).map(link => <UserAvatar key={link.catechistId} name={link.catechist.user.name} size="sm" />)}<span>{row.catechists.length ? row.catechists.map(link => link.catechist.user.name).join(", ") : "Sem catequista atribuído"}</span></div></Link>)}</section>
    {!rows.length && <section className="card"><EmptyState icon={BookOpen} title="Nenhuma turma encontrada" description="Ajuste os filtros ou crie uma nova turma." action={canManage ? <Link href="/turmas?novo=1" className="btn btn-primary">Nova turma</Link> : undefined} /></section>}
  </AppShell>;
}
