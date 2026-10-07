"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ApiRequestError, apiRequest } from "@/lib/client-api";
import { clearAuthSession, saveAuthUser, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

export default function EstudianteLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [validando, setValidando] = useState(true);
  const [errorSincronizacion, setErrorSincronizacion] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/iniciar-sesion");
      return;
    }

    let cancelado = false;

    apiRequest<UsuarioSesion>("/api/me", token)
      .then((perfil) => {
        if (cancelado) return;
        setErrorSincronizacion(null);
        if (perfil.rol !== "ESTUDIANTE") {
          router.replace(perfil.rol === "DOCENTE" ? "/docente" : "/administrador");
          return;
        }
        setUsuario(perfil);
        saveAuthUser(perfil);
      })
      .catch((error: unknown) => {
        if (cancelado) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          clearAuthSession();
          router.replace("/iniciar-sesion?expirado=1");
          return;
        }
        setErrorSincronizacion(
          error instanceof Error
            ? error.message
            : "No pudimos sincronizar tu perfil en este momento.",
        );
      })
      .finally(() => {
        if (!cancelado) setValidando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <main className="shell-state">
        <div className="loading-card">Redirigiendo a inicio de sesión…</div>
      </main>
    );
  }

  // La sesión local se actualiza al guardar el perfil; el estado de /api/me
  // solo se leía una vez y dejaba el nombre y el avatar del menú desactualizados.
  const activo = sesion?.rol === "ESTUDIANTE" ? sesion : usuario;

  if (validando && !activo) {
    return (
      <main className="shell-state">
        <div className="loading-card">Cargando tu espacio…</div>
      </main>
    );
  }

  if (!activo) {
    return (
      <main className="shell-state">
        <section className="card card-pad" role="alert">
          <h1 className="text-xl">No pudimos abrir tu espacio</h1>
          <p className="muted mt-2">{errorSincronizacion || "Sesión no disponible."}</p>
          <button
            className="btn btn-primary mt-5"
            onClick={() => {
              clearAuthSession();
              router.replace("/iniciar-sesion");
            }}
            type="button"
          >
            Ir a inicio de sesión
          </button>
        </section>
      </main>
    );
  }

  return (
    <AppShell usuario={activo}>
      {children}
    </AppShell>
  );
}
