import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Church,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  UserRound,
} from "lucide-react";
import { clearSession, requireSession } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const links = [
  ["/dashboard", "Visão geral", LayoutDashboard],
  ["/catequizandos", "Catequizandos", Users],
  ["/responsaveis", "Responsáveis", UserRound],
  ["/turmas", "Turmas", BookOpen],
  ["/encontros", "Encontros", CalendarDays],
  ["/presencas", "Presenças", ClipboardCheck],
  ["/sacramentos", "Sacramentos", Church],
  ["/relatorios", "Relatórios", BarChart3],
  ["/comunicados", "Comunicados", Megaphone],
  ["/notificacoes", "Notificações", Bell],
  ["/usuarios", "Usuários", ShieldCheck],
  ["/auditoria", "Auditoria", QrCode],
  ["/configuracoes", "Configurações", Settings],
] as const;

export default async function AppShell({
  children,
  current,
}: {
  children: React.ReactNode;
  current: string;
}) {
  const session = await requireSession();
  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.userId, readAt: null },
  });
  const visible =
    session.role === "ADMIN"
      ? links
      : links.filter(
          ([href]) =>
            !["/usuarios", "/auditoria", "/configuracoes"].includes(href),
        );
  const currentLabel =
    links.find(([href]) => href === current)?.[1] || "Catequese Presente";
  const initials = session.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  async function logout() {
    "use server";
    await clearSession();
    redirect("/login");
  }

  return (
    <div className="shell faith-shell">
      <aside className="sidebar faith-sidebar">
        <Link href="/dashboard" className="faith-brand" aria-label="Início">
          <span className="faith-cross">✝</span>
          <span>
            <strong>Catequese Presente</strong>
            <small>Gestão de catequese</small>
          </span>
        </Link>

        <nav className="nav faith-nav" aria-label="Navegação principal">
          {visible.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className={current === href ? "active" : ""}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {current === href && <i />}
            </Link>
          ))}
        </nav>

        <div className="faith-community">
          <Image
            src="/images/igreja-altar.webp"
            alt="Altar da comunidade paroquial"
            fill
            sizes="220px"
          />
          <span>Comunidade paroquial</span>
          <strong>Servir com alegria</strong>
        </div>

        <div className="faith-sidebar-footer">
          <Link href="/configuracoes" className="faith-settings">
            <Settings size={18} />
            <span>{session.role === "ADMIN" ? "Configurações" : "Minha conta"}</span>
          </Link>
          <div className="faith-user">
            <span className="avatar">{initials}</span>
            <span>
              <strong>{session.name}</strong>
              <small>{roleLabel[session.role]}</small>
            </span>
            <form action={logout}>
              <button className="signout" aria-label="Sair da conta">
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="main faith-main">
        <header className="topbar faith-topbar">
          <div className="topbar-title">
            <details className="mobile-menu">
              <summary className="icon-btn menu-trigger" aria-label="Abrir menu">
                <Menu size={19} />
              </summary>
              <nav aria-label="Menu completo">
                {visible.map(([href, label, Icon]) => (
                  <Link key={href} href={href}>
                    <Icon size={18} />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>
            </details>
            <div>
              <small>Gestão pastoral</small>
              <strong>{currentLabel}</strong>
            </div>
          </div>
          <div className="top-actions">
            <span className="faith-view-label">Visualizar como</span>
            <span className="faith-role">{roleLabel[session.role]}</span>
            <Link
              href="/notificacoes"
              className="icon-btn notification-btn"
              aria-label={`Notificações${unreadNotifications ? `, ${unreadNotifications} não lidas` : ""}`}
            >
              <Bell size={18} />
              {unreadNotifications > 0 && <i />}
            </Link>
            <div className="top-avatar">{initials}</div>
          </div>
        </header>
        <div className="content faith-content">{children}</div>
      </main>

      <nav className="mobile-nav" aria-label="Navegação móvel">
        {visible.slice(0, 5).map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            className={current === href ? "active" : ""}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
