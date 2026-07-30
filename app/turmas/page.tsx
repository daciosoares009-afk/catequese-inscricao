import Link from "next/link";
import { BookOpen, Clock, MapPin, Users } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { createClass } from "./actions";

export const dynamic = "force-dynamic";
export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ novo?: string; erro?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const canManage = session.role !== "CATECHIST";
  const loadFormOptions = Boolean(query.novo && canManage);
  const [rows, parishes, communities, sacraments, stages] = await Promise.all([
    prisma.class.findMany({ where: { deletedAt: null, ...catechistClassFilter(session) }, include: { community: true, sacrament: true, stage: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } }, meetings: true } } }, orderBy: [{ year: "desc" }, { name: "asc" }] }),
    loadFormOptions ? prisma.parish.findMany({ where: { deletedAt: null } }) : Promise.resolve([]),
    loadFormOptions ? prisma.community.findMany({ where: { deletedAt: null } }) : Promise.resolve([]),
    loadFormOptions ? prisma.sacrament.findMany({ where: { deletedAt: null, active: true } }) : Promise.resolve([]),
    loadFormOptions ? prisma.stage.findMany({ where: { deletedAt: null } }) : Promise.resolve([]),
  ]);
  return <AppShell current="/turmas">
    <PageHeader title="Turmas" description="Organize etapas, catequistas e matrículas" action={canManage ? <Link className="btn btn-primary" href="/turmas?novo=1">+ Nova turma</Link> : undefined} />
    {query.erro && <div className="alert error">{query.erro === "vinculos-invalidos" ? "Comunidade, paróquia, sacramento ou etapa incompatíveis." : "Revise os dados informados."}</div>}
    {query.novo && canManage && <form action={createClass} className="card form-card" style={{ marginBottom: 18 }}><section className="form-section"><h2>Dados da turma</h2><div className="form-grid">
      <div className="field"><label>Nome *</label><input name="name" required placeholder="Eucaristia I — Sábado" /></div><div className="field"><label>Ano *</label><input name="year" type="number" defaultValue={new Date().getFullYear()} required /></div>
      <div className="field"><label>Paróquia *</label><select name="parishId" required><option value="">Selecione</option>{parishes.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="field"><label>Comunidade *</label><select name="communityId" required><option value="">Selecione</option>{communities.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="field"><label>Sacramento *</label><select name="sacramentId" required><option value="">Selecione</option>{sacraments.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="field"><label>Etapa *</label><select name="stageId" required><option value="">Selecione</option>{stages.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="field"><label>Dia da semana</label><select name="weekday"><option value="6">Sábado</option><option value="0">Domingo</option><option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option></select></div>
      <div className="field"><label>Horário</label><input type="time" name="startTime" required /></div><div className="field"><label>Local</label><input name="location" required /></div><div className="field"><label>Limite de alunos</label><input name="capacity" type="number" min="1" max="500" defaultValue="25" /></div>
      <div className="field"><label>Data de início</label><input name="startsAt" type="date" required /></div><div className="field"><label>Conclusão prevista</label><input name="expectedEndAt" type="date" /></div><div className="field"><label>Situação</label><select name="status" defaultValue="PLANNED"><option value="PLANNED">Planejada</option><option value="ACTIVE">Ativa</option></select></div>
    </div></section><div className="form-actions"><Link href="/turmas" className="btn btn-secondary">Cancelar</Link><button className="btn btn-primary">Criar turma</button></div></form>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 }}>{rows.map(row => <Link key={row.id} href={`/turmas/${row.id}`} className="card" style={{ padding: 20, textDecoration: "none", color: "inherit" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><div className="stat-icon"><BookOpen size={19} /></div><StatusBadge status={row.status} /></div><h2 style={{ font: "700 19px Georgia,serif", color: "#193b61", margin: "17px 0 5px" }}>{row.name}</h2><p style={{ fontSize: 12, color: "#718092", margin: "0 0 17px" }}>{row.sacrament.name} • {row.stage.name}</p><div className="list"><div className="list-row"><Users size={15} /><span>{row._count.enrollments}/{row.capacity} catequizandos</span></div><div className="list-row"><Clock size={15} /><span>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][row.weekday]}, {row.startTime}</span></div><div className="list-row"><MapPin size={15} /><span>{row.community.name} • {row.location}</span></div></div></Link>)}</div>
    {!rows.length && <div className="card empty">Nenhuma turma disponível para seu perfil.</div>}
  </AppShell>;
}
