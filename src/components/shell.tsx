"use client";

// Shell v2: rail oscuro contraíble con indicador de gradiente, topbar con
// contexto del módulo activo y píldora única de modo demo. El estado de
// colapso persiste en localStorage (pgtd-rail).

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Radar, Globe2, Network, Gauge, Map as MapIcon, ListChecks,
  BarChart3, LayoutDashboard, LogOut, Menu, X, Share2, FlaskConical, KanbanSquare, BookOpen,
  PanelLeftClose, PanelLeftOpen, Bell, ShieldAlert, AlertTriangle, Info, AtSign, CheckCheck,
  FileText, Users2,
} from "lucide-react";
import { AlgoritmoMark } from "@/components/logo";
import { CommandPalette, SearchButton } from "@/components/command-palette";
import { INSTITUTION } from "@/data/demo";
import { applyTheme } from "@/lib/branding";

function PublicLinkButton() {
  const [state, setState] = useState<"idle" | "busy" | "copied">("idle");
  const share = async () => {
    setState("busy");
    try {
      const res = await fetch("/api/td/public-link");
      const { url } = await res.json();
      await navigator.clipboard.writeText(url);
      setState("copied");
      window.open(url, "_blank", "noopener");
    } catch {
      setState("idle");
      return;
    }
    setTimeout(() => setState("idle"), 2500);
  };
  return (
    <button onClick={share} disabled={state === "busy"}
      className="btn-ghost hidden sm:inline-flex"
      title="Genera el enlace público de solo lectura, lo copia al portapapeles y lo abre">
      <Share2 size={13} />
      {state === "copied" ? "Enlace copiado" : "Vista pública"}
    </button>
  );
}

/* ─── centro de notificaciones ─── */

type Notif = {
  id: string; kind: string; severity: 1 | 2 | 3;
  title: string; detail: string; href: string; read: boolean; mention?: boolean;
};

const NOTIF_ICON = (n: Notif) => {
  if (n.mention) return { Icon: AtSign, color: "var(--cyan-deep)" };
  if (n.severity === 1) return { Icon: ShieldAlert, color: "var(--bad)" };
  if (n.severity === 2) return { Icon: AlertTriangle, color: "var(--warn)" };
  return { Icon: Info, color: "var(--muted)" };
};

