"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ShieldCheck, UserCog } from "lucide-react";
import { useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";
import { ApiRequestError, apiRequest } from "@/lib/client-api";

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
          router.replace("/iniciar-sesion?expirado=1");
          return;
        }
        setError(reason instanceof Error ? reason.message : "No pudimos cargar la administración.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hydrated, token, router, retryKey]);

  const perfilActivo = usuarioActual ?? usuario;
  const accesoDenegado = perfilActivo && perfilActivo.rol !== "ADMINISTRADOR";

  if (!hydrated || !token || (loading && !perfilActivo)) {
    return (
      <main className="shell-state">
        <div className="loading-card">Verificando permisos…</div>
      </main>
    );
  }

  if (!perfilActivo) {
    return (
      <main className="shell-state">
        <section className="card card-pad">
          <h1 className="text-xl">No pudimos abrir la administración</h1>
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
    <AppShell usuario={perfilActivo}>
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
      {accesoDenegado ? (
        <section className="card card-pad mx-auto mt-10 grid max-w-lg justify-items-center gap-3 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
            <ShieldCheck size={28} />
          </span>
          <h1 className="title-lg mt-2">Esta sección es solo para administración</h1>
          <p className="muted">Inicia sesión con una cuenta de administrador para gestionar usuarios y niveles.</p>
          <Link className="btn btn-primary mt-3" href="/iniciar-sesion">
            <UserCog size={17} /> Cambiar de cuenta
          </Link>
        </section>
      ) : (
        children
      )}
    </AppShell>
  );
}
