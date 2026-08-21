// Servicio de ejecución de código:
// ✅ Python: Pyodide (WASM) — 100% local en el navegador, sin internet tras la descarga inicial
// ✅ Java: Transpilador propio Java→JS — 100% local, sin servicios externos

import { executeJavaCode } from "@/lib/java-interpreter";

export type ResultadoEjecucion = {
  salida: string;
  error: string | null;
  exitoso: boolean;
  tiempoMs?: number;
};

// ─── Pyodide (Python local via WASM) ─────────────────────────────────────────

type PyodideInterface = {
  runPythonAsync: (code: string) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globals: any;
};

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInterface>;
    _pyodideInstance?: PyodideInterface;
    _pyodideLoading?: Promise<PyodideInterface>;
  }
}

async function cargarPyodide(): Promise<PyodideInterface> {
  if (typeof window === "undefined") throw new Error("Solo disponible en el navegador");
  if (window._pyodideInstance) return window._pyodideInstance;
  if (window._pyodideLoading) return window._pyodideLoading;

  if (!window.loadPyodide) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("No se pudo cargar Pyodide"));
      document.head.appendChild(script);
    });
  }

  window._pyodideLoading = window.loadPyodide!({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
  }).then((py) => {
    window._pyodideInstance = py;
    window._pyodideLoading = undefined;
    return py;
  });

  return window._pyodideLoading!;
}

async function ejecutarPython(codigo: string): Promise<ResultadoEjecucion> {
  const inicio = Date.now();
  try {
    const py = await cargarPyodide();

    await py.runPythonAsync(`
import sys
import traceback
from io import StringIO
_stdout_capture = StringIO()
_stderr_capture = StringIO()
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture
`);

    let exitoso = true;
    let errorMsg: string | null = null;

    try {
      await py.runPythonAsync(codigo);
    } catch (e) {
      exitoso = false;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    const stdout = (await py.runPythonAsync(`
_out = _stdout_capture.getvalue()
_err = _stderr_capture.getvalue()
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
_out
`)) as string ?? "";

    const stderr = (await py.runPythonAsync("_err")) as string ?? "";

    const tiempoMs = Date.now() - inicio;

    if (!exitoso) {
      const errorCompleto = (stderr + (errorMsg ?? "")).trim();
      return { salida: "", error: errorCompleto || "Error desconocido", exitoso: false, tiempoMs };
    }

    return { salida: stdout.trim(), error: null, exitoso: true, tiempoMs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("No se pudo cargar") || msg.includes("Failed to fetch")) {
      return {
        salida: "",
        error:
          "⚠️ Python necesita descargar Pyodide la primera vez (~10 MB).\n" +
          "Verifica tu conexión a internet y vuelve a intentarlo.\n" +
          "Una vez descargado funciona completamente sin internet.",
        exitoso: false,
      };
    }
    return { salida: "", error: msg, exitoso: false };
  }
}

// ─── Ejecutor Java local (sin servicios externos) ─────────────────────────────

function ejecutarJavaLocal(codigo: string): ResultadoEjecucion {
  const resultado = executeJavaCode(codigo);
  return {
    salida: resultado.stdout,
    error: resultado.error,
    exitoso: resultado.error === null,
    tiempoMs: resultado.tiempoMs,
  };
}

// ─── Exportación principal ────────────────────────────────────────────────────

export async function ejecutarCodigo(
  codigo: string,
  lenguaje: "python" | "java",
): Promise<ResultadoEjecucion> {
  if (lenguaje === "python") {
    return ejecutarPython(codigo);
  }
  // Java: 100% local, sin servicios externos
  return ejecutarJavaLocal(codigo);
}

/** Pre-carga Pyodide en segundo plano al abrir el módulo */
export function preCargaPyodide(): void {
  if (typeof window !== "undefined") {
    cargarPyodide().catch(() => {
      // Silencioso: se intentará cuando el estudiante ejecute código
    });
  }
}
