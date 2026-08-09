import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import {
  changeOwnPassword,
  createCommunity,
  createParish,
} from "./actions";

export const dynamic = "force-dynamic";

const errors: Record<string, string> = {
  paroquia: "Informe o nome e a cidade da paróquia.",
  "paroquia-existente": "Esta paróquia já está cadastrada.",
  comunidade: "Informe uma comunidade e uma paróquia válidas.",
  "comunidade-existente": "Esta comunidade já está cadastrada.",
  senha: "A nova senha deve ter 12 caracteres e coincidir com a confirmação.",
  "senha-atual": "A senha atual está incorreta.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const session = await requireSession();
  const query = await searchParams;
  const [parishes, communities] = await Promise.all([
    session.role === "ADMIN"
      ? prisma.parish.findMany({
          where: { deletedAt: null },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    session.role === "ADMIN"
      ? prisma.community.findMany({
          where: { deletedAt: null },
          include: { parish: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <AppShell current="/configuracoes">
      <PageHeader title="Configurações" description="Estrutura paroquial e segurança" />
      {query.erro && <div className="alert error">{errors[query.erro] || "Revise os dados."}</div>}
      {query.sucesso && <div className="alert success">Configuração salva com sucesso.</div>}

      {session.role === "ADMIN" && <div className="dashboard-grid">
        <section className="card form-card">
          <h2>Nova paróquia</h2>
          <form action={createParish} className="form-grid" style={{ marginTop: 16 }}>
            <div className="field"><label>Nome</label><input name="name" required /></div>
            <div className="field"><label>Cidade</label><input name="city" required /></div>
            <button className="btn btn-primary">Cadastrar paróquia</button>
          </form>
          <div className="list" style={{ marginTop: 18 }}>
            {parishes.map(item => (
              <div className="list-row" key={item.id}>
                <div className="grow"><strong>{item.name}</strong><small>{item.city}</small></div>
                <span className="badge">Ativa</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card form-card">
          <h2>Nova comunidade</h2>
          <form action={createCommunity} className="form-grid" style={{ marginTop: 16 }}>
            <div className="field"><label>Nome</label><input name="name" required /></div>
            <div className="field">
              <label>Paróquia</label>
              <select name="parishId" required>
                <option value="">Selecione</option>
                {parishes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <button className="btn btn-primary">Cadastrar comunidade</button>
          </form>
          <div className="list" style={{ marginTop: 18 }}>
            {communities.map(item => (
              <div className="list-row" key={item.id}>
                <div><strong>{item.name}</strong><small>{item.parish.name}</small></div>
              </div>
            ))}
          </div>
        </section>
      </div>}

      <div className="dashboard-grid">
        <section className="card form-card">
          <h2>Alterar minha senha</h2>
          <form action={changeOwnPassword} className="form-grid" style={{ marginTop: 16 }}>
            <div className="field full"><label>Senha atual</label><input name="currentPassword" type="password" required /></div>
            <div className="field"><label>Nova senha</label><input name="newPassword" type="password" minLength={12} required /></div>
            <div className="field"><label>Confirmação</label><input name="confirmation" type="password" minLength={12} required /></div>
            <button className="btn btn-primary">Alterar senha</button>
          </form>
        </section>
        <section className="card form-card">
          <h2>Integrações externas</h2>
          <div className="list" style={{ marginTop: 16 }}>
            <div className="list-row">
              <div className="grow"><strong>WhatsApp</strong><small>Modo manual; o envio exige confirmação humana.</small></div>
              <span className="badge warn">Manual</span>
            </div>
            <div className="list-row">
              <div className="grow"><strong>E-mail</strong><small>Desativado até configurar um provedor de envio.</small></div>
              <span className="badge danger">Não configurado</span>
            </div>
            <div className="list-row">
              <div className="grow"><strong>Documentos</strong><small>Upload desativado até configurar Supabase Storage ou S3.</small></div>
              <span className="badge danger">Não configurado</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
