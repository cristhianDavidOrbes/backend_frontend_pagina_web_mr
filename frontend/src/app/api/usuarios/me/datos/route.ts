import { proxyBackend } from "@/lib/backend";

export async function DELETE(request: Request) {
  return proxyBackend({ request, path: "/api/usuarios/me/datos", method: "DELETE" });
}
