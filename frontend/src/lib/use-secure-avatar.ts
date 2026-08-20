"use client";

import { useEffect, useState } from "react";

import { avatarUrlParaCliente } from "@/lib/avatar";
import { fetchAndCacheAvatar, getCachedAvatarUrl } from "@/lib/use-avatar-cache";

/**
 * Descarga la imagen a través del BFF usando el JWT de la sesión y expone un
 * object URL temporal. Usa un cache global para evitar N+1 peticiones y parpadeos.
 */
export function useSecureAvatarUrl(avatarUrl: string | null | undefined, token?: string | null) {
  const url = avatarUrlParaCliente(avatarUrl);
  const isInline = !!url && (url.startsWith("blob:") || url.startsWith("data:image/"));

  const [remoteObjectUrl, setRemoteObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!url || isInline) {
      return;
    }

    const cached = getCachedAvatarUrl(url);
    if (cached) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    void fetchAndCacheAvatar(url, token ?? undefined, controller.signal).then((objectUrl) => {
      if (active && objectUrl) {
        setRemoteObjectUrl(objectUrl);
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, token, isInline]);

  if (!url) {
    return null;
  }
  if (isInline) {
    return url;
  }
  return getCachedAvatarUrl(url) ?? remoteObjectUrl;
}
