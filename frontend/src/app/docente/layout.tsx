"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/client-api";
import type { UsuarioSesion } from "@/lib/types";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function DocenteLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(sesion);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push("/iniciar-sesion");
      return;
    }
    apiRequest<UsuarioSesion>("/api/me", token)
      .then((perfil) => {
        if (perfil.rol !== "DOCENTE") {
          router.push(perfil.rol === "ESTUDIANTE" ? "/estudiante" : "/");
          return;
        }
        setUsuario(perfil);
        saveAuthUser(perfil);
      })
      .catch(() => {
        router.push("/iniciar-sesion");
      })
      .finally(() => setLoading(false));
  }, [hydrated, token, router]);

  const usuarioActivo = usuario ?? sesion;

  if (!hydrated || loading || !usuarioActivo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card">Preparando el observatorio…</div>
      </main>
    );
  }

  return (
    <AppShell eyebrow="Observatorio docente" title="Pulso del grupo" usuario={usuarioActivo}>
      {children}
    </AppShell>
  );
}
