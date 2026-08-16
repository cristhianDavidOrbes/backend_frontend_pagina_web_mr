import { proxyBackend } from "@/lib/backend";
export async function GET(request: Request) { return proxyBackend({ request, path: "/api/usuarios/me/perfil", method: "GET" }); }
export async function PUT(request: Request) { return proxyBackend({ request, path: "/api/usuarios/me/perfil", method: "PUT" }); }
