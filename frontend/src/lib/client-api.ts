import { clearAuthSession } from "@/lib/use-auth-session";

export async function apiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { mensaje: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      if (typeof window !== "undefined") {
        clearAuthSession();
      }
      throw new Error("Tu sesión ha expirado o no es válida. Por favor, inicia sesión nuevamente.");
    }

    let mensaje = `Error del servidor (HTTP ${response.status})`;
    if (typeof data === "object" && data !== null) {
      const record = data as Record<string, unknown>;
      if (typeof record.mensaje === "string" && record.mensaje) {
        mensaje = record.mensaje;
      } else if (typeof record.message === "string" && record.message) {
        mensaje = record.message;
      } else if (typeof record.error === "string" && record.error) {
        mensaje = record.error;
      } else if (typeof record.detail === "string" && record.detail) {
        mensaje = record.detail;
      }
    } else if (typeof data === "string" && data) {
      mensaje = data;
    }
    throw new Error(mensaje);
  }
  return data as T;
}
