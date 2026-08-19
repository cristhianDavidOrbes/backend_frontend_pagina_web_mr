"use client";

import { useEffect, useState } from "react";

import { avatarUrlParaCliente } from "@/lib/avatar";

/**
 * Descarga la imagen a través del BFF usando el JWT de la sesión y expone un
 * object URL temporal. Así la foto nunca necesita ser pública ni enumerable.
 */
export function useSecureAvatarUrl(avatarUrl: string | null | undefined, token: string) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = avatarUrlParaCliente(avatarUrl);
    if (!url || !token) {
      setObjectUrl(null);
      return;
    }

    if (url.startsWith("blob:") || url.startsWith("data:image/")) {
      setObjectUrl(url);
      return;
    }

    const controller = new AbortController();
    let createdUrl: string | null = null;

    void fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No se pudo cargar el avatar");
        }
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) {
          throw new Error("El avatar no es una imagen válida");
        }
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setObjectUrl(null);
        }
      });

    return () => {
      controller.abort();
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [avatarUrl, token]);

  return objectUrl;
}
