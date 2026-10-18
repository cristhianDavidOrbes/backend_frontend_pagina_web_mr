import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const DEFAULT_API_BASE_URL = "https://algolab-backend-production.up.railway.app";
const LEGACY_RENDER_URL = "https://algolab-backend-7j0h.onrender.com";
const AFFINITY_COOKIE = "algolab_backend";
const BACKEND_TIMEOUT_MS = 85_000;

type ProxyOptions = {
  request: Request;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

function primaryUrl() {
  const configured = (process.env.RAILWAY_API_BASE_URL ?? process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL).trim().replace(/\/$/, "");
  // Migrate the old production setting, without overriding isolated local previews.
  return configured === LEGACY_RENDER_URL ? DEFAULT_API_BASE_URL : configured;
}

function renderUrl() {
  // Never send local test credentials to a real external server.
  if (!process.env.RENDER_API_BASE_URL && primaryUrl() !== DEFAULT_API_BASE_URL) return "";
  const url = (process.env.RENDER_API_BASE_URL ?? LEGACY_RENDER_URL).trim().replace(/\/$/, "");
  return url === primaryUrl() ? "" : url;
}

function tokenHash(token: string) { return createHash("sha256").update(token).digest("hex"); }
function affinity(request: Request) {
  const value = request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${AFFINITY_COOKIE}=`))?.slice(AFFINITY_COOKIE.length + 1);
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return value === `render.${token ? tokenHash(token) : "pending"}` && Boolean(renderUrl());
}
function apiBaseUrl(request: Request) {
  return affinity(request) ? renderUrl() : primaryUrl();
}
function setAffinity(response: Response, request: Request, baseUrl: string, token?: string) {
  const provider = baseUrl === renderUrl() ? "render" : "railway";
  const secure = request.url.startsWith("https:") ? "; Secure" : "";
  const value = `${provider}.${token ? tokenHash(token) : "pending"}`;
  response.headers.append("Set-Cookie", `${AFFINITY_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? 2_592_000 : 600}${secure}`);
}

function authorizationHeaders(request: Request): Headers {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("Authorization", authorization);
  }
  return headers;
}

function backendSignal(request: Request) {
  // El cliente espera 90 s: responder antes y cancelar también al salir de la
  // página evita dejar conexiones huérfanas cuando muchos usuarios consultan.
  return AbortSignal.any([request.signal, AbortSignal.timeout(BACKEND_TIMEOUT_MS)]);
}

async function respuestaJson(respuesta: Response) {
  const texto = await respuesta.text();
  if (respuesta.status === 204 || !texto) {
    return new Response(null, { status: respuesta.status, headers: { "Cache-Control": "private, no-store" } });
  }

  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    if (respuesta.ok) throw new Error("El backend devolvió una respuesta no válida en lugar de datos JSON.");
    datos = { mensaje: texto || `Error HTTP ${respuesta.status}` };
  }

  return NextResponse.json(datos, { status: respuesta.status, headers: { "Cache-Control": "private, no-store" } });
}

export async function proxyBackend({ request, path, method }: ProxyOptions) {
  try {
    const login = method === "POST" && path.endsWith("/iniciar-sesion");
    let baseUrl = login ? primaryUrl() : apiBaseUrl(request);
    const authorization = request.headers.get("authorization");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (authorization) {
      headers.Authorization = authorization;
    }
    const session2fa = request.headers.get("x-2fa-session-token");
    if (session2fa) {
      headers["X-2FA-Session-Token"] = session2fa;
    }

    const signal = backendSignal(request);
    const options: RequestInit = {
      method,
      headers,
      body: method === "GET" || method === "DELETE" ? undefined : await request.text(),
      cache: "no-store",
      signal,
    };
    const backup = renderUrl();
    let respuesta: Response;
    try {
      respuesta = await fetch(`${baseUrl}${path}`, { ...options, signal: login && backup ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : signal });
    } catch (error) {
      if (!login || !backup || signal.aborted) throw error;
      baseUrl = backup;
      respuesta = await fetch(`${baseUrl}${path}`, options);
    }
    // Only authentication and recovery of pre-migration read-only sessions are
    // retried. Never replay a progress update, registration or another mutation.
    const legacySession = method === "GET" && Boolean(authorization) && !affinity(request) && respuesta.status === 401;
    if (backup && baseUrl !== backup && (legacySession || login && [401, 404, 502, 503, 504].includes(respuesta.status))) {
      try {
        const alternate = await fetch(`${backup}${path}`, options);
        if (alternate.ok) { respuesta = alternate; baseUrl = backup; }
      } catch { /* Keep the original response; never turn an outage into a logout. */ }
    }

    const response = await respuestaJson(respuesta);
    if (response.ok) {
      if (legacySession && baseUrl === backup && authorization) setAffinity(response, request, baseUrl, authorization.replace(/^Bearer\s+/i, ""));
      if (login || path.startsWith("/api/auth/2fa/") || path.includes("/segundo-factor/") || path.endsWith("/registrar")) {
        const data = await response.clone().json().catch(() => null);
        if (typeof data?.token === "string" && data.token) setAffinity(response, request, baseUrl, data.token);
        else if (login) setAffinity(response, request, baseUrl);
      }
    }
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error de red";
    return NextResponse.json(
      {
        mensaje: `No se pudo conectar con el backend (${msg})`,
      },
      {
        status: 502,
      },
    );
  }
}

export async function proxyBackendAvatar(request: Request, method: "POST" | "PUT" | "DELETE") {
  try {
    const headers = authorizationHeaders(request);
    const contentType = request.headers.get("content-type") || "";
    const signal = backendSignal(request);

    if (method === "DELETE") {
      const respuesta = await fetch(`${apiBaseUrl(request)}/api/usuarios/me/avatar`, {
        method: "DELETE",
        headers,
        cache: "no-store",
        signal,
      });
      return await respuestaJson(respuesta);
    }

    let payload: string | FormData;

    if (contentType.includes("application/json")) {
      payload = await request.text();
      headers.set("Content-Type", "application/json");
    } else {
      const entrada = await request.formData();
      const archivo = entrada.get("archivo");
      if (!(archivo instanceof File) || !archivo.type.startsWith("image/")) {
        return NextResponse.json({ mensaje: "Debe seleccionar una imagen válida." }, { status: 400 });
      }
      if (archivo.size > 10 * 1024 * 1024) {
        return NextResponse.json({ mensaje: "La imagen procesada no puede superar 10 MB." }, { status: 413 });
      }

      const arrayBuffer = await archivo.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: archivo.type || "image/jpeg" });
      const formData = new FormData();
      formData.append("archivo", blob, archivo.name || "avatar.jpg");
      payload = formData;
    }

    // PUT es el contrato estable del backend. Las versiones anteriores del
    // frontend enviaban POST, así que incluso esas peticiones se traducen a
    // PUT aquí para que una pestaña con JavaScript en caché siga funcionando.
    let respuesta = await fetch(`${apiBaseUrl(request)}/api/usuarios/me/avatar`, {
      method: "PUT",
      headers,
      body: payload,
      cache: "no-store",
      signal,
    });

    // Compatibilidad temporal con cualquier backend intermedio que solo
    // expusiera POST. No se reintenta un 401: en ese caso el token sí es inválido.
    if (respuesta.status === 404 || respuesta.status === 405) {
      respuesta = await fetch(`${apiBaseUrl(request)}/api/usuarios/me/avatar`, {
        method: "POST",
        headers,
        body: payload,
        cache: "no-store",
        signal,
      });
    }

    return await respuestaJson(respuesta);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error de red";
    return NextResponse.json({ mensaje: `No se pudo conectar con el backend (${msg})` }, { status: 502 });
  }
}

export async function proxyBackendAvatarPublico(
  request: Request,
  usuarioId: string,
  version?: string | null,
) {
  try {
    const suffix = version ? `?v=${encodeURIComponent(version)}` : "";
    const respuesta = await fetch(`${apiBaseUrl(request)}/api/usuarios/${usuarioId}/avatar${suffix}`, {
      headers: authorizationHeaders(request),
      cache: "no-store",
      signal: backendSignal(request),
    });

    if (!respuesta.ok) {
      return new Response(null, { status: respuesta.status });
    }

    const arrayBuffer = await respuesta.arrayBuffer();
    const headers = new Headers();
    const contentType = respuesta.headers.get("content-type") || "image/jpeg";
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "private, max-age=86400");
    if (version) {
      headers.set("ETag", `"${version}"`);
    }

    return new Response(arrayBuffer, { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error de red";
    return NextResponse.json({ mensaje: `No se pudo cargar el avatar (${msg})` }, { status: 502 });
  }
}
