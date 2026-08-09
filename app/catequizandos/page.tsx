import Link from "next/link";
import { QrCode, Search, UserRoundSearch, X } from "lucide-react";
import type { PersonStatus } from "@prisma/client";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { UserAvatar } from "@/components/ui/user-avatar";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistCatechumenFilter, catechistClassFilter } from "@/lib/access";

export const dynamic = "force-dynamic";

const allowedStatuses: PersonStatus[] = ["ACTIVE", "WAITING", "COMPLETED", "TRANSFERRED", "DROPOUT", "INACTIVE"];

export default async function CatechumensPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; classId?: string; sacramentId?: string; year?: string; sucesso?: string }> }) {
  const session = await requireSession();
  const query = await searchParams;
  const status = allowedStatuses.includes(query.status as PersonStatus) ? query.status as PersonStatus : undefined;
  const year = query.year && /^\d{4}$/.test(query.year) ? Number(query.year) : undefined;
  const relationFilters = [
    catechistCatechumenFilter(session),
    query.classId ? { enrollments: { some: { status: "ACTIVE" as const, classId: query.classId } } } : {},
    query.sacramentId ? { enrollments: { some: { status: "ACTIVE" as const, class: { sacramentId: query.sacramentId } } } } : {},
    year ? { enrollments: { some: { status: "ACTIVE" as const, class: { year } } } } : {},
  ];

  const [rows, classes, sacraments, classYears] = await Promise.all([
    prisma.catechumen.findMany({
      where: { deletedAt: null, fullName: query.q ? { contains: query.q, mode: "insensitive" } : undefined, status, AND: relationFilters },
      select: {
        id: true,
        fullName: true,
        status: true,
        qrCode: { select: { id: true, active: true } },
        enrollments: { where: { status: "ACTIVE" }, select: { class: { select: { id: true, name: true, year: true, sacrament: { select: { name: true } } } } }, take: 1 },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.class.findMany({ where: { deletedAt: null, ...catechistClassFilter(session) }, select: { id: true, name: true, year: true }, orderBy: [{ year: "desc" }, { name: "asc" }] }),
    prisma.sacrament.findMany({ where: { deletedAt: null, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.class.findMany({ where: { deletedAt: null, ...catechistClassFilter(session) }, distinct: ["year"], select: { year: true }, orderBy: { year: "desc" } }),
  ]);
  const hasFilters = Boolean(query.q || query.status || query.classId || query.sacramentId || query.year);

  return <AppShell current="/catequizandos">
    <PageHeader title="Catequizandos" description={`${rows.length} cadastro(s) encontrado(s)`} action={session.role !== "CATECHIST" ? <Link className="btn btn-primary" href="/catequizandos/novo">+ Novo catequizando</Link> : undefined} />
    {query.sucesso && <div className="alert success" role="status">Catequizando arquivado com sucesso.</div>}
    <form className="toolbar filter-bar" aria-label="Filtros de catequizandos">
      <div className="search"><span><Search size={17} /></span><input name="q" defaultValue={query.q} placeholder="Buscar por nome..." aria-label="Buscar por nome" /></div>
      <div className="filter-field"><label htmlFor="student-class">Turma</label><select id="student-class" name="classId" defaultValue={query.classId || ""}><option value="">Todas as turmas</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name} · {item.year}</option>)}</select></div>
      <div className="filter-field"><label htmlFor="student-sacrament">Sacramento</label><select id="student-sacrament" name="sacramentId" defaultValue={query.sacramentId || ""}><option value="">Todos os sacramentos</option>{sacraments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="filter-field"><label htmlFor="student-status">Status</label><select id="student-status" name="status" defaultValue={query.status || ""}><option value="">Todos os status</option><option value="ACTIVE">Ativo</option><option value="WAITING">Aguardando turma</option><option value="COMPLETED">Concluído</option><option value="TRANSFERRED">Transferido</option><option value="DROPOUT">Desistente</option></select></div>
      <div className="filter-field filter-year"><label htmlFor="student-year">Ano</label><select id="student-year" name="year" defaultValue={query.year || ""}><option value="">Todos</option>{classYears.map(item => <option key={item.year} value={item.year}>{item.year}</option>)}</select></div>
      <button className="btn btn-primary">Filtrar</button>
      {hasFilters && <Link className="btn btn-secondary icon-only" href="/catequizandos" aria-label="Limpar filtros" title="Limpar filtros"><X size={16} /></Link>}
    </form>

    <section className="card table-wrap desktop-table" aria-label="Lista de catequizandos">
      <table className="table"><thead><tr><th>Catequizando</th><th>Turma atual</th><th>Sacramento</th><th>Status</th><th>QR Code</th></tr></thead><tbody>
        {rows.map(row => { const enrollment = row.enrollments[0]; return <tr key={row.id}>
          <td><div className="person"><UserAvatar name={row.fullName} /><strong>{row.fullName}</strong></div></td>
          <td>{enrollment?.class.name || <span className="text-muted">Sem turma</span>}</td>
          <td>{enrollment?.class.sacrament.name || "—"}</td>
          <td><StatusBadge status={row.status} /></td>
          <td><Link href={`/catequizandos/${row.id}`} className="btn btn-secondary"><QrCode size={15} />{row.qrCode?.active ? "Ver QR Code" : "Gerar QR Code"}</Link></td>
        </tr>; })}
      </tbody></table>
      {!rows.length && <EmptyState icon={UserRoundSearch} title="Nenhum catequizando encontrado" description={hasFilters ? "Tente remover um filtro ou pesquisar outro nome." : "Cadastre o primeiro catequizando para começar."} action={!hasFilters && session.role !== "CATECHIST" ? <Link className="btn btn-primary" href="/catequizandos/novo">Novo catequizando</Link> : undefined} />}
    </section>

    <div className="mobile-card-list" aria-label="Lista de catequizandos em cartões">
      {rows.map(row => { const enrollment = row.enrollments[0]; return <article className="mobile-person-card" key={row.id}><div className="mobile-person-main"><UserAvatar name={row.fullName} size="lg" /><div><strong>{row.fullName}</strong><span>{enrollment?.class.name || "Sem turma"}</span><small>{enrollment?.class.sacrament.name || "Sacramento não definido"}</small></div><StatusBadge status={row.status} /></div><Link href={`/catequizandos/${row.id}`} className="btn btn-secondary"><QrCode size={16} />{row.qrCode?.active ? "Visualizar QR Code" : "Gerar QR Code"}</Link></article>; })}
      {!rows.length && <section className="card"><EmptyState icon={UserRoundSearch} title="Nenhum resultado" description="Revise os filtros aplicados." /></section>}
    </div>
  </AppShell>;
}
