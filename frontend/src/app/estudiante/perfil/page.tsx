"use client";

import { ProfileEditor } from "@/components/profile-editor";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function EstudiantePerfilPage() {
  const { hydrated, token, usuario } = useAuthSession();

  if (!hydrated || !usuario || !token) {
    return (
      <div className="loading-card mx-auto mt-10 max-w-md">
        Cargando datos del perfil…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi perfil</h1>
        <p className="mt-2 text-sm text-slate-400">
          Actualiza cómo apareces en la web, el ranking y las gafas.
        </p>
      </div>

      <ProfileEditor
        defaultOpen={true}
        onSaved={(user) => {
          saveAuthUser(user);
        }}
        token={token}
        usuario={usuario}
      />

    </div>
  );
}
