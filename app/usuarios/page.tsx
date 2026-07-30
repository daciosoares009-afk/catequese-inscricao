import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import {
  createUser,
  resetUserPassword,
  toggleUserActive,
} from "./actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  "dados-invalidos": "Revise os campos. A senha deve ter pelo menos 12 caracteres.",
  "email-existente": "Já existe um usuário com este e-mail.",
  "proprio-usuario": "Você não pode bloquear sua própria conta.",
  "ultimo-admin": "O último administrador ativo não pode ser bloqueado.",
  "senha-invalida": "A nova senha deve ter pelo menos 12 caracteres.",
  "nao-encontrado": "Usuário não encontrado.",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ novo?: string; erro?: string; sucesso?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const rows = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell current="/usuarios">
      <PageHeader
        title="Usuários"
        description="Acessos e permissões da equipe pastoral"
        action={<a className="btn btn-primary" href="/usuarios?novo=1">+ Novo usuário</a>}
      />
      {query.erro && (
        <div className="alert error">
          {errorMessages[query.erro] || "Não foi possível concluir a operação."}
        </div>
      )}
      {query.sucesso && (
        <div className="alert success">Operação concluída com sucesso.</div>
      )}
      {query.novo && (
        <form action={createUser} className="card form-card" style={{ marginBottom: 18 }}>
          <div className="form-grid">
            <div className="field"><label>Nome</label><input name="name" required /></div>
            <div className="field"><label>E-mail</label><input name="email" type="email" required /></div>
            <div className="field"><label>Senha inicial</label><input name="password" type="password" minLength={12} required /></div>
            <div className="field">
              <label>Perfil</label>
              <select name="role">
                <option value="CATECHIST">Catequista</option>
                <option value="COORDINATOR">Coordenador</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
            <div className="field"><label>Telefone do catequista</label><input name="phone" /></div>
          </div>
          <div className="form-actions" style={{ marginTop: 18 }}>
            <a href="/usuarios" className="btn btn-secondary">Cancelar</a>
            <button className="btn btn-primary">Criar acesso</button>
          </div>
        </form>
      )}
      <div className="card table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Usuário</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Nova senha</th><th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(user => (
              <tr key={user.id}>
                <td><div className="person"><div className="person-avatar">{user.name.slice(0, 2).toUpperCase()}</div><strong>{user.name}</strong></div></td>
                <td>{user.email}</td>
                <td><span className="badge blue">{roleLabel[user.role]}</span></td>
                <td><span className={`badge ${user.active ? "" : "danger"}`}>{user.active ? "Ativo" : "Bloqueado"}</span></td>
                <td>
                  <form action={resetUserPassword.bind(null, user.id)} className="inline-form">
                    <input name="password" type="password" minLength={12} placeholder="Mínimo 12 caracteres" required />
                    <button className="btn btn-secondary">Redefinir</button>
                  </form>
                </td>
                <td>
                  <form action={toggleUserActive.bind(null, user.id)}>
                    <button className="btn btn-secondary" disabled={user.id === session.userId}>
                      {user.active ? "Bloquear" : "Ativar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
