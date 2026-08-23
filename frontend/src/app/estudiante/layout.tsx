"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ApiRequestError, apiRequest } from "@/lib/client-api";
import { clearAuthSession, saveAuthUser, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

export default function EstudianteLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(
    sesion?.rol === "ESTUDIANTE" ? sesion : null,
  );
  const [errorSincronizacion, setErrorSincronizacion] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(true);
  const [intentoSincronizacion, setIntentoSincronizacion] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/iniciar-sesion");
      return;
    }

    let cancelado = false;
    queueMicrotask(() => {
      if (cancelado) return;
      setSincronizando(true);
    });

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
          setUsuario(null);
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
        if (!cancelado) setSincronizando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [hydrated, token, router, intentoSincronizacion]);

  function reintentarSincronizacion() {
    setSincronizando(true);
    setIntentoSincronizacion((intento) => intento + 1);
  }

  // Preferimos la sesión reactiva para que cambios de perfil/avatar se reflejen
  // de inmediato en el shell, manteniendo como respaldo el perfil validado.
  const activo = sesion?.rol === "ESTUDIANTE" ? sesion : usuario;
  
  if (!hydrated || !token || !activo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card max-w-md text-center" role={errorSincronizacion ? "alert" : "status"}>
          <p>
            {errorSincronizacion
              ? "No pudimos recuperar tu perfil. Tu sesión sigue guardada."
              : "Sincronizando tu cabina…"}
          </p>
          {errorSincronizacion ? (
            <>
              <p className="mt-2 text-sm text-slate-400">{errorSincronizacion}</p>
              <button
                type="button"
                onClick={reintentarSincronizacion}
                disabled={sincronizando}
                className="mt-4 rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                {sincronizando ? "Reconectando…" : "Reintentar conexión"}
              </button>
            </>
          ) : null}
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
      {errorSincronizacion ? (
        <section
          role="status"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3"
        >
          <div>
            <p className="text-sm font-semibold text-amber-100">Estás viendo la última información guardada.</p>
            <p className="mt-1 text-xs text-amber-100/70">
              No pudimos actualizar tu perfil, pero no cerramos tu sesión.
            </p>
          </div>
          <button
            type="button"
            onClick={reintentarSincronizacion}
            disabled={sincronizando}
            className="rounded-xl border border-amber-200/30 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-100/10 disabled:cursor-wait disabled:opacity-60"
          >
            {sincronizando ? "Reconectando…" : "Reintentar"}
          </button>
        </section>
      ) : null}
      {children}
    </AppShell>
  );
}
