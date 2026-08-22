"use client";

import { useEffect, useState } from "react";

import { avatarUrlParaCliente } from "@/lib/avatar";
import { fetchAndCacheAvatar, getCachedAvatarUrl } from "@/lib/use-avatar-cache";
import { useAuthSession } from "@/lib/use-auth-session";

/**
 * Entrega la URL pública optimizada del avatar para el cliente.
 * El navegador y Next.js gestionan de forma nativa la caché HTTP y la revalidación.
 */
export function useSecureAvatarUrl(avatarUrl: string | null | undefined): string | null {
  const { token } = useAuthSession();
  const url = avatarUrlParaCliente(avatarUrl);
  const directUrl = url && (url.startsWith("blob:") || url.startsWith("data:image/")) ? url : null;
  const [resolved, setResolved] = useState<{ source: string; objectUrl: string } | null>(() => {
    if (!url || directUrl) return null;
    const cached = getCachedAvatarUrl(url);
    return cached ? { source: url, objectUrl: cached } : null;
  });

  useEffect(() => {
    if (!url || directUrl || !token) {
      return;
    }

    const controller = new AbortController();
    void fetchAndCacheAvatar(url, token, controller.signal).then((objectUrl) => {
      if (!controller.signal.aborted && objectUrl) {
        setResolved({ source: url, objectUrl });
      }
    });
    return () => controller.abort();
  }, [directUrl, token, url]);

  return directUrl ?? (resolved?.source === url ? resolved.objectUrl : null);
}
