"use client";

import Image from "next/image";
import { avatarPresetSeguro } from "@/lib/avatar";
import { type UsuarioSesion } from "@/lib/use-auth-session";
import { useSecureAvatarUrl } from "@/lib/use-secure-avatar";

type Props = {
  usuario: Pick<UsuarioSesion, "nombre" | "avatar" | "avatarUrl">;
  className?: string;
  decorative?: boolean;
};

export function AvatarDisplay({ usuario, className = "", decorative = false }: Props) {
  const url = useSecureAvatarUrl(usuario.avatarUrl);
  const preset = avatarPresetSeguro(usuario.avatar);
  const initial = usuario.nombre?.trim().charAt(0).toUpperCase() || "A";

  return (
    <span className={`avatar-display avatar-${preset} ${className}`} aria-hidden={decorative || undefined}>
      {url ? <Image alt={decorative ? "" : `Avatar de ${usuario.nombre}`} fill sizes="64px" src={url} unoptimized /> : <span>{initial}</span>}
    </span>
  );
}
