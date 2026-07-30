import AppShell from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { markAllNotificationsRead } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await requireSession();
  const rows = await prisma.notification.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unread = rows.filter(item => !item.readAt).length;

  return (
    <AppShell current="/notificacoes">
      <PageHeader
        title="Notificações"
        description={`${unread} não lida(s)`}
        action={
          unread ? (
            <form action={markAllNotificationsRead}>
              <button className="btn btn-secondary">Marcar todas como lidas</button>
            </form>
          ) : undefined
        }
      />
      <section className="card">
        <div className="card-body list">
          {rows.map(item => (
            <article className="list-row" key={item.id}>
              <span className={`stat-icon ${item.readAt ? "" : "unread"}`}>✦</span>
              <div className="grow">
                <strong>{item.title}</strong>
                <small>
                  {item.message} • {formatDate(item.createdAt)}
                </small>
              </div>
              {!item.readAt && <span className="badge blue">Nova</span>}
            </article>
          ))}
          {!rows.length && <div className="empty">Nenhuma notificação.</div>}
        </div>
      </section>
    </AppShell>
  );
}
