import Link from "next/link";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createCatechumen } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { CatechumenEnrollmentFields } from "@/components/catechumen-enrollment-fields";
import { prisma } from "@/lib/prisma";

export default async function NewCatechumenPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const query = await searchParams;
  const [sacraments, classes] = await Promise.all([
    prisma.sacrament.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.class.findMany({
      where: { deletedAt: null, status: { in: ["ACTIVE", "PLANNED"] } },
      orderBy: [{ year: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        year: true,
        sacramentId: true,
        sacrament: { select: { name: true } },
        community: { select: { name: true } },
      },
    }),
  ]);
  const errors: Record<string, string> = {
    "dados-invalidos": "Informe o nome e selecione a turma e o sacramento.",
    "vinculos-invalidos": "A turma selecionada não corresponde ao sacramento ou não está disponível.",
    "turma-lotada": "A turma selecionada já atingiu a capacidade máxima.",
  };

  return (
    <AppShell current="/catequizandos">
      <PageHeader
        title="Novo catequizando"
        description="Informe o nome, a turma e o sacramento para gerar o QR Code individual."
      />
      {query.erro && (
        <div className="alert error">{errors[query.erro] || "Não foi possível concluir o cadastro."}</div>
      )}
      <form action={createCatechumen} className="card form-card">
        <section className="form-section">
          <h2>Identificação</h2>
          <div className="form-grid">
            <div className="field full">
              <label htmlFor="fullName">Nome completo *</label>
              <input
                id="fullName"
                name="fullName"
                autoComplete="name"
                autoFocus
                required
                minLength={3}
                maxLength={160}
                placeholder="Digite o nome completo"
              />
              <small className="field-help">O QR Code será criado automaticamente após salvar.</small>
            </div>
            <CatechumenEnrollmentFields
              sacraments={sacraments}
              classes={classes.map((item) => ({
                id: item.id,
                name: item.name,
                year: item.year,
                sacramentId: item.sacramentId,
                communityName: item.community.name,
              }))}
            />
          </div>
        </section>
        <div className="form-actions">
          <Link href="/catequizandos" className="btn btn-secondary">
            Cancelar
          </Link>
          <SubmitButton pendingLabel="Salvando cadastro...">Salvar e gerar QR Code</SubmitButton>
        </div>
      </form>
    </AppShell>
  );
}
