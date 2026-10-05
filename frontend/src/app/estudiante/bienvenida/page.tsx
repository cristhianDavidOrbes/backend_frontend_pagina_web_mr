"use client";

import { useRouter } from "next/navigation";
import { OnboardingShowcase } from "@/components/auth/onboarding-showcase";
import { useAuthSession } from "@/lib/use-auth-session";

export default function BienvenidaEstudiantePage() {
  const router = useRouter();
  const { usuario } = useAuthSession();
  return (
    <div className="mx-auto max-w-5xl">
      <OnboardingShowcase
        onComplete={() => {
          if (usuario) localStorage.setItem(`algolab_onboarding:${usuario.id}`, "completado");
          router.replace("/estudiante");
        }}
        usuario={usuario}
      />
    </div>
  );
}
