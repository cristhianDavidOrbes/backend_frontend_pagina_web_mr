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
    const mensaje =
      typeof data === "object" && data !== null && "mensaje" in data
        ? String(data.mensaje)
        : "No fue posible completar la solicitud.";
    throw new Error(mensaje);
  }
  return data as T;
}
