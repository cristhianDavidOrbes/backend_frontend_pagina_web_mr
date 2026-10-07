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
          router.replace("/iniciar-sesion?expirado=1");
          return;
        }
        setError(reason instanceof Error ? reason.message : "No pudimos cargar los datos del grupo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hydrated, token, router, retryKey]);

  const usuarioActivo = sesion?.rol === "DOCENTE" ? sesion : usuario;

  if (!hydrated || !token || (loading && !usuarioActivo)) {
    return (
      <main className="shell-state">
        <div className="loading-card">Cargando tu grupo…</div>
      </main>
    );
  }

  if (!usuarioActivo) {
    return (
      <main className="shell-state">
        <section className="card card-pad">
          <h1 className="text-xl">No pudimos abrir el espacio docente</h1>
          <p className="muted mt-2">{error || "Comprueba tu conexión e inténtalo nuevamente."}</p>
          <button
            className="btn btn-primary mt-5"
            onClick={() => {
              setLoading(true);
              setError("");
              setRetryKey((value) => value + 1);
            }}
            type="button"
          >
            Reintentar
          </button>
        </section>
      </main>
    );
  }

  return (
    <AppShell usuario={usuarioActivo}>
      {error ? (
        <div className="notice notice-warning mb-5 flex-wrap" role="alert">
          <span className="flex-1">{error} Se muestran los últimos datos guardados.</span>
          <button
            className="btn btn-secondary btn-sm"
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
