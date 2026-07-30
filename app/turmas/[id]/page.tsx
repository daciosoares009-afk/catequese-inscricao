import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { enrollStudent } from "../actions";

export const dynamic = "force-dynamic";

export default async function ClassDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ matricular?: string; erro?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const session = await requireSession();
  const [item, available] = await Promise.all([
    prisma.class.findFirst({
      where: { id, deletedAt: null, ...catechistClassFilter(session) },
      include: {
        community: true,
        parish: true,
        sacrament: true,
        stage: true,
        enrollments: { where: { status: "ACTIVE" }, include: { catechumen: true }, orderBy: { catechumen: { fullName: "asc" } } },
        meetings: { where: { deletedAt: null }, orderBy: { date: "desc" }, take: 8 },
        catechists: { include: { catechist: { include: { user: true } } } },
      },
    }),
    prisma.catechumen.findMany({ where: { deletedAt: null, status: { in: ["WAITING", "ACTIVE"] } }, orderBy: { fullName: "asc" } }),
  ]);
  if (!item) notFound();
  return <AppShell current="/turmas">
    <PageHeader title={item.name} description={`${item.sacrament.name} • ${item.stage.name} • ${item.year}`} action={<div style={{ display: "flex", gap: 8 }}><Link href={`/encontros?turma=${item.id}&novo=1`} className="btn btn-secondary">+ Encontro</Link>{session.role !== "CATECHIST" && <Link href={`/turmas/${id}?matricular=1`} className="btn btn-primary">+ Matricular</Link>}</div>} />
    {query.erro && <div className="alert error">{query.erro === "turma-lotada" ? "A turma atingiu o limite de alunos." : "Não foi possível concluir a matrícula."}</div>}
    {query.matricular && session.role !== "CATECHIST" && <form action={enrollStudent.bind(null, id)} className="card form-card" style={{ marginBottom: 18 }}><div className="form-grid"><div className="field"><label>Catequizando</label><select name="catechumenId" required><option value="">Selecione</option>{available.map(x => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select></div><div style={{ display: "flex", alignItems: "end", gap: 8 }}><button className="btn btn-primary">Confirmar matrícula</button><Link className="btn btn-secondary" href={`/turmas/${id}`}>Cancelar</Link></div></div></form>}
    <div className="grid-stats"><div className="card stat"><div className="stat-label">Catequizandos</div><div className="stat-value">{item.enrollments.length}/{item.capacity}</div></div><div className="card stat"><div className="stat-label">Encontros</div><div className="stat-value">{item.meetings.length}</div></div><div className="card stat"><div className="stat-label">Horário</div><div className="stat-value" style={{ fontSize: 21 }}>{item.startTime}</div></div><div className="card stat"><div className="stat-label">Situação</div><div style={{ marginTop: 12 }}><StatusBadge status={item.status} /></div></div></div>
    <div className="dashboard-grid"><section className="card"><div className="card-head"><h2>Alunos matriculados</h2><span className="badge blue">{item.enrollments.length} alunos</span></div><div className="table-wrap"><table className="table"><thead><tr><th>Nome</th><th>Situação</th><th>Matrícula</th><th></th></tr></thead><tbody>{item.enrollments.map(e => <tr key={e.id}><td><div className="person"><div className="person-avatar">{e.catechumen.fullName.slice(0, 2).toUpperCase()}</div><strong>{e.catechumen.fullName}</strong></div></td><td><StatusBadge status={e.catechumen.status} /></td><td>{formatDate(e.enrolledAt)}</td><td><Link className="btn btn-secondary" href={`/catequizandos/${e.catechumenId}`}>Perfil</Link></td></tr>)}</tbody></table>{!item.enrollments.length && <div className="empty">Nenhum aluno matriculado.</div>}</div></section>
      <section className="card"><div className="card-head"><h2>Encontros recentes</h2></div><div className="card-body list">{item.meetings.map(m => <div className="list-row" key={m.id}><div className="grow"><strong>{m.theme}</strong><small>{formatDate(m.date)} • {m.startTime}</small></div><StatusBadge status={m.status} /></div>)}{!item.meetings.length && <div className="empty">Nenhum encontro.</div>}</div></section></div>
  </AppShell>;
}
