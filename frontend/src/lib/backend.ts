import "server-only";
import { NextResponse } from "next/server";

const DEFAULT_API_BASE_URL = "https://backendfrontendpaginawebmr-production.up.railway.app";

type ProxyOptions = {
  request: Request;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

function apiBaseUrl() {
  return (process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
}

function authorizationHeaders(request: Request): Headers {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers.set("Authorization", authorization);
  }
  return headers;
}

async function respuestaJson(respuesta: Response) {
  const texto = await respuesta.text();
  if (respuesta.status === 204 || !texto) {
    return new Response(null, { status: respuesta.status });
  }

  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    datos = { mensaje: respuesta.ok ? texto : (texto || `Error HTTP ${respuesta.status}`) };
  }

  return NextResponse.json(datos, { status: respuesta.status });
}

export async function proxyBackend({ request, path, method }: ProxyOptions) {
  try {
    const baseUrl = apiBaseUrl();
    const authorization = request.headers.get("authorization");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (authorization) {
      headers.Authorization = authorization;
    }

    const respuesta = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: method === "GET" || method === "DELETE" ? undefined : await request.text(),
      cache: "no-store",
    });

    return respuestaJson(respuesta);
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

    if (method === "DELETE") {
      const respuesta = await fetch(`${apiBaseUrl()}/api/usuarios/me/avatar`, {
        method: "DELETE",
        headers,
        cache: "no-store",
      });
      return respuestaJson(respuesta);
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

    // Intentar POST primero
    let respuesta = await fetch(`${apiBaseUrl()}/api/usuarios/me/avatar`, {
      method: "POST",
      headers,
      body: payload,
      cache: "no-store",
    });

    // Si el backend en transición devuelve 404 o 405 en POST, reintentar con PUT
    if (respuesta.status === 404 || respuesta.status === 405) {
      respuesta = await fetch(`${apiBaseUrl()}/api/usuarios/me/avatar`, {
        method: "PUT",
        headers,
        body: payload,
        cache: "no-store",
      });
    }

    return respuestaJson(respuesta);
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
    const respuesta = await fetch(`${apiBaseUrl()}/api/usuarios/${usuarioId}/avatar${suffix}`, {
      headers: authorizationHeaders(request),
      cache: "no-store",
    });

    if (!respuesta.ok) {
      return new Response(null, { status: respuesta.status });
    }

    const arrayBuffer = await respuesta.arrayBuffer();
    const headers = new Headers();
    const contentType = respuesta.headers.get("content-type") || "image/jpeg";
    headers.set("Content-Type", contentType);
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
    if (version) {
      headers.set("ETag", `"${version}"`);
    }

    return new Response(arrayBuffer, { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error de red";
    return NextResponse.json({ mensaje: `No se pudo cargar el avatar (${msg})` }, { status: 502 });
  }
}
