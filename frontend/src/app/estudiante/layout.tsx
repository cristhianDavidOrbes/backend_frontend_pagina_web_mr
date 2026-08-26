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
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card max-w-md text-center">
          <p>Redirigiendo a inicio de sesión…</p>
        </div>
      </main>
    );
  }

  const activo = usuario || (sesion?.rol === "ESTUDIANTE" ? sesion : null);

  if (validando && !activo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card max-w-md text-center">
          <p>Sincronizando tu cabina…</p>
        </div>
      </main>
    );
  }

  if (!activo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card max-w-md text-center" role="alert">
          <p>{errorSincronizacion || "Sesión no disponible."}</p>
          <button
            type="button"
            onClick={() => {
              clearAuthSession();
              router.replace("/iniciar-sesion");
            }}
            className="mt-4 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
          >
            Ir a inicio de sesión
          </button>
        </div>
      </main>
    );
  }

  return (
    <AppShell 
      eyebrow="Cabina del estudiante" 
      title={`Hola, ${activo.nombre.split(" ")[0]}`} 
      usuario={activo}
    >
      {children}
    </AppShell>
  );
}
