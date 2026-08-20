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
    datos = { mensaje: respuesta.ok ? texto : "El backend devolvió una respuesta no válida." };
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
  } catch {
    return NextResponse.json(
      {
        mensaje: "No se pudo conectar con el backend",
      },
      {
        status: 502,
      },
    );
  }
}

export async function proxyBackendAvatar(request: Request, method: "PUT" | "DELETE") {
  try {
    const headers = authorizationHeaders(request);
    let body: FormData | undefined;

    if (method === "PUT") {
      const entrada = await request.formData();
      const archivo = entrada.get("archivo");
      if (!(archivo instanceof File) || !archivo.type.startsWith("image/")) {
        return NextResponse.json({ mensaje: "Debe seleccionar una imagen válida." }, { status: 400 });
      }
      if (archivo.size > 10 * 1024 * 1024) {
        return NextResponse.json({ mensaje: "La imagen procesada no puede superar 10 MB." }, { status: 413 });
      }
      body = new FormData();
      body.append("archivo", archivo, archivo.name || "avatar.jpg");
    }

    const respuesta = await fetch(`${apiBaseUrl()}/api/usuarios/me/avatar`, {
      method,
      headers,
      body,
      cache: "no-store",
    });
    return respuestaJson(respuesta);
  } catch {
    return NextResponse.json({ mensaje: "No se pudo conectar con el backend" }, { status: 502 });
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
    const headers = new Headers();
    for (const header of ["content-type", "cache-control", "etag", "last-modified"]) {
      const value = respuesta.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    }
    return new Response(respuesta.body, { status: respuesta.status, headers });
  } catch {
    return NextResponse.json({ mensaje: "No se pudo cargar el avatar" }, { status: 502 });
  }
}
