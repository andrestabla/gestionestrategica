"use client";

// Shell v2: rail oscuro contraíble con indicador de gradiente, topbar con
// contexto del módulo activo y píldora única de modo demo. El estado de
// colapso persiste en localStorage (pgtd-rail).

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Radar, Globe2, Network, Gauge, Map as MapIcon, ListChecks,
  BarChart3, LayoutDashboard, LogOut, Menu, X, Share2, KanbanSquare, BookOpen,
  PanelLeftClose, PanelLeftOpen, Bell, ShieldAlert, AlertTriangle, Info, AtSign, CheckCheck,
  FileText, Users2, ArrowRightLeft, Presentation, Target, Rocket, Scale, Layers, CalendarDays, Moon, Sun, EyeOff, Lock } from "lucide-react"
import { AlgoritmoMark } from "@/components/logo";
import { ACCESS_TABS, type CompanyMode } from "@/lib/acceso";
import { vocabOf, ESTRATEGIA_SLUG } from "@/lib/vocabulario";
import { moduleOfRoute, moduleLabel, moduleState, type ModuleId, type ModuleState } from "@/lib/modulos";
const CV_ICON = { direccion: Target, okr: Gauge, iniciativas: Rocket, priorizacion: Scale, portafolio: Layers } as const;
import { CommandPalette, SearchButton } from "@/components/command-palette";
import type { SessionUser } from "@/lib/session";
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
      title="Genera el enlace público de solo lectura, lo copia al portapapeles y lo abre" aria-label="Genera el enlace público de solo lectura, lo copia al portapapeles y lo abre">
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
  if (n.severity === 1) return { Icon: ShieldAlert, color: "var(--bad-text)" };
  if (n.severity === 2) return { Icon: AlertTriangle, color: "var(--warn-text)" };
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
          <span className="num absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[11px] font-extrabold text-white"
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
                className="flex items-center gap-1 text-[12px] font-semibold text-muted hover:text-cyan-deep">
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
                    <span className="block text-[12px] leading-snug text-muted">{n.detail}</span>
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
  { href: "/panel", label: "Panel", icon: LayoutDashboard, code: undefined as string | undefined, mod: undefined as ModuleId | undefined },
  { href: "/panel/diagnostico", label: "Diagnóstico", icon: Radar, code: "M1", mod: "diagnostico" as ModuleId | undefined },
  { href: "/panel/benchmark", label: "Benchmark", icon: Globe2, code: "M2", mod: "benchmark" as ModuleId | undefined },
  { href: "/panel/estrategia", label: "Estrategia", icon: Network, code: "M3", mod: "estrategia" as ModuleId | undefined },
  { href: "/panel/kpi", label: "Indicadores", icon: Gauge, code: "M4", mod: "kpi" as ModuleId | undefined },
  { href: "/panel/ruta", label: "Ruta", icon: MapIcon, code: "M5", mod: "ruta" as ModuleId | undefined },
  { href: "/panel/iniciativas", label: "Iniciativas", icon: ListChecks, code: "M6", mod: "seguimiento" as ModuleId | undefined },
  { href: "/panel/convencion", label: "Convención", icon: Presentation, code: "CV", mod: "convencion" as ModuleId | undefined },
  { href: "/panel/proyectos", label: "Proyectos", icon: KanbanSquare, code: "GP", mod: "proyectos" as ModuleId | undefined },
  { href: "/panel/bi", label: "Inteligencia", icon: BarChart3, code: "M7", mod: "inteligencia" as ModuleId | undefined },
  { href: "/panel/informe", label: "Informe", icon: FileText, mod: "informe" as ModuleId | undefined },
  { href: "/panel/metodologia", label: "Metodología", icon: BookOpen, mod: "metodologia" as ModuleId | undefined },
];

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin de la plataforma",
  CONSULTOR: "Advisor",
  LIDER: "Líder de la empresa",
  RESPONSABLE: "Responsable de ámbito",
  DIRECTIVO: "Junta o directivo",
};

const RAIL_W = 232;
const RAIL_W_MIN = 76;

