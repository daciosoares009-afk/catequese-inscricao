import Link from "next/link";
import { ArrowRight, GraduationCap, UserRoundPlus } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth";

export default async function NewRegistrationPage() {
  const session = await requireSession(["ADMIN", "COORDINATOR"]);
  const canCreateCatechist = session.role === "ADMIN";

  return (
    <AppShell>
      <PageHeader
        eyebrow="Novo cadastro"
        title="Quem deseja adicionar?"
        description="Escolha o tipo de pessoa para abrir o cadastro correto."
      />
      <section className="registration-choice-grid" aria-label="Tipo de cadastro">
        <Link href="/catequizandos/novo" className="registration-choice-card">
          <span className="registration-choice-icon"><UserRoundPlus size={24} /></span>
          <div>
            <span className="registration-choice-eyebrow">Participante</span>
            <h2>Catequizando</h2>
            <p>Cadastre nome, sacramento e turma; o QR Code será criado ao salvar.</p>
          </div>
          <ArrowRight size={19} aria-hidden="true" />
        </Link>
        {canCreateCatechist ? (
          <Link href="/usuarios?novo=1" className="registration-choice-card">
            <span className="registration-choice-icon"><GraduationCap size={24} /></span>
            <div>
              <span className="registration-choice-eyebrow">Equipe pastoral</span>
              <h2>Catequista</h2>
              <p>Crie o acesso do catequista para que ele possa ser vinculado às turmas.</p>
            </div>
            <ArrowRight size={19} aria-hidden="true" />
          </Link>
        ) : (
          <article className="registration-choice-card disabled">
            <span className="registration-choice-icon"><GraduationCap size={24} /></span>
            <div>
              <span className="registration-choice-eyebrow">Equipe pastoral</span>
              <h2>Catequista</h2>
              <p>O cadastro de catequistas é realizado por um administrador.</p>
            </div>
          </article>
        )}
      </section>
    </AppShell>
  );
}
