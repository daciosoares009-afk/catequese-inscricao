"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  Settings,
  Users,
  X,
} from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "@prisma/client";
import type { Session } from "@/lib/auth";
import { roleLabel } from "@/lib/format";
import { logout } from "@/app/logout/actions";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const allRoles: Role[] = ["ADMIN", "COORDINATOR", "CATECHIST"];
const managementRoles: Role[] = ["ADMIN", "COORDINATOR"];
const links: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard, roles: allRoles },
  { href: "/catequizandos", label: "Catequizandos", icon: Users, roles: managementRoles },
  { href: "/turmas", label: "Turmas", icon: BookOpen, roles: allRoles },
  { href: "/encontros", label: "Encontros", icon: CalendarDays, roles: allRoles },
  { href: "/presencas", label: "Frequência", icon: ClipboardCheck, roles: allRoles },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, roles: managementRoles },
  { href: "/notificacoes", label: "Notificações", icon: Bell, roles: allRoles },
  { href: "/auditoria", label: "Auditoria", icon: QrCode, roles: ["ADMIN"] },
  { href: "/configuracoes", label: "Configurações", icon: Settings, roles: allRoles },
];

const ShellContext = createContext(false);

function NavigationProgress() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  useEffect(() => setBusy(false), [pathname]);
  useEffect(() => {
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download") || anchor.origin !== location.origin || anchor.href === location.href) return;
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
  return <div className={`navigation-progress${busy ? " active" : ""}`} aria-hidden="true"><i /></div>;
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
  const [parishName, setParishName] = useState("Comunidade paroquial");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sessionUserId = session?.userId;

  useEffect(() => {
    setCollapsed(localStorage.getItem("catequese-sidebar") === "collapsed");
  }, []);
  useEffect(() => {
    if (!sessionUserId) return;
    let cancelled = false;
    fetch("/api/notificacoes/unread", { cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then((data: { count?: number; parishName?: string } | null) => {
        if (cancelled || !data) return;
        if (typeof data.count === "number") setUnread(data.count);
        if (data.parishName) setParishName(data.parishName);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [sessionUserId]);
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", close);
    document.body.classList.add("drawer-lock");
    return () => {
      document.removeEventListener("keydown", close);
      document.body.classList.remove("drawer-lock");
    };
  }, [drawerOpen]);

  if (insideShell) return children;
  if (!session || pathname === "/login") return children;

  const visible = links.filter(item => item.roles.includes(session.role));
  const active = links.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`)) || links[0];
  const initials = session.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const firstName = session.name.split(" ")[0];
  const pathParts = pathname.split("/").filter(Boolean);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("catequese-sidebar", next ? "collapsed" : "expanded");
  };

  const navigation = (
    <>
      <div className="sidebar-heading">
        <Link href="/dashboard" className="faith-brand" aria-label="Ir para o início">
          <span className="faith-cross">✝</span>
          <span className="brand-copy"><strong>Catequese Presente</strong><small>Gestão pastoral</small></span>
        </Link>
        <button className="sidebar-collapse" onClick={toggleSidebar} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} title={collapsed ? "Expandir menu" : "Recolher menu"}>
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </div>
      <span className="nav-section-label">Navegação</span>
      <nav className="nav faith-nav" aria-label="Navegação principal">
        {visible.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-current={active.href === href ? "page" : undefined} className={active.href === href ? "active" : ""} title={collapsed ? label : undefined}>
            <Icon size={19} strokeWidth={1.8} />
            <span>{label}</span>
            {active.href === href && <i />}
          </Link>
        ))}
      </nav>
      <div className="faith-community">
        <span>Paróquia</span><strong>{parishName}</strong>
      </div>
      <div className="faith-sidebar-footer">
        <div className="faith-user">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <span className="user-summary"><strong>{session.name}</strong><small>{roleLabel[session.role]}</small></span>
          <form action={logout}><button className="signout" aria-label="Sair da conta" title="Sair"><LogOut size={17} /></button></form>
        </div>
      </div>
    </>
  );

  return (
    <ShellContext.Provider value>
      <NavigationProgress />
      <div className={`shell faith-shell${collapsed ? " sidebar-collapsed" : ""}`}>
        <aside className="sidebar faith-sidebar">{navigation}</aside>
        <button className={`drawer-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} aria-label="Fechar menu" tabIndex={drawerOpen ? 0 : -1} />
        <aside className={`mobile-drawer${drawerOpen ? " open" : ""}`} aria-hidden={!drawerOpen}>
          <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
          {navigation}
        </aside>

        <main className="main faith-main">
          <header className="topbar faith-topbar">
            <div className="topbar-title">
              <button className="icon-btn menu-trigger" onClick={() => setDrawerOpen(true)} aria-label="Abrir menu" aria-expanded={drawerOpen}><Menu size={20} /></button>
              <div><small>{parishName}</small><strong>Paz e bem, {firstName}!</strong></div>
            </div>
            <div className="top-actions">
              <span className="faith-role">{roleLabel[session.role]}</span>
              <Link href="/notificacoes" className="icon-btn notification-btn" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}>
                <Bell size={18} />{unread > 0 && <i />}
              </Link>
              <details className="profile-menu">
                <summary aria-label="Abrir menu do perfil"><span className="top-avatar">{initials}</span><ChevronDown size={14} /></summary>
                <div className="profile-dropdown">
                  <div><strong>{session.name}</strong><small>{session.email}</small></div>
                  <Link href="/configuracoes"><Settings size={16} /> Minha conta</Link>
                  <form action={logout}><button><LogOut size={16} /> Sair</button></form>
                </div>
              </details>
            </div>
          </header>
          {pathname !== "/dashboard" && (
            <nav className="breadcrumbs" aria-label="Caminho da página">
              <Link href="/dashboard" aria-label="Início"><Home size={14} /></Link>
              {pathParts.map((part, index) => {
                const href = `/${pathParts.slice(0, index + 1).join("/")}`;
                const label = links.find(item => item.href === `/${part}`)?.label || (index === pathParts.length - 1 ? "Detalhes" : part);
                return <span key={href}><ChevronRight size={12} />{index === pathParts.length - 1 ? <strong>{label}</strong> : <Link href={href}>{label}</Link>}</span>;
              })}
            </nav>
          )}
          <div className="content faith-content">{children}</div>
        </main>

        <nav className="mobile-nav" aria-label="Navegação rápida">
          {visible.filter(item => ["/dashboard", "/turmas", "/encontros", "/presencas"].includes(item.href)).map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={active.href === href ? "page" : undefined} className={active.href === href ? "active" : ""}><Icon size={20} /><span>{label}</span></Link>
          ))}
          <button onClick={() => setDrawerOpen(true)} aria-label="Abrir todas as áreas"><Menu size={20} /><span>Mais</span></button>
        </nav>
      </div>
    </ShellContext.Provider>
  );
}
