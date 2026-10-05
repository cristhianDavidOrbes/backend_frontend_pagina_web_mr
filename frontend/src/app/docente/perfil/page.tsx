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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi perfil</h1>
        <p className="mt-2 text-sm text-slate-400">
          Mantén actualizados tus datos de contacto y tu presentación en AlgoLab.
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
