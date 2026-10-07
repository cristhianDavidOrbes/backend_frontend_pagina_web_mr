import { proxyBackend } from "@/lib/backend";

export async function GET(request: Request) {
  return proxyBackend({ request, path: "/api/configuracion-tutor/reglas-sistema", method: "GET" });
}
