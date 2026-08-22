"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ApiRequestError, apiRequest } from "@/lib/client-api";
import type { UsuarioSesion } from "@/lib/types";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function DocenteLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(sesion?.rol === "DOCENTE" ? sesion : null);
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
      .then((perfil) => {
        if (!active) return;
        if (perfil.rol !== "DOCENTE") {
          router.replace(perfil.rol === "ADMINISTRADOR" ? "/administrador" : "/estudiante");
          return;
        }
        setUsuario(perfil);
        saveAuthUser(perfil);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof ApiRequestError && reason.status === 401) {
          setUsuario(null);
          router.replace("/iniciar-sesion");
          return;
        }
        setError(reason instanceof Error ? reason.message : "No pudimos sincronizar el observatorio.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hydrated, token, router, retryKey]);

  const usuarioActivo = usuario ?? (sesion?.rol === "DOCENTE" ? sesion : null);

  if (!hydrated || (loading && !usuarioActivo)) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card">Preparando el observatorio…</div>
      </main>
    );
  }

  if (!usuarioActivo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <section className="panel-card max-w-lg p-7 text-center">
          <h1 className="text-xl font-semibold text-white">No pudimos abrir el observatorio</h1>
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
    <AppShell eyebrow="Observatorio docente" title="Pulso del grupo" usuario={usuarioActivo}>
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
      {children}
    </AppShell>
  );
}