function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/td/notifications");
      if (!res.ok) return;
      const j = await res.json();
      setItems(j.items);
      setUnread(j.unread);
    } catch { /* sin red */ }
  }, []);

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 90_000);
    return () => clearInterval(t);
  }, [refetch]);

  // clic fuera cierra
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const markRead = async (ids: string[]) => {
    await fetch("/api/td/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    await refetch();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => { setOpen((o) => !o); if (!open) refetch(); }}
        className="relative grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        title="Notificaciones">
        <Bell size={16} />
        {unread > 0 && (
          <span className="num absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[8.5px] font-extrabold text-white"
            style={{ background: "var(--bad)" }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="panel absolute right-0 top-[calc(100%+8px)] z-50 w-[min(400px,90vw)] overflow-hidden"
          style={{ boxShadow: "var(--e3)" }}>
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[12.5px] font-extrabold text-ink">
              Notificaciones {unread > 0 && <span className="num text-cyan-deep">· {unread} sin leer</span>}
            </span>
            {unread > 0 && (
              <button onClick={() => markRead(items.filter((i) => !i.read).map((i) => i.id))}
                className="flex items-center gap-1 text-[10.5px] font-semibold text-muted hover:text-cyan-deep">
                <CheckCheck size={11} /> Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-[12px] italic text-faint">
                Sin notificaciones para tu rol.
              </p>
            )}
            {items.slice(0, 40).map((n) => {
              const { Icon, color } = NOTIF_ICON(n);
              return (
                <button key={n.id}
                  onClick={async () => {
                    setOpen(false);
                    if (!n.read) markRead([n.id]);
                    router.push(n.href);
                  }}
                  className={`flex w-full items-start gap-2.5 border-b border-line px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2 ${
                    n.read ? "opacity-55" : ""}`}>
                  <Icon size={14} className="mt-0.5 shrink-0" style={{ color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-bold text-ink">{n.title}</span>
                    <span className="block text-[10.5px] leading-snug text-muted">{n.detail}</span>
                  </span>
                  {!n.read && <i className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--cyan)" }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const NAV = [
  { href: "/panel", label: "Panel", icon: LayoutDashboard },
  { href: "/panel/diagnostico", label: "Diagnóstico", icon: Radar, code: "M1" },
  { href: "/panel/benchmark", label: "Benchmark", icon: Globe2, code: "M2" },
  { href: "/panel/estrategia", label: "Estrategia", icon: Network, code: "M3" },
  { href: "/panel/kpi", label: "Indicadores", icon: Gauge, code: "M4" },
  { href: "/panel/ruta", label: "Ruta", icon: MapIcon, code: "M5" },
  { href: "/panel/iniciativas", label: "Iniciativas", icon: ListChecks, code: "M6" },
  { href: "/panel/proyectos", label: "Proyectos", icon: KanbanSquare, code: "GP" },
  { href: "/panel/bi", label: "Inteligencia", icon: BarChart3, code: "M7" },
  { href: "/panel/informe", label: "Informe", icon: FileText },
  { href: "/panel/metodologia", label: "Metodología", icon: BookOpen },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin de la plataforma",
  CONSULTOR: "Advisor 4Shine",
  LIDER: "Líder de la empresa",
  RESPONSABLE: "Responsable de capacidad",
  DIRECTIVO: "Junta o directivo",
};

const RAIL_W = 232;
const RAIL_W_MIN = 76;

export function AppShell({ children, user }: {
  children: ReactNode;
  user: { name: string; role: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // branding: nombres y acento definidos en /panel/admin/branding
  const [brand, setBrand] = useState<{ institutionName: string; shortName: string; platformName?: string; logoDark?: string | null; logoLight?: string | null } | null>(null);
  useEffect(() => {
    fetch("/api/branding").then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (j?.branding) {
        setBrand(j.branding);
        applyTheme(j.branding);
      }
    }).catch(() => null);
  }, []);

  // el colapso persiste; se lee tras montar para no romper la hidratación
  useEffect(() => {
    setCollapsed(localStorage.getItem("pgtd-rail") === "1");
  }, []);
  const toggleRail = () =>
    setCollapsed((c) => {
      localStorage.setItem("pgtd-rail", c ? "0" : "1");
      return !c;
    });

  const current = [...NAV, { href: "/panel/admin", label: "Administración", code: undefined }]
    .slice().reverse().find((n) =>
      n.href === "/panel" ? pathname === "/panel" : pathname.startsWith(n.href));

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navList = user.role === "ADMIN" || user.role === "CONSULTOR"
    ? [...NAV, { href: "/panel/admin", label: "Administración", icon: Users2 }]
    : NAV;

  const navItems = (mini: boolean) => (
    <nav className={`flex flex-col gap-1 ${mini ? "px-2.5" : "px-3"}`}>
      {!mini && <div className="label mb-1 px-3 !text-white/30">Módulos</div>}
      {navList.map((item) => {
        const active = item.href === "/panel"
          ? pathname === "/panel"
          : pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
            title={mini ? item.label : undefined}
            className={`group relative flex items-center rounded-xl text-[13px] font-medium transition-all duration-150 ${
              mini ? "justify-center px-0 py-[10px]" : "gap-3 px-3 py-[9px]"
            } ${
              active
                ? "bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                : "text-white/50 hover:bg-white/[0.05] hover:text-white/85" + (mini ? "" : " hover:translate-x-[2px]")
            }`}>
            {active && (
              <span className="spine absolute left-0 top-1/2 h-[58%] w-[3px] -translate-y-1/2 rounded-r-full" />
            )}
            <item.icon size={mini ? 18 : 16} strokeWidth={active ? 2.4 : 1.9}
              className={active ? "text-cyan-fill" : ""} />
            {!mini && <span className="flex-1">{item.label}</span>}
            {!mini && item.code && (
              <span className={`num text-[9px] tracking-wider ${active ? "text-cyan-fill/90" : "text-white/25"}`}>
                {item.code}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* rail escritorio */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col transition-[width] duration-200 lg:flex"
        style={{ background: "var(--grad-deep)", width: collapsed ? RAIL_W_MIN : RAIL_W }}>
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(420px 220px at 100% 0%, rgb(79 208 236 / 0.09), transparent 60%)" }} />
        <div className={`relative flex items-center pb-6 pt-5 ${collapsed ? "justify-center px-0" : "gap-2.5 px-5"}`}>
          {brand?.logoDark || brand?.logoLight ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={(brand.logoDark ?? brand.logoLight)!} alt="" className="h-7 max-w-[140px] object-contain" />
          ) : (
            <AlgoritmoMark size={27} />
          )}
          {!collapsed && !(brand?.logoDark || brand?.logoLight) && (
            <div className="leading-tight">
              <div className="text-[13.5px] font-extrabold tracking-tight text-white">{brand?.platformName ?? "PGTD"}</div>
              <div className="text-[8.5px] font-semibold uppercase tracking-[0.16em] text-white/35">
                Algoritmo T
              </div>
            </div>
          )}
        </div>
        <div className="relative">{navItems(collapsed)}</div>
        <div className={`relative mt-auto pb-4 ${collapsed ? "px-2.5" : "px-4"}`}>
          {!collapsed && (
            <div className="mb-3 overflow-hidden rounded-xl bg-white/[0.05] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]">
              <div className="spine h-[2.5px]" />
              <div className="px-4 py-3">
                <div className="text-[12.5px] font-bold text-white">{brand?.shortName ?? INSTITUTION.shortName}</div>
                <div className="mt-0.5 text-[10.5px] leading-snug text-white/40">{brand?.institutionName ?? INSTITUTION.name}</div>
              </div>
            </div>
          )}
          <button onClick={toggleRail}
            title={collapsed ? "Expandir menú" : "Contraer menú"}
            className={`flex w-full items-center rounded-xl py-2 text-[12.5px] font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white ${
              collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}>
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            {!collapsed && "Contraer menú"}
          </button>
          <button onClick={logout}
            title={collapsed ? "Cerrar sesión" : undefined}
            className={`flex w-full items-center rounded-xl py-2 text-[12.5px] font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white ${
              collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}>
            <LogOut size={14} /> {!collapsed && "Cerrar sesión"}
          </button>
        </div>
      </aside>

      {/* drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-deep/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[256px] flex-col pt-5"
            style={{ background: "var(--grad-deep)" }}>
            <div className="mb-5 flex items-center justify-between px-5">
              <div className="flex items-center gap-2.5">
                <AlgoritmoMark size={24} />
                <span className="text-[13.5px] font-extrabold text-white">PGTD</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60"><X size={18} /></button>
            </div>
            {navItems(false)}
          </aside>
        </div>
      )}

      {/* contenido */}
      <div className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${
        collapsed ? "lg:pl-[76px]" : "lg:pl-[232px]"}`}>
        <header className="sticky top-0 z-30 flex h-[54px] items-center gap-3 border-b border-line/70 bg-white/70 px-4 backdrop-blur-xl sm:px-7">
          <button onClick={() => setOpen(true)} className="text-muted lg:hidden"><Menu size={19} /></button>

          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="truncate text-[13.5px] font-bold tracking-tight text-ink">
              {current?.label ?? "Panel"}
            </span>
            {current?.code && (
              <span className="num text-[10px] font-bold tracking-wider text-faint">{current.code}</span>
            )}
          </div>

          <span className="chip chip-gold ml-1 hidden md:inline-flex" title="Datos ilustrativos de Andina Suministros. La información real se produce con el diagnóstico.">
            <FlaskConical size={11} /> Datos demo
          </span>

          <div className="ml-auto flex items-center gap-2.5">
            <SearchButton />
            <NotificationsBell />
            <PublicLinkButton />
            <div className="flex items-center gap-2.5 pl-1">
              <div className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}>
                {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="hidden leading-tight md:block">
                <div className="text-[12px] font-bold text-ink">{user.name}</div>
                <div className="text-[10px] text-faint">{ROLE_LABEL[user.role] ?? user.role}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1220px] flex-1 px-4 py-8 sm:px-8">{children}</main>

        <footer className="px-8 pb-6 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-faint/70">
          Sistema 4Shine® · 4Shine Empresas · Plataforma de gestión estratégica · Algoritmo T
        </footer>
      </div>

      {/* buscador global (⌘K) */}
      <CommandPalette />
    </div>
  );
}
