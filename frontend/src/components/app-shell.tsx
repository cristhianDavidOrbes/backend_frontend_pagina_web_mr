"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Sparkles,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { AvatarDisplay } from "@/components/avatar-display";
import { clearAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type IconName = "route" | "reports" | "ranking" | "students" | "levels" | "profile" | "world" | "logout" | "headset" | "spark" | "code";

type NavLink = {
  href: string;
  label: string;
  icon: IconName;
  exact?: boolean;
};

type RoleConfig = {
  label: string;
  descriptor: string;
  links: NavLink[];
};

const roleConfig: Record<UsuarioSesion["rol"], RoleConfig> = {
  ESTUDIANTE: {
    label: "Portal Estudiante",
    descriptor: "Aprendiz activo",
    links: [
      { href: "/estudiante", label: "Mi ruta", icon: "route", exact: true },
      { href: "/estudiante/ranking", label: "Ranking", icon: "ranking" },
      { href: "/estudiante/reportes", label: "Recomendaciones IA", icon: "reports" },
      { href: "/estudiante/codigo", label: "Programar POO", icon: "code" },
      { href: "/estudiante/perfil", label: "Mi perfil", icon: "profile" },
      { href: "/", label: "Explorar AlgoLab", icon: "world", exact: true },
    ],
  },
  DOCENTE: {
    label: "Observatorio Docente",
    descriptor: "Docente guía",
    links: [
      { href: "/docente", label: "Observatorio", icon: "route", exact: true },
      { href: "/docente/estudiantes", label: "Estudiantes", icon: "students" },
      { href: "/docente/reportes", label: "Evidencias grupo", icon: "reports" },
      { href: "/docente/perfil", label: "Mi perfil", icon: "profile" },
      { href: "/", label: "Explorar AlgoLab", icon: "world", exact: true },
    ],
  },
  ADMINISTRADOR: {
    label: "Consola de Control",
    descriptor: "Administrador del sistema",
    links: [
      { href: "/administrador", label: "Centro de control", icon: "route", exact: true },
      { href: "/administrador/usuarios", label: "Usuarios", icon: "students" },
      { href: "/administrador/niveles", label: "Niveles", icon: "levels" },
      { href: "/administrador/tutor-ia", label: "Tutor IA", icon: "spark" },
      { href: "/administrador/perfil", label: "Mi perfil", icon: "profile" },
      { href: "/", label: "Explorar AlgoLab", icon: "world", exact: true },
    ],
  },
};

type Props = {
  usuario: UsuarioSesion | null;
  children: React.ReactNode;
  eyebrow: string;
  title: string;
};

function ShellIcon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    className: className ?? "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
  };

  if (name === "route") {
    return (
      <svg {...common}>
        <rect height="7" rx="2" width="7" x="3" y="3" />
        <rect height="7" rx="2" width="7" x="14" y="3" />
        <rect height="7" rx="2" width="7" x="3" y="14" />
        <path d="M14 17.5h7M17.5 14v7" />
      </svg>
    );
  }
  if (name === "reports") {
    return (
      <svg {...common}>
        <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
        <path d="M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" />
      </svg>
    );
  }
  if (name === "ranking") {
    return (
      <svg {...common}>
        <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
        <path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6" />
      </svg>
    );
  }
  if (name === "students") {
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === "levels") {
    return (
      <svg {...common}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }
  if (name === "profile") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" />
      </svg>
    );
  }
  if (name === "world") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.8 12h16.4M12 3.5c2.3 2.5 3.5 5.3 3.5 8.5S14.3 18 12 20.5C9.7 18 8.5 15.2 8.5 12S9.7 6 12 3.5Z" />
      </svg>
    );
  }
  if (name === "logout") {
    return (
      <svg {...common}>
        <path d="M10 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H10M14.5 8l4 4-4 4M9 12h9" />
      </svg>
    );
  }
  if (name === "headset") {
    return (
      <svg {...common}>
        <path d="M4 13v-2a8 8 0 0 1 16 0v2M5.5 12H7a1 1 0 0 1 1 1v5H6.5A2.5 2.5 0 0 1 4 15.5v-1A2.5 2.5 0 0 1 6.5 12ZM18.5 12H17a1 1 0 0 0-1 1v5h1.5a2.5 2.5 0 0 0 2.5-2.5v-1a2.5 2.5 0 0 0-2.5-2.5Z" />
      </svg>
    );
  }
  if (name === "code") {
    return (
      <svg {...common}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="m12 3 1.3 4.2a5.3 5.3 0 0 0 3.5 3.5L21 12l-4.2 1.3a5.3 5.3 0 0 0-3.5 3.5L12 21l-1.3-4.2a5.3 5.3 0 0 0-3.5-3.5L3 12l4.2-1.3a5.3 5.3 0 0 0 3.5-3.5L12 3Z" />
    </svg>
  );
}

