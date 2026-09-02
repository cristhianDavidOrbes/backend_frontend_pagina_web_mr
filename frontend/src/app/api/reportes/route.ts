import { proxyBackend } from "@/lib/backend";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const usuarioId = url.searchParams.get("usuarioId");
  const todos = url.searchParams.get("todos") === "1";
  const path = usuarioId ? `/api/reportes-nivel/usuario/${encodeURIComponent(usuarioId)}` : todos ? "/api/reportes-nivel" : "/api/reportes-nivel/me";
  const respuesta = await proxyBackend({ request, path, method: "GET" });
  if (respuesta.status >= 500 && !todos) {
    return NextResponse.json([], { status: 200 });
  }
  return respuesta;
}
