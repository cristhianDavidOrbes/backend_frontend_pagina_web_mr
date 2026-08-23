"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ShieldCheck, UserCog } from "lucide-react";
import { useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";
import { ApiRequestError, apiRequest } from "@/lib/client-api";

const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45";

export default function AdministradorLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, token, usuario: usuarioActual } = useAuthSession();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(usuarioActual?.rol === "ADMINISTRADOR" ? usuarioActual : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/iniciar-sesion");
      return;
    }
    let active = true;
    apiRequest<UsuarioSesion>("/api/me", token)
      .then((data) => {
        if (active) setUsuario(data);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/iniciar-sesion?expirado=1";
          }
          return;
        }
        setError(reason instanceof Error ? reason.message : "No pudimos sincronizar el centro de control.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hydrated, token, router, retryKey]);

  const perfilActivo = usuarioActual?.rol === "ADMINISTRADOR" ? usuarioActual : usuario;
  const accesoDenegado = perfilActivo && perfilActivo.rol !== "ADMINISTRADOR";

  if (!hydrated || !token || (loading && !perfilActivo)) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card">Sincronizando permisos y telemetría…</div>
      </main>
    );
  }

  if (!perfilActivo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <section className="panel-card max-w-lg p-7 text-center">
          <h1 className="text-xl font-semibold text-white">No pudimos abrir el centro de control</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{error || "Comprueba tu conexión e inténtalo nuevamente."}</p>
          <button
            className="primary-button mt-5"
            onClick={() => {
              setLoading(true);
              setError("");
              setRetryKey((value) => value + 1);
            }}
            type="button"
          >
            Reintentar sincronización
          </button>
        </section>
      </main>
    );
  }

  return (
    <AppShell eyebrow="Núcleo administrativo" title="Centro de mando" usuario={perfilActivo}>
      {error ? (
        <div className="alert-error mb-5 flex flex-wrap items-center justify-between gap-3" role="alert">
          <span>{error} Se muestran los últimos datos guardados.</span>
          <button
            className="font-semibold underline underline-offset-4"
            onClick={() => {
              setLoading(true);
              setError("");
              setRetryKey((value) => value + 1);
            }}
            type="button"
          >
            Reintentar
          </button>
        </div>
      ) : null}
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
