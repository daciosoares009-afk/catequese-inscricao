"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { logout } from "@/app/logout/actions";

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

const ShellContext = createContext(false);

function NavigationProgress() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  useEffect(() => setBusy(false), [pathname]);

  useEffect(() => {
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const handleClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a");
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.origin !== window.location.origin ||
        anchor.href === window.location.href
      ) return;

      setBusy(true);
      if (fallback) clearTimeout(fallback);
      fallback = setTimeout(() => setBusy(false), 4_000);
    };
    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (fallback) clearTimeout(fallback);
    };
  }, []);

  return (
    <div className={`navigation-progress${busy ? " active" : ""}`} aria-hidden="true">
      <i />
    </div>
  );
}

export default function AppShell({
  children,
  session,
  unreadNotifications = 0,
}: {
  children: React.ReactNode;
  current?: string;
  session?: Session | null;
  unreadNotifications?: number;
}) {
  const insideShell = useContext(ShellContext);
  const pathname = usePathname();
  const [unread, setUnread] = useState(unreadNotifications);

  useEffect(() => {
    if (!session || (pathname !== "/notificacoes" && unreadNotifications !== unread)) return;
    let cancelled = false;
    fetch("/api/notificacoes/unread", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { count?: number } | null) => {
        if (!cancelled && typeof data?.count === "number") setUnread(data.count);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [pathname, session, unread, unreadNotifications]);

  if (insideShell) return children;
  if (!session || pathname === "/login") return children;

  const visible =
    session.role === "ADMIN"
      ? links
      : links.filter(([href]) => !["/usuarios", "/auditoria"].includes(href));
  const current =
    links.find(([href]) => pathname === href || pathname.startsWith(`${href}/`))?.[0] ||
    "/dashboard";
  const currentLabel =
    links.find(([href]) => href === current)?.[1] || "Catequese Presente";
  const initials = session.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <ShellContext.Provider value>
      <NavigationProgress />
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
                aria-current={current === href ? "page" : undefined}
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
                aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
              >
                <Bell size={18} />
                {unread > 0 && <i />}
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
              aria-current={current === href ? "page" : undefined}
              className={current === href ? "active" : ""}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </ShellContext.Provider>
  );
}
