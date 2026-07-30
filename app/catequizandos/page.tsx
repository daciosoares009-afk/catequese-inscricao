import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";
import type { PersonStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
const validStatuses: PersonStatus[] = ["ACTIVE", "COMPLETED", "TRANSFERRED", "DROPOUT", "WAITING", "INACTIVE"];
export default async function CatechumensPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const status = validStatuses.includes(query.status as PersonStatus) ? query.status as PersonStatus : undefined;
  const rows = await prisma.catechumen.findMany({ where: { deletedAt: null, fullName: query.q ? { contains: query.q, mode: "insensitive" } : undefined, status, ...catechistCatechumenFilter(session) }, include: { community: true, enrollments: { where: { status: "ACTIVE" }, include: { class: true }, take: 1 } }, orderBy: { fullName: "asc" } });
  return <AppShell current="/catequizandos"><PageHeader title="Catequizandos" description={`${rows.length} pessoas encontradas`} action={session.role !== "CATECHIST" ? <Link className="btn btn-primary" href="/catequizandos/novo">+ Novo catequizando</Link> : undefined} />
    <form className="toolbar"><div className="search"><span><Search size={17} /></span><input name="q" defaultValue={query.q} placeholder="Buscar por nome..." /></div><select className="btn btn-secondary" name="status" defaultValue={query.status || ""}><option value="">Todas as situações</option><option value="ACTIVE">Ativos</option><option value="WAITING">Aguardando turma</option><option value="COMPLETED">Concluídos</option><option value="INACTIVE">Inativos</option></select><button className="btn btn-secondary"><SlidersHorizontal size={15} />Filtrar</button></form>
    <div className="card table-wrap"><table className="table"><thead><tr><th>Catequizando</th><th>Comunidade</th><th>Turma atual</th><th>Situação</th><th>Entrada</th><th></th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><div className="person"><div className="person-avatar">{row.fullName.split(" ").slice(0, 2).map(x => x[0]).join("")}</div><strong>{row.fullName}</strong></div></td><td>{row.community?.name || "—"}</td><td>{row.enrollments[0]?.class.name || "Sem turma"}</td><td><StatusBadge status={row.status} /></td><td>{row.joinedAt.toLocaleDateString("pt-BR")}</td><td><Link href={`/catequizandos/${row.id}`} className="btn btn-secondary">Ver perfil</Link></td></tr>)}</tbody></table>{!rows.length && <div className="empty">Nenhum catequizando disponível para seu perfil.</div>}</div>
  </AppShell>;
}
