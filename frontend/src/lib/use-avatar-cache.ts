"use client";

/**
 * Cache global de Object URLs para avatars descargados.
 * Evita N+1 peticiones HTTP cuando se renderiza una lista de estudiantes.
 */

type CacheEntry = {
  objectUrl: string;
  refCount: number;
};

const cache = new Map<string, CacheEntry>();
const pending = new Map<string, Promise<string | null>>();

export function getCachedAvatarUrl(url: string): string | null {
  return cache.get(url)?.objectUrl ?? null;
}

export async function fetchAndCacheAvatar(
  url: string,
  token: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const cached = cache.get(url);
  if (cached) {
    cached.refCount++;
    return cached.objectUrl;
  }

  const inflight = pending.get(url);
  if (inflight) {
    return inflight;
  }

  const request = (async () => {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
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
      cache.set(url, { objectUrl, refCount: 1 });
      return objectUrl;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return null;
      }
      return null;
    } finally {
      pending.delete(url);
    }
  })();

  pending.set(url, request);
  return request;
}

export function releaseAvatarUrl(url: string) {
  const entry = cache.get(url);
  if (!entry) {
    return;
  }
  entry.refCount--;
  if (entry.refCount <= 0) {
    URL.revokeObjectURL(entry.objectUrl);
    cache.delete(url);
  }
}
