import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8080";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const respuesta = await fetch(`${API_BASE_URL}/api/usuarios/registrar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const datos = await respuesta.json();

    return NextResponse.json(datos, {
      status: respuesta.status,
    });
  } catch {
    return NextResponse.json(
      {
        exitoso: false,
        mensaje: "No se pudo conectar con el backend",
      },
      {
        status: 502,
      },
    );
  }
}
