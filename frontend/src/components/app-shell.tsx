"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sparkles, LogOut, Headphones } from "lucide-react";

import { AvatarDisplay } from "@/components/avatar-display";
import { clearAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type IconName = "route" | "reports" | "students" | "levels" | "profile" | "world" | "logout" | "headset" | "spark";

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
      { href: "/estudiante/reportes", label: "Recomendaciones IA", icon: "reports" },
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

  const config = usuario ? roleConfig[usuario.rol] : roleConfig.ESTUDIANTE;
  const links = config.links;

  function salir() {
    clearAuthSession();
    router.replace("/iniciar-sesion");
  }

  const navContent = (
    <>
      <Link
        className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/[.035]"
        href="/"
        onClick={() => setMobileMenuOpen(false)}
      >
        <span className="brand-mark transition duration-300 group-hover:rotate-3 group-hover:scale-105">
          A
        </span>
        <span className="min-w-0">
          <strong className="block text-lg tracking-[-.03em] text-white">AlgoLab</strong>
          <small className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.25em] text-emerald-300/75">
            <span className="h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />{" "}
            Portal MR activo
          </small>
        </span>
      </Link>

      <div className="mt-5 flex items-center justify-between px-2">
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
              <span>{link.label}</span>
              {active ? (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7]" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* Puente con las gafas banner */}
      <div className="mt-5 rounded-[1.25rem] border border-cyan-200/10 bg-gradient-to-br from-cyan-300/[.07] to-emerald-300/[.025] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-200/[.07] text-cyan-200">
            <Headphones size={16} />
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> En línea
          </span>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-200">Puente con las gafas</p>
        <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
          Perfil, progreso e informes comparten el mismo estado de aprendizaje en tiempo real.
        </p>
      </div>

      {/* User profile widget at bottom of sidebar */}
      <div className="mt-auto pt-4">
        <div className="rounded-[1.25rem] border border-white/10 bg-white/[.035] p-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-3">
            {usuario ? (
              <AvatarDisplay
                className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[.85rem] border border-white/15 text-sm font-extrabold text-white shadow-lg ring-1 ring-emerald-400/20 [&>img]:object-cover"
                usuario={usuario}
              />
            ) : (
              <span className="h-10 w-10 animate-pulse rounded-[.85rem] bg-white/5" />
            )}
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-bold text-slate-100">
                {usuario?.nombre ?? "Sincronizando…"}
              </strong>
              <small className="mt-0.5 block truncate text-[10px] text-emerald-300/80">
                {usuario ? config.descriptor : ""}
              </small>
            </div>
          </div>
          <button
            className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-[11px] font-medium text-slate-400 transition hover:border-rose-400/25 hover:bg-rose-500/10 hover:text-rose-200 active:scale-95"
            onClick={salir}
            type="button"
          >
            <span>Cerrar sesión</span>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <main className="app-surface min-h-screen text-slate-100">
      {/* Mobile Top Header (only visible on screens < lg) */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#05100e]/95 px-4 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2.5">
          <button
            aria-label="Abrir menú de navegación"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 transition hover:bg-white/[.08] hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>
          <Link className="flex items-center gap-2" href="/">
            <span className="brand-mark h-8 w-8 text-sm">A</span>
            <strong className="text-base font-bold text-white">AlgoLab</strong>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 font-mono text-[9px] font-semibold text-emerald-300 uppercase">
            {config.label.split(" ")[1] ?? "MR"}
          </span>
          {usuario ? (
            <AvatarDisplay
              className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg border border-white/15 text-xs font-bold text-white [&>img]:object-cover"
              usuario={usuario}
            />
          ) : null}
        </div>
      </header>

      {/* Mobile Drawer (Slide-over overlay) */}
      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              animate={{ x: 0 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[290px] max-w-[85vw] flex-col border-r border-white/10 bg-[#05100e] p-5 shadow-2xl overflow-y-auto scrollbar-none lg:hidden"
              exit={{ x: "-100%" }}
              initial={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="font-mono text-xs text-slate-400 font-semibold tracking-wider">
                  MENÚ PRINCIPAL
                </span>
                <button
                  aria-label="Cerrar menú"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-slate-400 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                  type="button"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="mt-4 flex flex-1 flex-col">
                {navContent}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      {/* Desktop Fixed Left Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-white/10 bg-[#05100e]/95 p-5 shadow-[0_20px_70px_rgba(0,0,0,.25)] backdrop-blur-2xl overflow-y-auto scrollbar-none lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
        />
        {navContent}
      </aside>

      {/* Main Content Area (Offset with left padding on desktop) */}
      <div className="min-w-0 w-full lg:pl-[280px]">
        <section className="relative z-10 mx-auto max-w-[1480px] px-4 py-5 sm:px-7 lg:px-9 lg:py-8 xl:px-12">
          {/* Main Top Header Banner */}
          <header className="relative mb-7 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#071713]/70 p-5 shadow-[0_26px_80px_rgba(0,0,0,.2)] backdrop-blur-xl sm:p-6 lg:mb-8">
            <div
              aria-hidden="true"
              className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-emerald-300/[.07] blur-3xl"
            />
            <div
              aria-hidden="true"
              className="absolute right-[18%] top-0 h-px w-40 bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
            />
            <div className="relative flex flex-wrap items-end justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                {usuario ? (
                  <AvatarDisplay
                    className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-200/15 text-base font-extrabold text-white shadow-[0_12px_35px_rgba(0,0,0,.28)] [&>img]:object-cover"
                    usuario={usuario}
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="section-kicker flex items-center gap-2">
                    <Sparkles size={14} className="text-emerald-300" /> {eyebrow}
                  </p>
                  <h1 className="mt-1.5 truncate text-2xl font-bold tracking-[-.04em] text-white sm:text-3xl lg:text-4xl">
                    {title}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] uppercase tracking-[.14em] text-slate-300">
                  {usuario ? config.label : "Sesión"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.08] px-3 py-1.5 text-[10px] text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />{" "}
                  Datos sincronizados
                </span>
              </div>
            </div>
          </header>

          {/* Subpage Children Content */}
          <div className="min-w-0 w-full">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
