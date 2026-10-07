import { proxyBackend } from "@/lib/backend";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Nivel no válido" }, { status: 400 });

  return proxyBackend({
    request,
    path: `/api/niveles/${id}`,
    method: "GET",
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Nivel no válido" }, { status: 400 });

  return proxyBackend({
    request,
    path: `/api/niveles/${id}`,
    method: "PUT",
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ mensaje: "Nivel no válido" }, { status: 400 });

  return proxyBackend({
    request,
    path: `/api/niveles/${id}`,
    method: "DELETE",
  });
}
