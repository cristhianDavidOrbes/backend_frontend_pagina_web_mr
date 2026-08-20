"use client";

/**
 * Cache global en memoria para avatars descargados.
 * Mantiene los Object URLs disponibles durante la sesión para evitar parpadeos,
 * peticiones duplicadas y problemas al cambiar de pestañas o páginas.
 */

const urlCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string | null>>();

export function getCachedAvatarUrl(url: string): string | null {
  return urlCache.get(url) ?? null;
}

export function invalidateAvatarCache(url?: string) {
  if (url) {
    const existing = urlCache.get(url);
    if (existing) {
      URL.revokeObjectURL(existing);
      urlCache.delete(url);
    }
  } else {
    for (const objUrl of urlCache.values()) {
      URL.revokeObjectURL(objUrl);
    }
    urlCache.clear();
  }
}

export async function fetchAndCacheAvatar(
  url: string,
  token?: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const cached = urlCache.get(url);
  if (cached) {
    return cached;
  }

  const inflight = pendingRequests.get(url);
  if (inflight) {
    return inflight;
  }

  const headers: HeadersInit = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const request = (async () => {
    try {
      const response = await fetch(url, {
        headers,
        signal,
        cache: "no-store",
      });
      if (!response.ok) {
        return null;
      }
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        return null;
      }
      const objectUrl = URL.createObjectURL(blob);
      urlCache.set(url, objectUrl);
      return objectUrl;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      return null;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, request);
  return request;
}

export function releaseAvatarUrl(url?: string) {
  if (url) {
    // Mantenemos los Object URLs en memoria durante la sesión para navegación instantánea
  }
}
