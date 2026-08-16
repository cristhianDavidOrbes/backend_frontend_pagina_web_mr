"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clearAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type Props = { usuario: UsuarioSesion | null; children: ReactNode; eyebrow: string; title: string };

const roleLabel = { ESTUDIANTE: "Estudiante", DOCENTE: "Docente", ADMINISTRADOR: "Administrador" };

export function AppShell({ usuario, children, eyebrow, title }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const home = usuario?.rol === "DOCENTE" ? "/docente" : usuario?.rol === "ADMINISTRADOR" ? "/administrador" : "/estudiante";
  const links = [{ href: home, label: "Resumen", glyph: "⌁" }];

  function salir() {
    clearAuthSession();
    router.replace("/iniciar-sesion");
  }

  return (
    <main className="app-surface min-h-screen text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-white/10 bg-[#07110f]/95 px-5 py-5 lg:border-b-0 lg:border-r lg:px-6 lg:py-7">
          <Link className="flex items-center gap-3" href="/">
            <span className="brand-mark">A</span>
            <span><strong className="block text-lg tracking-tight">AlgoLab</strong><small className="text-[10px] uppercase tracking-[.28em] text-emerald-400">Mixed reality</small></span>
          </Link>
          <nav className="mt-7 flex gap-2 lg:flex-col">
            {links.map((link) => <Link className={`nav-item ${pathname === link.href ? "nav-item-active" : ""}`} href={link.href} key={link.href}><span>{link.glyph}</span>{link.label}</Link>)}
          </nav>
          <div className="mt-7 hidden rounded-2xl border border-white/10 bg-white/[.035] p-4 lg:block">
            <p className="text-xs uppercase tracking-[.18em] text-slate-500">Sesión activa</p>
            <p className="mt-2 truncate font-semibold">{usuario?.nombre ?? "Cargando…"}</p>
            <p className="mt-1 text-xs text-emerald-300">{usuario ? roleLabel[usuario.rol] : ""}</p>
            <button className="mt-4 text-sm text-slate-400 transition hover:text-white" onClick={salir}>Cerrar sesión →</button>
          </div>
        </aside>
        <section className="min-w-0 px-4 py-5 sm:px-7 lg:px-10 lg:py-8">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><p className="section-kicker">{eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1></div>
            <div className="status-pill"><span className="status-dot" /> Datos sincronizados con las gafas</div>
          </header>
          {children}
        </section>
      </div>
    </main>
  );
}
