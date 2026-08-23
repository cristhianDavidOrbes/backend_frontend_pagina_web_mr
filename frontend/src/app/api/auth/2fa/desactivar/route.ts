import { proxyBackend } from "@/lib/backend";

export async function POST(request: Request) {
  return proxyBackend({
    request,
    path: "/api/auth/2fa/desactivar",
    method: "POST",
  });
}
