import { NextResponse } from "next/server";
import { proxyBackend } from "@/lib/backend";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Usuario no válido" }, { status: 400 });
  return proxyBackend({ request, path: `/api/usuarios/${id}/publico`, method: "GET" });
}
