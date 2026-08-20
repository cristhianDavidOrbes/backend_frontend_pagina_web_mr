"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { AvatarDisplay } from "@/components/avatar-display";
import { clearAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type Props = {
  usuario: UsuarioSesion | null;
  children: ReactNode;
  eyebrow: string;
  title: string;
};

type IconName =
  | "dashboard"
  | "reports"
  | "students"
  | "levels"
  | "profile"
  | "world"
  | "logout"
  | "headset"
  | "spark";

const roleConfig = {
  ESTUDIANTE: {
    label: "Estudiante",
    descriptor: "Aprendiz activo",
    links: [
      { href: "/estudiante", label: "Mi ruta", icon: "dashboard" as const, exact: true },
      { href: "/estudiante/reportes", label: "Recomendaciones IA", icon: "reports" as const },
      { href: "/estudiante/perfil", label: "Mi perfil", icon: "profile" as const },
      { href: "/", label: "Explorar AlgoLab", icon: "world" as const },
    ],
  },
  DOCENTE: {
    label: "Docente",
    descriptor: "Mentor del grupo",
    links: [
      { href: "/docente", label: "Observatorio", icon: "dashboard" as const, exact: true },
      { href: "/docente/estudiantes", label: "Estudiantes", icon: "students" as const },
      { href: "/docente/reportes", label: "Evidencias y reportes", icon: "reports" as const },
      { href: "/docente/perfil", label: "Mi perfil", icon: "profile" as const },
      { href: "/", label: "Explorar AlgoLab", icon: "world" as const },
    ],
  },
  ADMINISTRADOR: {
    label: "Administrador",
    descriptor: "Operación AlgoLab",
    links: [
      { href: "/administrador", label: "Centro de control", icon: "dashboard" as const, exact: true },
      { href: "/administrador/usuarios", label: "Usuarios", icon: "students" as const },
      { href: "/administrador/niveles", label: "Niveles y misiones", icon: "levels" as const },
      { href: "/administrador/perfil", label: "Mi perfil", icon: "profile" as const },
      { href: "/", label: "Explorar AlgoLab", icon: "world" as const },
    ],
  },
} as const;

function ShellIcon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (name === "dashboard") {
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
  const config = usuario ? roleConfig[usuario.rol] : roleConfig.ESTUDIANTE;
  const links = config.links;

  function salir() {
    clearAuthSession();
    router.replace("/iniciar-sesion");
  }

  return (
    <main className="app-surface min-h-screen overflow-x-hidden text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1760px] lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="relative z-20 border-b border-white/10 bg-[#05100e]/95 px-4 py-4 shadow-[0_20px_70px_rgba(0,0,0,.18)] backdrop-blur-2xl lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-5 lg:overflow-y-auto scrollbar-none">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent"
          />
          <Link
            className="group flex items-center gap-3 rounded-2xl p-2 transition hover:bg-white/[.035]"
            href="/"
          >
            <span className="brand-mark transition duration-300 group-hover:rotate-3 group-hover:scale-105">
              A
            </span>
            <span className="min-w-0">
              <strong className="block text-lg tracking-[-.03em]">AlgoLab</strong>
              <small className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.25em] text-emerald-300/75">
                <span className="h-1 w-1 rounded-full bg-emerald-300 shadow-[0_0_8px_#6ee7b7]" />{" "}
                Portal MR activo
              </small>
            </span>
          </Link>

          <div className="mt-3 flex items-center justify-between px-2 lg:mt-5">
            <span className="font-mono text-[9px] uppercase tracking-[.22em] text-slate-600">
              Navegación
            </span>
            <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[8px] text-slate-500">
              WEB.02
            </span>
          </div>
          <nav
            aria-label="Navegación principal"
            className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible"
          >
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
                  className={`group flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2 text-sm transition lg:w-full ${
                    active
                      ? "border-emerald-300/25 bg-emerald-300/[.09] text-emerald-100 shadow-[inset_3px_0_0_#34d399]"
                      : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[.035] hover:text-white"
                  }`}
                  href={link.href}
                  key={link.href}
                >
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                      active
                        ? "bg-emerald-300/10 text-emerald-300"
                        : "bg-white/[.035] text-slate-500 group-hover:text-emerald-200"
                    }`}
                  >
                    <ShellIcon name={link.icon} />
                  </span>
                  <span>{link.label}</span>
                  {active ? (
                    <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_#6ee7b7] lg:block" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 hidden overflow-hidden rounded-[1.25rem] border border-cyan-200/10 bg-gradient-to-br from-cyan-300/[.07] to-emerald-300/[.025] p-3.5 lg:block">
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-cyan-200/15 bg-cyan-200/[.07] text-cyan-200">
                <ShellIcon className="h-4 w-4" name="headset" />
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> En línea
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-200">Puente con las gafas</p>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
              Perfil, progreso e informes comparten el mismo estado de aprendizaje.
            </p>
          </div>

          <div className="mt-4 hidden lg:mt-auto lg:block">
            <div className="rounded-[1.25rem] border border-white/10 bg-white/[.035] p-3">
              <div className="flex min-w-0 items-center gap-3">
                {usuario ? (
                  <AvatarDisplay
                    className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[.85rem] border border-white/15 text-sm font-extrabold text-white shadow-lg [&>img]:object-cover"
                    usuario={usuario}
                  />
                ) : (
                  <span className="h-10 w-10 animate-pulse rounded-[.85rem] bg-white/5" />
                )}
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs font-bold text-slate-100">
                    {usuario?.nombre ?? "Sincronizando…"}
                  </strong>
                  <small className="mt-0.5 block truncate text-[9px] text-emerald-300/80">
                    {usuario ? config.descriptor : ""}
                  </small>
                </span>
              </div>
              <button
                className="mt-2.5 flex w-full items-center justify-between rounded-xl border border-white/5 bg-black/15 px-2.5 py-1.5 text-[11px] text-slate-400 transition hover:border-rose-300/20 hover:bg-rose-300/[.06] hover:text-rose-200"
                onClick={salir}
                type="button"
              >
                Cerrar sesión <ShellIcon name="logout" />
              </button>
            </div>
          </div>
        </aside>

        <section className="relative z-10 min-w-0 px-4 py-5 sm:px-7 lg:px-9 lg:py-8 xl:px-12">
          <header className="relative mb-7 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#071713]/65 px-5 py-5 shadow-[0_26px_80px_rgba(0,0,0,.18)] backdrop-blur-xl sm:px-6 lg:mb-8">
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
                    className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-200/15 text-base font-extrabold text-white shadow-[0_12px_35px_rgba(0,0,0,.28)] lg:hidden [&>img]:object-cover"
                    usuario={usuario}
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="section-kicker flex items-center gap-2">
                    <ShellIcon name="spark" /> {eyebrow}
                  </p>
                  <h1 className="mt-2 truncate text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
                    {title}
                  </h1>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-[10px] uppercase tracking-[.14em] text-slate-400">
                  {usuario ? config.label : "Sesión"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[.06] px-3 py-2 text-[10px] text-emerald-100/75">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" />{" "}
                  Datos sincronizados
                </span>
              </div>
            </div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
