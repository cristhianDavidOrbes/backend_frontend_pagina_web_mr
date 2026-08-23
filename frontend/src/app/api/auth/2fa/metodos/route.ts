import { proxyBackend } from "@/lib/backend";

export async function GET(request: Request) {
  return proxyBackend({
    request,
    path: "/api/auth/2fa/metodos",
    method: "GET",
  });
}