export function AppShell({ children, user, companies = [], mode = "completa", modulesOff = [], modulesPending = [] }: {
  children: ReactNode;
  user: SessionUser;
  companies?: { slug: string; name: string; shortName: string; active: boolean }[];
  mode?: CompanyMode;
  modulesOff?: ModuleId[];   // módulos fuera del alcance de esta empresa (no aparecen)
  modulesPending?: ModuleId[]; // módulos del alcance aún no habilitados (aparecen atenuados)
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const convencion = mode === "convencion";
  const acomp = mode === "acompanamiento";
  const V = vocabOf({ mode });
  const router = useRouter();
  const company = user.company;
  const base = company ? `/${company.slug}` : "";
  // la ruta interna, sin el prefijo de empresa, para resaltar el módulo activo
  const path = base && pathname.startsWith(base) ? (pathname.slice(base.length) || "/panel") : pathname;
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
      n.href === "/panel" ? path === "/panel" : path.startsWith(n.href));

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // modo convención: solo las cinco secciones (y Administración para quien administra)
  const NAV_CV = [{ href: "/panel/convencion?t=itinerario", label: "Itinerario", icon: CalendarDays, code: undefined as string | undefined, mod: "itinerario" as ModuleId | undefined }, { href: "/panel/convencion?t=guia", label: "Guía del día 2", icon: BookOpen, code: undefined as string | undefined, mod: "guia" as ModuleId | undefined }, ...ACCESS_TABS.map((s) => ({ href: `/panel/convencion?t=${s.id}`, label: s.label, icon: CV_ICON[s.id], code: undefined as string | undefined, mod: s.id as ModuleId | undefined }))];
  // modo acompañamiento: diagnóstico y la ruta de estrategia con el vocabulario de la empresa (prioridades y sponsors), sin QR ni itinerario
  const NAV_AC = [
    { href: "/panel", label: "Panel", icon: LayoutDashboard, code: undefined as string | undefined, mod: undefined as ModuleId | undefined },
    { href: "/panel/diagnostico", label: "Diagnóstico", icon: Radar, code: "M1" as string | undefined, mod: "diagnostico" as ModuleId | undefined },
    { href: `/panel/estrategia/${ESTRATEGIA_SLUG.prioridades}`, label: V.tabs.prioridades, icon: Target, code: undefined as string | undefined, mod: "prioridades" as ModuleId | undefined },
    { href: `/panel/estrategia/${ESTRATEGIA_SLUG.direccion}`, label: V.tabs.direccion, icon: Network, code: undefined as string | undefined, mod: "direccion" as ModuleId | undefined },
    { href: `/panel/estrategia/${ESTRATEGIA_SLUG.okr}`, label: V.tabs.okr, icon: Gauge, code: undefined as string | undefined, mod: "okr" as ModuleId | undefined },
    { href: `/panel/estrategia/${ESTRATEGIA_SLUG.iniciativas}`, label: V.tabs.iniciativas, icon: Rocket, code: undefined as string | undefined, mod: "iniciativas" as ModuleId | undefined },
    { href: `/panel/estrategia/${ESTRATEGIA_SLUG.priorizacion}`, label: V.tabs.priorizacion, icon: Scale, code: undefined as string | undefined, mod: "priorizacion" as ModuleId | undefined },
    { href: `/panel/estrategia/${ESTRATEGIA_SLUG.portafolio}`, label: V.tabs.portafolio, icon: Layers, code: undefined as string | undefined, mod: "portafolio" as ModuleId | undefined },
    { href: "/panel/bi", label: "Inteligencia", icon: BarChart3, code: "M7" as string | undefined, mod: "inteligencia" as ModuleId | undefined },
  ];
  // los módulos fuera del alcance no aparecen en el menú de nadie (admin y advisor los abren por la URL con aviso);
  // los pendientes aparecen atenuados, con candado, para que la empresa sepa qué viene
  const modCfg = { modulesOff, modulesPending };
  const estado = (id: ModuleId | undefined): ModuleState => (id ? moduleState(modCfg, id) : "on");
  const baseNav = (convencion ? NAV_CV : acomp ? NAV_AC : NAV).filter((n) => estado(n.mod) !== "off");
  const navList = user.role === "ADMIN" || user.role === "CONSULTOR"
    ? [...baseNav, { href: "/panel/admin", label: "Administración", icon: Users2, code: undefined as string | undefined, mod: undefined as ModuleId | undefined }]
    : baseNav;
  const isActive = (href: string) => {
    if (href.includes("?t=")) return path.startsWith("/panel/convencion") && (searchParams.get("t") ?? (acomp ? "prioridades" : "direccion")) === href.split("?t=")[1];
    if ((convencion || acomp) && href === "/panel/admin") return path.startsWith("/panel/admin");
    return href === "/panel" ? path === "/panel" : path.startsWith(href);
  };

  // bloque de empresa: nombre de la activa y, para el admin, el paso a la pantalla de elección
  const companyBlock = (
    <>
      {user.role === "ADMIN" && <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/35">Empresa activa</div>}
      <div className="text-[12.5px] font-bold text-white">{brand?.shortName ?? company?.shortName ?? "Sin empresa"}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-white/40">{brand?.institutionName ?? company?.name ?? "Elige una empresa para operar"}</div>
      {user.role === "ADMIN" && companies.length > 0 && (
        <Link href="/empresas" onClick={() => setOpen(false)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/[0.08] px-2.5 py-1.5 text-[12px] font-bold text-white/85 transition-colors hover:bg-white/[0.14] hover:text-white">
          <ArrowRightLeft size={12} /> Cambiar de empresa
        </Link>
      )}
    </>
  );

  const navItems = (mini: boolean) => (
    <nav className={`flex flex-col gap-1 ${mini ? "px-2.5" : "px-3"}`}>
      {!mini && <div className="label mb-1 px-3 !text-white/30">{convencion ? "Convención" : "Módulos"}</div>}
      {navList.map((item) => {
        const active = isActive(item.href);
        if (estado(item.mod) === "pendiente") {
          return (
            <Link key={item.href} href={base + item.href} onClick={() => setOpen(false)}
              title={`${item.label} · próximamente, conforme avance el acompañamiento`}
              className={`group relative flex items-center rounded-xl text-[13px] font-medium text-white/30 transition-colors hover:bg-white/[0.04] hover:text-white/50 ${mini ? "justify-center px-0 py-[10px]" : "gap-3 px-3 py-[9px]"}`}>
              <item.icon size={mini ? 18 : 16} strokeWidth={1.9} />
              {!mini && <span className="flex-1">{item.label}</span>}
              <Lock size={mini ? 10 : 12} className={mini ? "absolute right-1.5 top-1.5" : "opacity-70"} />
            </Link>
          );
        }
        return (
          <Link key={item.href} href={base + item.href} onClick={() => setOpen(false)}
            title={item.code ? `${item.label} · ${item.code}` : mini ? item.label : undefined}
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
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* rail escritorio */}
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
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
              <div className="text-[13.5px] font-extrabold tracking-tight text-white">{brand?.platformName ?? "Gestión estratégica"}</div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                4Shine Empresas
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
                {companyBlock}
              </div>
            </div>
          )}
          <button onClick={toggleRail}
            title={collapsed ? "Expandir menú" : "Contraer menú"} aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            className={`flex w-full items-center rounded-xl py-2 text-[12.5px] font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white ${
              collapsed ? "justify-center px-0" : "gap-2.5 px-3"}`}>
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            {!collapsed && "Contraer menú"}
          </button>
          <button onClick={logout}
            title={collapsed ? "Cerrar sesión" : undefined} aria-label={collapsed ? "Cerrar sesión" : undefined}
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
                {brand?.logoDark || brand?.logoLight ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={(brand.logoDark ?? brand.logoLight)!} alt="" className="h-6 max-w-[140px] object-contain" />
                ) : (
                  <>
                    <AlgoritmoMark size={24} />
                    <span className="text-[13.5px] font-extrabold text-white">{brand?.platformName ?? "Gestión estratégica"}</span>
                  </>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-white/60"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">{navItems(false)}</div>
            <div className="mt-auto px-4 pb-5 pt-4">
              <div className="mb-3 overflow-hidden rounded-xl bg-white/[0.05] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]">
                <div className="spine h-[2.5px]" />
                <div className="px-4 py-3">{companyBlock}</div>
              </div>
              <button onClick={logout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[12.5px] font-medium text-white/45 transition-colors hover:bg-white/[0.05] hover:text-white">
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>
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
              {convencion && path.startsWith("/panel/convencion") ? ((searchParams.get("t") === "itinerario" ? "Itinerario" : ACCESS_TABS.find((x) => x.id === (searchParams.get("t") ?? "direccion"))?.label) ?? "Convención")
                : acomp && (path.startsWith("/panel/estrategia/") || path.startsWith("/panel/convencion")) ? (NAV_AC.filter((n) => n.href.startsWith("/panel/estrategia/")).find((n) => path.startsWith(n.href))?.label ?? "Estrategia")
                : (current?.label ?? "Panel")}
            </span>
            {current?.code && !(acomp && (path.startsWith("/panel/convencion") || path.startsWith("/panel/estrategia/"))) && (
              <span className="num text-[12px] font-bold tracking-wider text-faint">{current.code}</span>
            )}
          </div>


          <div className="ml-auto flex items-center gap-2.5">
            <span className="hidden sm:inline-flex"><SearchButton /></span>
            <NotificationsBell />
            <ThemeToggle />
            {/* la vista pública de la plataforma completa no aplica a la convención: se oculta en ese modo */}
            {!convencion && <span className="hidden sm:inline-flex"><PublicLinkButton /></span>}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="grid h-8 w-8 place-items-center rounded-full text-[12px] font-bold text-white shadow-md"
                style={{ background: "linear-gradient(135deg, var(--cyan-deep), var(--navy))" }}>
                {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div className="hidden leading-tight md:block">
                <div className="text-[12px] font-bold text-ink">{user.name}</div>
                <div className="text-[12px] text-faint">{ROLE_LABEL[user.role] ?? user.role}</div>
              </div>
            </div>
          </div>
        </header>

        <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[1220px] flex-1 px-4 py-5 sm:px-8 sm:py-8 2xl:max-w-[1520px] outline-none"><ModuloGuard path={path} t={searchParams.get("t")} mode={mode} modulesOff={modulesOff} modulesPending={modulesPending} base={base} gestiona={user.role === "ADMIN" || user.role === "CONSULTOR"}>{children}</ModuloGuard></main>

        <footer className="px-8 pb-6 pt-2 text-[12px] font-medium uppercase tracking-[0.14em] text-faint/70">
          Gestión estratégica · plataforma de 4Shine Empresas
        </footer>
      </div>

      {/* buscador global (⌘K) */}
      <CommandPalette />
    </div>
  );
}


/* ═══ Tema claro u oscuro por usuario (MASTER · tema oscuro derivado de los tokens). Se guarda en el navegador. ═══ */
function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("pgtd-theme") === "dark";
    setDark(saved); document.documentElement.dataset.theme = saved ? "dark" : "";
  }, []);
  const toggle = () => setDark((d) => { const next = !d; localStorage.setItem("pgtd-theme", next ? "dark" : "light"); document.documentElement.dataset.theme = next ? "dark" : ""; return next; });
  return (
    <button type="button" onClick={toggle} aria-pressed={dark} aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} title={dark ? "Tema claro" : "Tema oscuro"}
      className="grid h-9 w-9 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink">
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}


/* ═══ Guarda de módulos: lo que el administrador apagó para la empresa no se abre por la URL. La gente de la
   empresa ve un aviso con vuelta al panel; el admin y el advisor ven el módulo con una franja de aviso. ═══ */
function ModuloGuard({ children, path, t, mode, modulesOff, modulesPending, base, gestiona }: {
  children: ReactNode; path: string; t: string | null; mode: CompanyMode; modulesOff: ModuleId[]; modulesPending: ModuleId[]; base: string; gestiona: boolean;
}) {
  const id = moduleOfRoute(path, t, mode);
  const st = id ? moduleState({ modulesOff, modulesPending }, id) : "on";
  if (!id || st === "on") return <>{children}</>;
  const label = moduleLabel(id, mode);
  const pendiente = st === "pendiente";
  if (gestiona) {
    return (
      <>
        <div className="no-print mb-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-[12.5px] leading-snug text-ink-soft" style={{ background: "var(--gold-wash)" }}>
          {pendiente ? <Lock size={15} className="mt-0.5 shrink-0" style={{ color: "var(--gold-text)" }} /> : <EyeOff size={15} className="mt-0.5 shrink-0" style={{ color: "var(--gold-text)" }} />}
          <span>
            <b className="text-ink">{pendiente ? "Módulo pendiente para la empresa." : "Módulo fuera del alcance de la empresa."}</b>{" "}
            {pendiente
              ? <>«{label}» hace parte del alcance acordado pero aún no está habilitado: sus usuarios lo ven atenuado en el menú y, si lo abren, leen «Próximamente encontrarás esta sección habilitada, conforme avance el proceso de acompañamiento». Tú lo ves para preparar los datos.</>
              : <>«{label}» no aparece en el menú de sus usuarios ni pueden abrirlo; tú lo ves para preparar los datos.</>}
            {" "}Se cambia en <Link href={`${base}/panel/admin`} className="font-semibold text-cyan-deep hover:underline">Administración → Empresas</Link>.
          </span>
        </div>
        {children}
      </>
    );
  }
  return (
    <div className="panel mx-auto max-w-[560px] px-6 py-8 text-center">
      {pendiente ? <Lock size={22} className="mx-auto text-faint" /> : <EyeOff size={22} className="mx-auto text-faint" />}
      <h2 className="mt-3 text-[17px] font-extrabold text-ink">{pendiente ? <>«{label}» · próximamente</> : <>«{label}» no está habilitado para tu empresa</>}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">
        {pendiente
          ? "Próximamente encontrarás esta sección habilitada, conforme avance el proceso de acompañamiento."
          : "Este módulo no hace parte del alcance actual del acompañamiento. Si lo necesitas, pídelo al advisor o al administrador de la plataforma."}
      </p>
      <Link href={`${base}/panel`} className="btn-primary mt-4 inline-flex items-center gap-1.5 text-[12.5px]">Volver al panel</Link>
    </div>
  );
}
