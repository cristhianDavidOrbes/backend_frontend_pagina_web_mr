"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ShieldCheck, UserCog } from "lucide-react";
import { useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45";

export default function AdministradorLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, token, usuario: usuarioActual } = useAuthSession();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(usuarioActual);

  useEffect(() => {
    if (!hydrated || !token) return;
    apiRequest<UsuarioSesion>("/api/me", token)
      .then((data) => setUsuario(data))
      .catch(console.error);
  }, [hydrated, token]);

  const perfilActivo = usuario ?? usuarioActual;
  const accesoDenegado = perfilActivo && perfilActivo.rol !== "ADMINISTRADOR";

  if (!perfilActivo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card">
          {hydrated && !token
            ? "Inicia sesión como administrador para entrar al núcleo de control."
            : "Sincronizando permisos y telemetría…"}
        </div>
      </main>
    );
  }

  return (
    <AppShell eyebrow="Núcleo administrativo" title="Centro de mando" usuario={perfilActivo}>
      {accesoDenegado ? (
        <section className="panel-card grid min-h-72 place-items-center overflow-hidden p-8 text-center">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="relative max-w-lg">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-200">
              <ShieldCheck size={30} />
            </span>
            <p className="section-kicker mt-5">Permiso insuficiente</p>
            <h2 className="mt-2 text-2xl font-semibold">Este núcleo está reservado al equipo administrador.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Cambia a una cuenta con privilegios administrativos para gestionar usuarios y niveles.
            </p>
            <Link
              className={`${buttonClass} mt-5 bg-emerald-300 text-slate-950 hover:bg-emerald-200`}
              href="/iniciar-sesion"
            >
              <UserCog size={16} /> Cambiar usuario
            </Link>
          </div>
        </section>
      ) : (
        children
      )}
    </AppShell>
  );
}
