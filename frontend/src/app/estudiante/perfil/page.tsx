"use client";

import { ProfileEditor } from "@/components/profile-editor";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
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
      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-6 backdrop-blur-md">
        <span className="section-kicker">Identidad del Estudiante</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Configura tu perfil y seguridad
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Personaliza tu nombre, alias, avatar e institución, y protege tu cuenta con autenticación de dos factores.
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

      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-6 backdrop-blur-md">
        <TwoFactorSettings token={token} />
      </div>
    </div>
  );
}
