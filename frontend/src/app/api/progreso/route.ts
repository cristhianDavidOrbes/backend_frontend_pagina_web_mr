import { proxyBackend } from "@/lib/backend";
export async function GET(request: Request) {
  const usuarioId = new URL(request.url).searchParams.get("usuarioId");
  const path = usuarioId ? `/api/progreso/usuario/${encodeURIComponent(usuarioId)}` : "/api/progreso/me";
  return proxyBackend({ request, path, method: "GET" });
}
