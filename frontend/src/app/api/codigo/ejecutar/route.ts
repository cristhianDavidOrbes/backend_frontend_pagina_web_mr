import { NextResponse } from "next/server";

type CodigoRequest = {
  codigo: string;
  lenguaje: "python" | "java";
};

const JUDGE0_PUBLIC_URL = "https://api.judge0.com";

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  java: 62,
};

function decodificarBase64(texto: string | null): string {
  if (!texto) return "";
  try {
    return Buffer.from(texto, "base64").toString("utf-8");
  } catch {
    return texto;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CodigoRequest;
    const { codigo, lenguaje } = body;

    if (!codigo || !lenguaje || !["python", "java"].includes(lenguaje)) {
      return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
    }

    const languageId = LANGUAGE_IDS[lenguaje];
    const sourceCodeB64 = Buffer.from(codigo, "utf-8").toString("base64");

    const submission = {
      source_code: sourceCodeB64,
      language_id: languageId,
    };

    const res = await fetch(`${JUDGE0_PUBLIC_URL}/submissions?base64_encoded=true&wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `El servicio de ejecución respondió con error ${res.status}.` },
        { status: 502 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultado = await res.json() as any;

    const stdout = decodificarBase64(resultado.stdout as string | null);
    const stderr = decodificarBase64(resultado.stderr as string | null);
    const compileOutput = decodificarBase64(resultado.compile_output as string | null);

    const statusId = (resultado.status?.id as number) ?? 0;
    const exitoso = statusId === 3;

    let error: string | null = null;
    if (!exitoso) {
      error = compileOutput?.trim() || stderr?.trim() || resultado.message || `Error: ${resultado.status?.description}`;
    }

    return NextResponse.json({
      salida: stdout.trim(),
      error,
      exitoso,
      tiempoMs: resultado.time ? Math.round(parseFloat(resultado.time as string) * 1000) : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ salida: "", error: msg, exitoso: false }, { status: 500 });
  }
}