export function AppShell({ usuario, children, eyebrow, title }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuDialogRef = useRef<HTMLElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);

  const config = usuario ? roleConfig[usuario.rol] : roleConfig.ESTUDIANTE;
  const links = config.links;
  const isCodeWorkspace = /^\/estudiante\/codigo\/\d+/.test(pathname);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = mobileMenuButtonRef.current;
    const desktopMedia = window.matchMedia("(min-width: 1024px)");
    document.body.style.overflow = "hidden";
    mobileMenuCloseRef.current?.focus();

    function closeWhenDesktop(event: MediaQueryListEvent) {
      if (event.matches) setMobileMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = mobileMenuDialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    desktopMedia.addEventListener("change", closeWhenDesktop);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      desktopMedia.removeEventListener("change", closeWhenDesktop);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [mobileMenuOpen]);

  function toggleDesktopSidebar() {
    setDesktopCollapsed((current) => !current);
  }

  function salir() {
    clearAuthSession();
    router.replace("/iniciar-sesion");
  }

  const navContent = (
    <div className="sidebar-nav-content flex min-h-0 flex-1 flex-col justify-between overflow-y-auto scrollbar-none">
      <div>
        <Link
          className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/[.035]"
          href="/"
          onClick={() => setMobileMenuOpen(false)}
        >
          <span className="brand-mark transition duration-300 group-hover:rotate-3 group-hover:scale-105">
            A
          </span>
          <span className="min-w-0" data-sidebar-hide>
            <strong className="block text-lg tracking-[-.03em] text-white">AlgoLab</strong>
            <small className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.25em] text-emerald-300/75">
              <span className="h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />{" "}
              Portal MR activo
            </small>
          </span>
        </Link>

        <div className="mt-5 flex items-center justify-between px-2" data-sidebar-hide>
          <span className="font-mono text-[9px] uppercase tracking-[.22em] text-slate-500">
            Navegación
          </span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[8px] text-slate-400">
            {config.label.split(" ")[1] ?? "WEB"}
          </span>
        </div>

        <nav aria-label="Navegación principal" className="mt-2 flex flex-col gap-1.5">
          {links.map((link) => {
            const active =
              "exact" in link && link.exact
                ? pathname === link.href
                : link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(link.href + "/");

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition ${
                  active
                    ? "border-emerald-300/30 bg-emerald-300/[.12] text-emerald-100 shadow-[inset_3px_0_0_#34d399,0_0_20px_rgba(46,214,161,.1)]"
                    : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[.04] hover:text-white"
                }`}
                href={link.href}
                key={link.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                    active
                      ? "bg-emerald-300/15 text-emerald-300"
                      : "bg-white/[.04] text-slate-400 group-hover:text-emerald-200"
                  }`}
                >
                  <ShellIcon name={link.icon} />
                </span>
                <span data-sidebar-hide>{link.label}</span>
                {active ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" data-sidebar-hide />
                ) : null}
              </Link>
            );
          })}
        </nav>

      </div>

      {/* User card at bottom */}
      <div className="sidebar-user-section pt-4">
        <div className="sidebar-user-card rounded-[1.25rem] border border-white/10 bg-white/[.035] p-3 backdrop-blur-md">
          <div className="sidebar-user-row flex min-w-0 items-center gap-3">
            {usuario ? (
              <AvatarDisplay
                className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[.85rem] border border-white/15 text-sm font-extrabold text-white shadow-lg ring-1 ring-emerald-400/20 [&>img]:object-cover"
                usuario={usuario}
              />
            ) : (
              <span className="h-10 w-10 animate-pulse rounded-[.85rem] bg-white/5" />
            )}
            <div className="min-w-0 flex-1" data-sidebar-hide>
              <strong className="block truncate text-xs font-bold text-slate-100">
                {usuario?.nombre ?? "Sincronizando…"}
              </strong>
              <small className="mt-0.5 block truncate text-[9px] text-emerald-300/80">
                {usuario ? config.descriptor : ""}
              </small>
            </div>
          </div>
          <button
            className="sidebar-logout mt-2.5 flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200 active:scale-95"
            onClick={salir}
            type="button"
          >
            <span data-sidebar-hide>Cerrar sesión</span>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-surface min-h-screen text-slate-100">
      {/* Mobile Sticky Top Header (< md screens) */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-white/10 bg-[#05100e]/95 px-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <button
            aria-controls="algolab-mobile-navigation"
            aria-expanded={mobileMenuOpen}
            aria-label="Abrir menú de navegación"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 transition hover:bg-white/[.08] hover:text-white active:scale-95"
            onClick={() => setMobileMenuOpen(true)}
            ref={mobileMenuButtonRef}
            type="button"
          >
            <Menu size={20} />
          </button>
          <Link className="flex items-center gap-2" href="/">
            <span className="brand-mark h-8 w-8 text-sm font-bold">A</span>
            <strong className="hidden text-sm font-bold text-white min-[370px]:block">AlgoLab</strong>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 font-mono text-[8px] font-semibold uppercase text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />
            <span className="min-[390px]:hidden">Sesión</span>
            <span className="hidden min-[390px]:inline">{config.label.split(" ")[1] ?? "Sesión"}</span>
          </span>
          {usuario ? (
            <AvatarDisplay
              className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg border border-white/15 text-xs font-bold text-white [&>img]:object-cover"
              usuario={usuario}
            />
          ) : null}
        </div>
      </header>

      {/* Mobile Slide-Over Drawer with Animated Backdrop */}
      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.div
              aria-hidden="true"
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              animate={{ x: 0 }}
              aria-labelledby="algolab-mobile-menu-title"
              aria-modal="true"
              className="fixed inset-y-0 left-0 z-50 flex w-[290px] max-w-[88vw] flex-col overflow-y-auto border-r border-white/10 bg-[#05100e] p-4 shadow-2xl scrollbar-none sm:p-5 lg:hidden"
              exit={{ x: "-100%" }}
              id="algolab-mobile-navigation"
              initial={{ x: "-100%" }}
              ref={mobileMenuDialogRef}
              role="dialog"
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-mono text-xs text-slate-400 font-semibold tracking-wider" id="algolab-mobile-menu-title">
                  MENÚ PRINCIPAL
                </span>
                <button
                  aria-label="Cerrar menú"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                  ref={mobileMenuCloseRef}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
            <div className="mt-4 flex min-h-0 flex-1 flex-col">
                {navContent}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Desktop & Tablet 100% FIXED Left Sidebar (>= md screens) */}
      <aside
        className={`desktop-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-white/10 bg-[#05100e]/98 shadow-[0_20px_70px_rgba(0,0,0,.3)] backdrop-blur-2xl transition-[width,padding] duration-300 lg:flex ${
          desktopCollapsed
            ? "desktop-sidebar-collapsed w-[96px] p-3"
            : "w-[260px] p-5 xl:w-[285px] 2xl:w-[320px] min-[2560px]:w-[360px]"
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
        />
        <button
          aria-expanded={!desktopCollapsed}
          aria-label={desktopCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          className="mb-3 ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-400 transition hover:border-emerald-300/25 hover:bg-emerald-300/10 hover:text-emerald-200"
          onClick={toggleDesktopSidebar}
          title={desktopCollapsed ? "Expandir menú" : "Contraer menú"}
          type="button"
        >
          {desktopCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        {navContent}
      </aside>

      {/* Main Content Area: Offset with padding-left on >= md */}
      <div
        className={`min-h-screen w-full transition-[padding] duration-300 ${
          desktopCollapsed
            ? "lg:pl-[96px]"
            : "lg:pl-[260px] xl:pl-[285px] 2xl:pl-[320px] min-[2560px]:pl-[360px]"
        }`}
      >
        <main
          className={
            isCodeWorkspace
              ? "mx-auto w-full max-w-none p-2 sm:p-3 lg:p-4 min-[2560px]:p-8"
              : "mx-auto w-full max-w-[1720px] 2xl:max-w-[2200px] min-[2560px]:max-w-[2700px] px-3 py-4 min-[390px]:px-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7 2xl:px-10 min-[2560px]:px-14 min-[2560px]:py-10"
          }
        >
          {/* Main Top Header Banner */}
          {!isCodeWorkspace ? (
          <header className="relative mb-4 min-w-0 overflow-hidden border-b border-white/10 pb-3 pt-1 sm:mb-5 sm:pb-4 lg:mb-6">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-emerald-300/[.07] blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute right-[18%] top-0 h-px w-40 bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
            />
            <div className="relative flex min-w-0 items-end justify-between gap-3 sm:gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <p className="section-kicker flex items-center gap-2">
                    <Sparkles size={12} className="text-emerald-300" /> {eyebrow}
                  </p>
                  <h1 className="mt-1 break-words text-lg font-bold leading-tight tracking-[-.035em] text-white min-[390px]:text-xl sm:text-2xl">
                    {title}
                  </h1>
                </div>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.08] px-3 py-1.5 text-[9px] text-emerald-200 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /> Sincronizado
              </span>
            </div>
          </header>
          ) : null}

          {/* Subpage Children Content */}
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
