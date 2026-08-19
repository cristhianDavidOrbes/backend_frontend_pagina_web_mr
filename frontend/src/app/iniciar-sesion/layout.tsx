import type { ReactNode } from "react";

import { AuthWorld } from "@/components/auth-world";

export default function IniciarSesionLayout({ children }: { children: ReactNode }) {
  return <AuthWorld mode="login">{children}</AuthWorld>;
}
