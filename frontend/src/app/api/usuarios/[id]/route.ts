import { proxyBackend } from "@/lib/backend";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Usuario no válido" }, { status: 400 });

  return proxyBackend({
    request,
    path: `/api/usuarios/${id}`,
    method: "GET",
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Usuario no válido" }, { status: 400 });

  return proxyBackend({
    request,
    path: `/api/usuarios/${id}`,
    method: "PUT",
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Usuario no válido" }, { status: 400 });

  return proxyBackend({
    request,
    path: `/api/usuarios/${id}`,
    method: "PATCH",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Usuario no válido" }, { status: 400 });

  return proxyBackend({
    request,
    path: `/api/usuarios/${id}`,
    method: "DELETE",
  });
}
