import { NextResponse } from "next/server";

import { proxyBackendAvatar, proxyBackendAvatarPublico } from "@/lib/backend";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const usuarioId = url.searchParams.get("id") ?? "";
  const version = url.searchParams.get("v");
  if (!/^\d+$/.test(usuarioId)) {
    return NextResponse.json({ mensaje: "Usuario no válido" }, { status: 400 });
  }
  return proxyBackendAvatarPublico(request, usuarioId, version);
}

export async function PUT(request: Request) {
  return proxyBackendAvatar(request, "PUT");
}

export async function DELETE(request: Request) {
  return proxyBackendAvatar(request, "DELETE");
}
