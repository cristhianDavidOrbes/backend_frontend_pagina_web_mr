"use client";

import { ProfileEditor } from "@/components/profile-editor";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function AdministradorPerfilPage() {
  const { hydrated, token, usuario } = useAuthSession();

  if (!hydrated || !token || !usuario) {
    return (
      <div className="loading-card mx-auto mt-10 max-w-md">
        Cargando perfil administrador…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi perfil</h1>
        <p className="mt-2 text-sm text-slate-400">
          Actualiza tu identidad y la imagen que aparece en AlgoLab.
        </p>
      </div>

      <ProfileEditor
        defaultOpen={true}
        onSaved={(perfil) => {
          saveAuthUser(perfil);
        }}
        token={token}
        usuario={usuario}
      />

    </div>
  );
}
