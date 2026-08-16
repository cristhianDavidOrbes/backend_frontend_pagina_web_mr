import "server-only";
import { NextResponse } from "next/server";

const DEFAULT_API_BASE_URL = "https://backendfrontendpaginawebmr-production.up.railway.app";

type ProxyOptions = {
  request: Request;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
};

export async function proxyBackend({ request, path, method }: ProxyOptions) {
  try {
    const apiBaseUrl = (process.env.API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
    const authorization = request.headers.get("authorization");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (authorization) {
      headers.Authorization = authorization;
    }

    const respuesta = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers,
      body: method === "GET" || method === "DELETE" ? undefined : await request.text(),
      cache: "no-store",
    });

    const texto = await respuesta.text();

    if (respuesta.status === 204 || !texto) {
      return new Response(null, {
        status: respuesta.status,
      });
    }

    let datos: unknown;
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = { mensaje: respuesta.ok ? texto : "El backend devolvió una respuesta no válida." };
    }

    return NextResponse.json(datos, {
      status: respuesta.status,
    });
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
