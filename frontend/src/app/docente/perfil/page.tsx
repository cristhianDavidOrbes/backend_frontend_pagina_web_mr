"use client";

import { ProfileEditor } from "@/components/profile-editor";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function DocentePerfilPage() {
  const { hydrated, token, usuario } = useAuthSession();

  if (!hydrated || !token || !usuario) {
    return (
      <div className="loading-card mx-auto mt-10 max-w-md">
        Cargando perfil docente…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-6 backdrop-blur-md">
        <span className="section-kicker">Identidad Docente</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Perfil del observatorio
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Administra tus datos de contacto, alias institucional y avatar sincronizado con la plataforma.
        </p>
      </div>

      <ProfileEditor
        defaultOpen={true}
        onSaved={(nuevoUsuario) => {
          saveAuthUser(nuevoUsuario);
        }}
        token={token}
        usuario={usuario}
      />
    </div>
  );
}
