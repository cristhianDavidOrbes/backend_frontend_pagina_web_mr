"use client";

import { ProfileEditor } from "@/components/profile-editor";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
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
      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-6 backdrop-blur-md">
        <span className="section-kicker">Identidad Administrativa</span>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Perfil de control del sistema y seguridad
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Personaliza tu perfil administrativo, avatar central y gestiona las llaves de seguridad 2FA.
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

      <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-6 backdrop-blur-md">
        <TwoFactorSettings token={token} />
      </div>
    </div>
  );
}
