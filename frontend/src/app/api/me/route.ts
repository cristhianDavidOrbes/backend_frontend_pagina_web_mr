import { proxyBackend } from "@/lib/backend";
export async function GET(request: Request) { return proxyBackend({ request, path: "/api/usuarios/me", method: "GET" }); }
