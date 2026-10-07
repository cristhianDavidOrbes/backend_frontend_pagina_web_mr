"use client";

import { ProfileEditor } from "@/components/profile-editor";
import { PageHead } from "@/components/ui";
import { saveAuthUser, useAuthSession } from "@/lib/use-auth-session";

export default function DocentePerfilPage() {
  const { hydrated, token, usuario } = useAuthSession();

  if (!hydrated || !token || !usuario) {
    return (
      <div className="loading-card">
        Cargando perfil docente…
      </div>
    );
  }

  return (
    <div>
      <PageHead description="Mantén actualizados tus datos y tu presentación en AlgoLab." title="Mi perfil" />
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
