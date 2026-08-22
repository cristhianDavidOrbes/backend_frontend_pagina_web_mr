// Ejecución local aislada para los ejercicios de Programar POO.
// El código del estudiante nunca se evalúa en el hilo de la interfaz ni recibe
// datos de sesión: únicamente se intercambian mensajes serializables con workers.

export type ResultadoEjecucion = {
  salida: string;
  error: string | null;
  exitoso: boolean;
  tiempoMs?: number;
};

type LenguajeWorker = "python" | "java";

type SolicitudWorker = {
  id: string;
  tipo: "ready" | "run";
  codigo?: string;
};

type RespuestaWorker = {
  id: string;
  tipo: "ready" | "result";
  resultado?: ResultadoEjecucion;
  error?: string;
};

type PythonRuntime = {
  worker: Worker;
  listo: Promise<void>;
};

const TIEMPO_MAXIMO_EJECUCION_MS = 5_000;
const TIEMPO_MAXIMO_CARGA_PYODIDE_MS = 60_000;
const ERROR_TIMEOUT = "__ALGOLAB_EXECUTION_TIMEOUT__";

let pythonRuntime: PythonRuntime | null = null;

function crearId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function esRespuestaWorker(valor: unknown): valor is RespuestaWorker {
  if (!valor || typeof valor !== "object") return false;
  const respuesta = valor as Partial<RespuestaWorker>;
  return (
    typeof respuesta.id === "string" &&
    (respuesta.tipo === "ready" || respuesta.tipo === "result")
  );
}

function enviarSolicitud(
  worker: Worker,
  solicitud: Omit<SolicitudWorker, "id">,
  timeoutMs: number,
): Promise<RespuestaWorker> {
  const id = crearId();

  return new Promise((resolve, reject) => {
    let terminado = false;

    const limpiar = () => {
      worker.removeEventListener("message", alRecibirMensaje);
      worker.removeEventListener("error", alFallarWorker);
      clearTimeout(timeoutId);
    };

    const completar = (accion: () => void) => {
      if (terminado) return;
      terminado = true;
      limpiar();
      accion();
    };

    const alRecibirMensaje = (evento: MessageEvent<unknown>) => {
      if (!esRespuestaWorker(evento.data) || evento.data.id !== id) return;
      const respuesta = evento.data;
      completar(() => resolve(respuesta));
    };

    const alFallarWorker = () => {
      completar(() => reject(new Error("El entorno aislado dejó de responder.")));
    };

    const timeoutId = window.setTimeout(() => {
      completar(() => reject(new Error(ERROR_TIMEOUT)));
    }, timeoutMs);

    worker.addEventListener("message", alRecibirMensaje);
    worker.addEventListener("error", alFallarWorker);
    worker.postMessage({ ...solicitud, id } satisfies SolicitudWorker);
  });
}

function resultadoDeError(error: unknown, lenguaje: LenguajeWorker): ResultadoEjecucion {
  const mensaje = error instanceof Error ? error.message : String(error);

  if (mensaje === ERROR_TIMEOUT) {
    return {
      salida: "",
      error:
        "La ejecución superó 5 segundos y fue detenida de forma segura. " +
        "Revisa si tu programa tiene un ciclo infinito.",
      exitoso: false,
    };
  }

  if (lenguaje === "python" && /cargar|pyodide|fetch|conexi[oó]n/i.test(mensaje)) {
    return {
      salida: "",
      error:
        "No fue posible preparar Python. La primera ejecución necesita internet " +
        "para descargar el entorno local; verifica tu conexión y vuelve a intentarlo.",
      exitoso: false,
    };
  }

  return {
    salida: "",
    error: mensaje || "No fue posible ejecutar el código en el entorno aislado.",
    exitoso: false,
  };
}

function crearJavaWorker(): Worker {
  return new Worker("/workers/java-code-runner.js", {
    name: "algolab-java-runner",
  });
}

function crearPythonRuntime(): PythonRuntime {
  const worker = new Worker("/workers/python-code-runner.js", {
    name: "algolab-python-runner",
  });

  const listo = enviarSolicitud(
    worker,
    { tipo: "ready" },
    TIEMPO_MAXIMO_CARGA_PYODIDE_MS,
  ).then((respuesta) => {
    if (respuesta.error) throw new Error(respuesta.error);
  });

  const runtime = { worker, listo } satisfies PythonRuntime;
  listo.catch(() => {
    if (pythonRuntime === runtime) {
      worker.terminate();
      pythonRuntime = null;
    }
  });
  return runtime;
}

function obtenerPythonRuntime(): PythonRuntime {
  if (!pythonRuntime) pythonRuntime = crearPythonRuntime();
  return pythonRuntime;
}

async function ejecutarJava(codigo: string): Promise<ResultadoEjecucion> {
  const worker = crearJavaWorker();
  try {
    const respuesta = await enviarSolicitud(
      worker,
      { tipo: "run", codigo },
      TIEMPO_MAXIMO_EJECUCION_MS,
    );
    if (respuesta.error) throw new Error(respuesta.error);
    if (!respuesta.resultado) throw new Error("Java no devolvió un resultado válido.");
    return respuesta.resultado;
  } catch (error) {
    return resultadoDeError(error, "java");
  } finally {
    worker.terminate();
  }
}

async function ejecutarPython(codigo: string): Promise<ResultadoEjecucion> {
  const runtime = obtenerPythonRuntime();
  try {
    await runtime.listo;
    const respuesta = await enviarSolicitud(
      runtime.worker,
      { tipo: "run", codigo },
      TIEMPO_MAXIMO_EJECUCION_MS,
    );
    if (respuesta.error) throw new Error(respuesta.error);
    if (!respuesta.resultado) throw new Error("Python no devolvió un resultado válido.");
    return respuesta.resultado;
  } catch (error) {
    // Terminate es también el corte duro para ciclos infinitos; la siguiente
    // ejecución empieza con un intérprete limpio y sin estado compartido.
    runtime.worker.terminate();
    if (pythonRuntime === runtime) pythonRuntime = null;
    return resultadoDeError(error, "python");
  }
}

export async function ejecutarCodigo(
  codigo: string,
  lenguaje: LenguajeWorker,
): Promise<ResultadoEjecucion> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return {
      salida: "",
      error: "El ejecutor de código solo está disponible en un navegador compatible.",
      exitoso: false,
    };
  }

  return lenguaje === "python" ? ejecutarPython(codigo) : ejecutarJava(codigo);
}

/** Prepara Pyodide sin bloquear la interfaz. No envía sesión, perfil ni token. */
export function preCargaPyodide(): void {
  if (typeof window === "undefined" || typeof Worker === "undefined") return;
  obtenerPythonRuntime().listo.catch(() => {
    // Se mostrará un error claro si el estudiante intenta ejecutar Python.
  });
}
