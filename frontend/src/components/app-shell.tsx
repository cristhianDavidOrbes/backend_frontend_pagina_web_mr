"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Code2,
  Globe,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

import { AvatarDisplay } from "@/components/avatar-display";
import { clearAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";
import { BrandMark } from "@/components/brand-mark";

type NavLink = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type RoleConfig = { label: string; links: NavLink[] };

const roleConfig: Record<UsuarioSesion["rol"], RoleConfig> = {
  ESTUDIANTE: {
    label: "Estudiante",
    links: [
      { href: "/estudiante", label: "Mi ruta", icon: Route, exact: true },
      { href: "/estudiante/reportes", label: "Recomendaciones", icon: Sparkles },
      { href: "/estudiante/ranking", label: "Ranking", icon: Trophy },
      { href: "/estudiante/codigo", label: "Programar POO", icon: Code2 },
      { href: "/estudiante/perfil", label: "Mi perfil", icon: UserRound },
      { href: "/estudiante/configuracion", label: "Configuración", icon: Settings },
    ],
  },
  DOCENTE: {
    label: "Docente",
    links: [
      { href: "/docente", label: "Resumen del grupo", icon: LayoutDashboard, exact: true },
      { href: "/docente/estudiantes", label: "Estudiantes", icon: Users },
      { href: "/docente/reportes", label: "Reportes", icon: BarChart3 },
      { href: "/docente/perfil", label: "Mi perfil", icon: UserRound },
    ],
  },
  ADMINISTRADOR: {
    label: "Administración",
    links: [
      { href: "/administrador", label: "Resumen", icon: LayoutDashboard, exact: true },
      { href: "/administrador/usuarios", label: "Usuarios", icon: Users },
      { href: "/administrador/niveles", label: "Niveles", icon: Layers },
      { href: "/administrador/tutor-ia", label: "Tutor IA", icon: Sparkles },
      { href: "/administrador/perfil", label: "Mi perfil", icon: UserRound },
    ],
  },
};

type Props = {
  usuario: UsuarioSesion | null;
  children: React.ReactNode;
  /** Se conservan por compatibilidad; cada página muestra su propio encabezado. */
  eyebrow?: string;
  title?: string;
};

const COLLAPSE_KEY = "algolab_sidebar_compacta";

export function AppShell({ usuario, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuDialogRef = useRef<HTMLElement>(null);
  const mobileMenuCloseRef = useRef<HTMLButtonElement>(null);

  const config = usuario ? roleConfig[usuario.rol] : roleConfig.ESTUDIANTE;
  const isCodeWorkspace = /^\/estudiante\/codigo\/\d+/.test(pathname);
  const isOnboarding = pathname.startsWith("/estudiante/bienvenida");

  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") {
        const id = window.setTimeout(() => setCollapsed(true), 0);
        return () => window.clearTimeout(id);
      }
    } catch {
      /* preferencia opcional */
    }
  }, []);

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
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
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

  function toggleCollapsed() {
    setCollapsed((current) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, current ? "0" : "1");
      } catch {
        /* preferencia opcional */
      }
      return !current;
    });
  }

  function salir() {
    clearAuthSession();
    router.replace("/iniciar-sesion");
  }

  function isActive(link: NavLink) {
    return link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(link.href + "/");
  }

  const nav = (compact: boolean, layoutKey: string) => (
    <div className="shell-nav">
      <div className="shell-nav-top">
        <Link aria-label="AlgoLab, inicio" className="brand shell-brand" href="/" onClick={() => setMobileMenuOpen(false)}>
          <BrandMark />
          {!compact ? <span className="brand-name">AlgoLab</span> : null}
        </Link>
        {!compact ? <p className="shell-role">{config.label}</p> : null}
        <nav aria-label="Navegación principal" className="shell-links">
          {config.links.map((link) => {
            const active = isActive(link);
            const Icon = link.icon;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`shell-link ${active ? "is-active" : ""}`}
                href={link.href}
                key={link.href}
                onClick={() => setMobileMenuOpen(false)}
                title={compact ? link.label : undefined}
              >
                {active ? (
                  <motion.span className="shell-link-bg" layoutId={`shell-active-${layoutKey}`} transition={{ type: "spring", stiffness: 420, damping: 36 }} />
                ) : null}
                <Icon aria-hidden="true" size={19} />
                <span className={compact ? "sr-only" : ""}>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="shell-nav-bottom">
        <Link className="shell-link" href="/" onClick={() => setMobileMenuOpen(false)} title={compact ? "Sitio de AlgoLab" : undefined}>
          <Globe aria-hidden="true" size={19} />
          <span className={compact ? "sr-only" : ""}>Sitio de AlgoLab</span>
        </Link>
        <div className={`shell-user ${compact ? "is-compact" : ""}`}>
          {usuario ? <AvatarDisplay decorative usuario={usuario} /> : <span className="avatar-display skeleton" />}
          {!compact ? (
            <span className="min-w-0 flex-1">
              <strong>{usuario?.nombre ?? "Cargando…"}</strong>
              <small>{usuario?.correo ?? config.label}</small>
            </span>
          ) : null}
          <button aria-label="Cerrar sesión" className="btn btn-ghost btn-icon btn-sm" onClick={salir} title="Cerrar sesión" type="button">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );

  // La bienvenida usa su propio marco enfocado (sin menú) para no interrumpir el registro.
  if (isOnboarding) return <>{children}</>;

  return (
    <div className={`shell app-surface ${collapsed ? "is-collapsed" : ""}`}>
      <header className="shell-mobilebar">
        <button
          aria-controls="algolab-mobile-navigation"
          aria-expanded={mobileMenuOpen}
          aria-label="Abrir menú"
          className="btn btn-ghost btn-icon"
          onClick={() => setMobileMenuOpen(true)}
          ref={mobileMenuButtonRef}
          type="button"
        >
          <Menu size={22} />
        </button>
        <Link aria-label="AlgoLab, inicio" className="brand" href="/">
          <BrandMark />
          <span className="brand-name">AlgoLab</span>
        </Link>
        {usuario ? <AvatarDisplay decorative usuario={usuario} /> : <span className="w-10" />}
      </header>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <>
            <motion.div
              animate={{ opacity: 1 }}
              aria-hidden="true"
              className="shell-scrim"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              animate={{ x: 0 }}
              aria-label="Menú"
              aria-modal="true"
              className="shell-drawer"
              exit={{ x: "-100%" }}
              id="algolab-mobile-navigation"
              initial={{ x: "-100%" }}
              ref={mobileMenuDialogRef}
              role="dialog"
              transition={reduce ? { duration: 0.15 } : { type: "spring", damping: 30, stiffness: 300 }}
            >
              <button
                aria-label="Cerrar menú"
                className="btn btn-ghost btn-icon shell-drawer-close"
                onClick={() => setMobileMenuOpen(false)}
                ref={mobileMenuCloseRef}
                type="button"
              >
                <X size={20} />
              </button>
              {nav(false, "mobile")}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <aside className="shell-sidebar">
        {nav(collapsed, "desktop")}
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
          className="btn btn-ghost btn-icon btn-sm shell-collapse"
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menú" : "Contraer menú"}
          type="button"
        >
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </aside>

      <div className="shell-content">
        <main className={isCodeWorkspace ? "shell-main shell-main-wide" : "shell-main"} id="contenido">
          {children}
        </main>
      </div>
    </div>
  );
}
