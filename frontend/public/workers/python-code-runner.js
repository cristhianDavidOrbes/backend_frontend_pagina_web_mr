/* global loadPyodide */

// Worker clásico intencional: carga Pyodide fuera del hilo de la interfaz.
(() => {
  "use strict";

  const PYODIDE_VERSION = "0.25.1";
  const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
  const importarConfiable = self.importScripts.bind(self);
  const responder = self.postMessage.bind(self);
  let pyodidePromise = null;
  let apisBloqueadas = false;

  const bloquearApi = (nombre) => {
    try {
      Object.defineProperty(self, nombre, {
        configurable: false,
        enumerable: false,
        get: () => undefined,
        set: () => false,
      });
    } catch {
      try {
        self[nombre] = undefined;
      } catch {
        // DedicatedWorkerGlobalScope no expone DOM, cookies ni storage web.
      }
    }
  };

  const bloquearApisSensibles = () => {
    if (apisBloqueadas) return;
    apisBloqueadas = true;
    [
      "fetch",
      "XMLHttpRequest",
      "WebSocket",
      "EventSource",
      "WebTransport",
      "Worker",
      "SharedWorker",
      "BroadcastChannel",
      "indexedDB",
      "caches",
      "cookieStore",
      "navigator",
      "location",
      "importScripts",
      "loadPyodide",
      "postMessage",
      "close",
    ].forEach(bloquearApi);
  };

  const cargarPyodide = () => {
    if (pyodidePromise) return pyodidePromise;
    pyodidePromise = (async () => {
      importarConfiable(`${PYODIDE_BASE}pyodide.js`);
      if (typeof loadPyodide !== "function") {
        throw new Error("No se pudo cargar Pyodide.");
      }
      const pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });
      bloquearApisSensibles();
      return pyodide;
    })();
    return pyodidePromise;
  };

  const ejecutar = async (pyodide, codigo) => {
    const inicio = Date.now();
    const globals = pyodide.runPython("dict()");
    let salida = "";
    let stderr = "";
    let error = null;

    try {
      pyodide.runPython(
        `
import sys
from io import StringIO
__algolab_stdout = StringIO()
__algolab_stderr = StringIO()
__algolab_stdout_anterior = sys.stdout
__algolab_stderr_anterior = sys.stderr
sys.stdout = __algolab_stdout
sys.stderr = __algolab_stderr
`,
        { globals },
      );

      try {
        await pyodide.runPythonAsync(codigo, { globals });
      } catch (ejecucionError) {
        error = ejecucionError instanceof Error ? ejecucionError.message : String(ejecucionError);
      }

      salida = String(pyodide.runPython("__algolab_stdout.getvalue()", { globals }) ?? "");
      stderr = String(pyodide.runPython("__algolab_stderr.getvalue()", { globals }) ?? "");
    } finally {
      try {
        pyodide.runPython(
          `
sys.stdout = __algolab_stdout_anterior
sys.stderr = __algolab_stderr_anterior
`,
          { globals },
        );
      } catch {
        // El worker se reinicia ante un fallo de infraestructura.
      }
      globals.destroy();
    }

    const errorCompleto = [stderr.trim(), error].filter(Boolean).join("\n").trim();
    return {
      salida: salida.trim(),
      error: errorCompleto || null,
      exitoso: !errorCompleto,
      tiempoMs: Date.now() - inicio,
    };
  };

  self.addEventListener("message", async (evento) => {
    const solicitud = evento.data;
    if (!solicitud || typeof solicitud.id !== "string") return;

    if (solicitud.tipo === "ready") {
      try {
        await cargarPyodide();
        responder({ id: solicitud.id, tipo: "ready" });
      } catch (error) {
        responder({
          id: solicitud.id,
          tipo: "ready",
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return;
    }

    if (solicitud.tipo !== "run" || typeof solicitud.codigo !== "string") return;

    try {
      const pyodide = await cargarPyodide();
      const resultado = await ejecutar(pyodide, solicitud.codigo);
      responder({ id: solicitud.id, tipo: "result", resultado });
    } catch (error) {
      responder({
        id: solicitud.id,
        tipo: "result",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
})();
