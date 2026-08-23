import { proxyBackend } from "@/lib/backend";

export async function PUT(request: Request) {
  return proxyBackend({
    request,
    path: "/api/auth/2fa/preferido",
    method: "PUT",
  });
}
