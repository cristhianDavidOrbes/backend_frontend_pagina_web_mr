import { NextResponse } from "next/server";
import { proxyBackend } from "@/lib/backend";

type RouteContext = { params: Promise<{ nivel: string }> };

async function rutaNivel(context: RouteContext) {
  const { nivel } = await context.params;
  return /^\d{1,2}$/.test(nivel) ? `/api/configuracion-tutor/niveles/${nivel}` : null;
}

export async function GET(request: Request, context: RouteContext) {
  const path = await rutaNivel(context);
  if (!path) return NextResponse.json({ mensaje: "Nivel no válido." }, { status: 400 });
  return proxyBackend({ request, path, method: "GET" });
}

export async function PUT(request: Request, context: RouteContext) {
  const path = await rutaNivel(context);
  if (!path) return NextResponse.json({ mensaje: "Nivel no válido." }, { status: 400 });
  return proxyBackend({ request, path, method: "PUT" });
}
