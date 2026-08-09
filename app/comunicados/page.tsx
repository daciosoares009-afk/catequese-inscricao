import { MessageCircle } from "lucide-react";
import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { catechistClassFilter } from "@/lib/access";
import { formatDate } from "@/lib/format";
import { createAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; sucesso?: string }>;
}) {
  const session = await requireSession(["ADMIN"]);
  const query = await searchParams;
  const [classes, communities] = await Promise.all([
    prisma.class.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        ...catechistClassFilter(session),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    session.role === "CATECHIST"
      ? Promise.resolve([])
      : prisma.community.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
  ]);
  const classIds = classes.map(item => item.id);
  const rows = await prisma.announcement.findMany({
    where: {
      deletedAt: null,
      ...(session.role === "CATECHIST"
        ? {
            OR: [
              { recipientType: "ALL" },
              { recipientType: "CATECHISTS" },
              { recipientType: "CLASS", recipientId: { in: classIds } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell current="/comunicados">
      <PageHeader
        title="Comunicados"
        description="Mensagens internas ou preparadas para WhatsApp"
      />
      {query.erro && (
        <div className="alert error">
          {query.erro === "sem-permissao"
            ? "Catequistas podem comunicar apenas às próprias turmas."
            : "Revise o destinatário e os dados do comunicado."}
        </div>
      )}
      {query.sucesso && (
        <div className="alert success">Comunicado preparado com sucesso.</div>
      )}
      <div className="dashboard-grid">
        <form action={createAnnouncement} className="card form-card">
          <h2>Novo comunicado</h2>
          <div className="form-grid">
            <div className="field full">
              <label>Título</label>
              <input name="title" required />
            </div>
            <div className="field full">
              <label>Mensagem</label>
              <textarea name="message" required />
            </div>
            <div className="field">
              <label>Destinatários</label>
              <select
                name="recipientType"
                defaultValue={session.role === "CATECHIST" ? "CLASS" : "ALL"}
              >
                {session.role !== "CATECHIST" && (
                  <>
                    <option value="ALL">Todos os usuários</option>
                    <option value="COMMUNITY">Uma comunidade</option>
                    <option value="CATECHISTS">Catequistas</option>
                  </>
                )}
                <option value="CLASS">Uma turma</option>
              </select>
            </div>
            <div className="field">
              <label>Turma, quando escolhida</label>
              <select name="classId">
                <option value="">Selecione</option>
                {classes.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
            {session.role !== "CATECHIST" && (
              <div className="field">
                <label>Comunidade, quando escolhida</label>
                <select name="communityId">
                  <option value="">Selecione</option>
                  {communities.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label>Canal</label>
              <select name="channel">
                <option value="INTERNAL">Notificação interna</option>
                <option value="WHATSAPP">WhatsApp manual</option>
              </select>
            </div>
            <div className="field">
              <label>Prioridade</label>
              <select name="priority">
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 18 }}>
            Preparar comunicado
          </button>
        </form>
        <section className="card">
          <div className="card-head"><h2>Histórico</h2></div>
          <div className="card-body list">
            {rows.map(item => (
              <div className="list-row" key={item.id}>
                <div className="grow">
                  <strong>{item.title}</strong>
                  <small>
                    {item.message} • {formatDate(item.createdAt)} • {item.status}
                  </small>
                </div>
                {item.channel === "WHATSAPP" && (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://wa.me/?text=${encodeURIComponent(`${item.title}\n\n${item.message}`)}`}
                    className="btn btn-secondary"
                  >
                    <MessageCircle size={14} />
                    Abrir
                  </a>
                )}
              </div>
            ))}
            {!rows.length && <div className="empty">Nenhum comunicado.</div>}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
