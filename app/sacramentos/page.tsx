import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { createSacrament, createStage } from "./actions";

export const dynamic = "force-dynamic";

export default async function SacramentsPage() {
  const session = await requireSession(["ADMIN"]);
  const canManage = session.role === "ADMIN";
  const rows = await prisma.sacrament.findMany({
    where: { deletedAt: null },
    include: {
      stages: { where: { deletedAt: null }, orderBy: { order: "asc" } },
      _count: { select: { classes: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell current="/sacramentos">
      <PageHeader
        title="Sacramentos e etapas"
        description={canManage ? "Estrutura pastoral administrável" : "Consulta da estrutura pastoral"}
      />
      {canManage && (
        <div className="dashboard-grid">
          <section className="card form-card">
            <h2>Novo sacramento</h2>
            <form action={createSacrament} className="form-grid" style={{ marginTop: 16 }}>
              <div className="field"><label>Nome</label><input name="name" required /></div>
              <div className="field"><label>Descrição</label><input name="description" /></div>
              <button className="btn btn-primary">Cadastrar sacramento</button>
            </form>
          </section>
          <section className="card form-card">
            <h2>Nova etapa</h2>
            <form action={createStage} className="form-grid" style={{ marginTop: 16 }}>
              <div className="field">
                <label>Sacramento</label>
                <select name="sacramentId" required>
                  {rows.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="field"><label>Nome da etapa</label><input name="name" required /></div>
              <div className="field"><label>Ordem</label><input name="order" type="number" defaultValue="1" /></div>
              <button className="btn btn-primary">Cadastrar etapa</button>
            </form>
          </section>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginTop: 18 }}>
        {rows.map(sacrament => (
          <div className="card" style={{ padding: 21 }} key={sacrament.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ font: "700 19px Georgia,serif", margin: 0, color: "#1a4069" }}>{sacrament.name}</h2>
              <span className="badge">{sacrament._count.classes} turmas</span>
            </div>
            <p style={{ fontSize: 12, color: "#718092" }}>{sacrament.description || "Sem descrição"}</p>
            <div className="list">
              {sacrament.stages.map(stage => (
                <div className="list-row" key={stage.id}>
                  <span className="person-avatar">{stage.order}</span>
                  <strong>{stage.name}</strong>
                </div>
              ))}
              {!sacrament.stages.length && <div className="empty">Nenhuma etapa.</div>}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
