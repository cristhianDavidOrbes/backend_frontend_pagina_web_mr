"use client";

import { ProfileEditor } from "@/components/profile-editor";
import { PageHead } from "@/components/ui";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function EstudiantePerfilPage() {
  const { hydrated, token, usuario } = useAuthSession();

  if (!hydrated || !usuario || !token) {
    return (
      <div className="loading-card">
        Cargando datos del perfil…
      </div>
    );
  }

  return (
    <div>
      <PageHead description="Actualiza cómo apareces en la web, el ranking y las gafas." title="Mi perfil" />
      <ProfileEditor
        onSaved={(user) => {
          saveAuthUser(user);
        }}
        token={token}
        usuario={usuario}
      />
    </div>
  );
}
