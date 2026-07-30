import Link from "next/link";
import { QrCode, Search } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistCatechumenFilter } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function CatechumensPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sucesso?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const rows = await prisma.catechumen.findMany({
    where: {
      deletedAt: null,
      fullName: query.q
        ? { contains: query.q, mode: "insensitive" }
        : undefined,
      ...catechistCatechumenFilter(session),
    },
    select: { id: true, fullName: true, qrCode: { select: { id: true } } },
    orderBy: { fullName: "asc" },
  });

  return (
    <AppShell current="/catequizandos">
      <PageHeader
        title="Catequizandos"
        description={`${rows.length} nomes cadastrados`}
        action={
          session.role !== "CATECHIST" ? (
            <Link className="btn btn-primary" href="/catequizandos/novo">
              + Novo catequizando
            </Link>
          ) : undefined
        }
      />
      {query.sucesso && (
        <div className="alert success">Catequizando arquivado com sucesso.</div>
      )}
      <form className="toolbar">
        <div className="search">
          <span>
            <Search size={17} />
          </span>
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Buscar por nome..."
          />
        </div>
        <button className="btn btn-secondary">Buscar</button>
      </form>
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>QR Code</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="person">
                    <div className="person-avatar">
                      {row.fullName
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </div>
                    <strong>{row.fullName}</strong>
                  </div>
                </td>
                <td>
                  <Link
                    href={`/catequizandos/${row.id}`}
                    className="btn btn-secondary"
                  >
                    <QrCode size={15} />
                    {row.qrCode ? "Ver e baixar PDF" : "Gerar QR Code"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="empty">Nenhum catequizando cadastrado.</div>
        )}
      </div>
    </AppShell>
  );
}
