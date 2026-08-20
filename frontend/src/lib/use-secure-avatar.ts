"use client";

import { useEffect, useState } from "react";

import { avatarUrlParaCliente } from "@/lib/avatar";
import { fetchAndCacheAvatar, getCachedAvatarUrl, releaseAvatarUrl } from "@/lib/use-avatar-cache";

/**
 * Descarga la imagen a través del BFF usando el JWT de la sesión y expone un
 * object URL temporal. Usa un cache global para evitar N+1 peticiones en listas.
 */
export function useSecureAvatarUrl(avatarUrl: string | null | undefined, token: string) {
  const url = avatarUrlParaCliente(avatarUrl);
  const isInline = !!url && (url.startsWith("blob:") || url.startsWith("data:image/"));

  const [remoteObjectUrl, setRemoteObjectUrl] = useState<string | null>(() => {
    if (!url || isInline) return null;
    return getCachedAvatarUrl(url);
  });

  useEffect(() => {
    if (!url || !token || isInline) {
      return;
    }

    const cached = getCachedAvatarUrl(url);
    if (cached) {
      return;
    }

    const controller = new AbortController();
    let usedUrl: string | null = null;

    void fetchAndCacheAvatar(url, token, controller.signal).then((objectUrl) => {
      if (objectUrl) {
        usedUrl = url;
        setRemoteObjectUrl(objectUrl);
      } else {
        setRemoteObjectUrl(null);
      }
    });

    return () => {
      controller.abort();
      if (usedUrl) {
        releaseAvatarUrl(usedUrl);
      }
    };
  }, [url, token, isInline]);

  if (!url || !token) {
    return null;
  }
  if (isInline) {
    return url;
  }
  return remoteObjectUrl;
}
