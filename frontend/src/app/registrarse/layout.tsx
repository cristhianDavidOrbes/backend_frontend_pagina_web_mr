import type { ReactNode } from "react";

import { AuthWorld } from "@/components/auth-world";

export default function RegistrarseLayout({ children }: { children: ReactNode }) {
  return <AuthWorld mode="register">{children}</AuthWorld>;
}
