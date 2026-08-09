import Link from "next/link";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { createCatechumen } from "../actions";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function NewCatechumenPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const query = await searchParams;

  return (
    <AppShell current="/catequizandos">
      <PageHeader
        title="Novo catequizando"
        description="Informe o nome para gerar o QR Code individual."
      />
      {query.erro && (
        <div className="alert error">Informe o nome completo do catequizando.</div>
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
