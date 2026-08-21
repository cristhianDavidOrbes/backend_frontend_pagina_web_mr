import { proxyBackend } from "@/lib/backend";

export async function GET(request: Request) {
  return proxyBackend({ request, path: "/api/oop/progreso/me", method: "GET" });
}

export async function POST(request: Request) {
  return proxyBackend({ request, path: "/api/oop/progreso", method: "POST" });
}
