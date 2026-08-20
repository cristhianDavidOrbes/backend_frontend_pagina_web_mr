"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { apiRequest } from "@/lib/client-api";
import { saveAuthUser, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

export default function EstudianteLayout({ children }: { children: React.ReactNode }) {
  const { hydrated, token, usuario: sesion } = useAuthSession();
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(sesion);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace("/iniciar-sesion");
      return;
    }
    
    apiRequest<UsuarioSesion>("/api/me", token)
      .then((perfil) => {
        if (perfil.rol !== "ESTUDIANTE") {
          router.replace(perfil.rol === "DOCENTE" ? "/docente" : "/administrador");
          return;
        }
        setUsuario(perfil);
        saveAuthUser(perfil);
      })
      .catch(() => {
        router.replace("/iniciar-sesion");
      });
  }, [hydrated, token, router]);

  const activo = usuario ?? sesion;
  
  if (!activo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card">Sincronizando tu cabina…</div>
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
