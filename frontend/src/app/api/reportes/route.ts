import { proxyBackend } from "@/lib/backend";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const usuarioId = url.searchParams.get("usuarioId");
  const todos = url.searchParams.get("todos") === "1";
  const path = usuarioId ? `/api/reportes-nivel/usuario/${encodeURIComponent(usuarioId)}` : todos ? "/api/reportes-nivel" : "/api/reportes-nivel/me";
  return proxyBackend({ request, path, method: "GET" });
}
