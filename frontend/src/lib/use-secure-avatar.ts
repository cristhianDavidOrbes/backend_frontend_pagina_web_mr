"use client";

import { avatarUrlParaCliente } from "@/lib/avatar";

/**
 * Entrega la URL pública optimizada del avatar para el cliente.
 * El navegador y Next.js gestionan de forma nativa la caché HTTP y la revalidación.
 */
export function useSecureAvatarUrl(avatarUrl: string | null | undefined): string | null {
  return avatarUrlParaCliente(avatarUrl);
}
