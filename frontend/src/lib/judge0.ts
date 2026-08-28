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

/**
 * Obtiene la línea que pertenece al código del estudiante, no la primera
 * línea interna del runtime. Pyodide incluye antes marcos como
 * `_pyodide/_base.py, line 573`; el marco `<exec>` es el archivo real que
 * contiene lo escrito en el editor.
 */
export function obtenerLineaError(
  mensaje: string,
  lenguaje: LenguajeWorker,
): number | null {
  if (!mensaje) return null;

  if (lenguaje === "python") {
    const marcosDelEstudiante = [
      ...mensaje.matchAll(
        /File\s+["']<(?:exec|string|stdin|input)>["']\s*,\s*(?:line|línea)\s+(\d+)/gi,
      ),
    ];
    const ultimoMarco = marcosDelEstudiante.at(-1);
    if (ultimoMarco) return Number.parseInt(ultimoMarco[1], 10);
  }

  // El worker de Java adjunta esta marca después de convertir el código.
  const lineaMarcada = mensaje.match(/__ALGOLAB_USER_LINE__:(\d+)/i);
  if (lineaMarcada) return Number.parseInt(lineaMarcada[1], 10);

  const coincidencias = [...mensaje.matchAll(/(?:line|línea)\s+(\d+)/gi)];
  const coincidencia = lenguaje === "python" ? coincidencias.at(-1) : coincidencias[0];
  return coincidencia ? Number.parseInt(coincidencia[1], 10) : null;
}

function numeroDeLinea(mensaje: string, lenguaje: LenguajeWorker): string {
  const numero = obtenerLineaError(mensaje, lenguaje);
  return numero ? `Línea ${numero} · ` : "";
}

/**
 * Convierte los errores técnicos de los runtimes en una pista corta y útil.
 * Conservamos la última línea original cuando aporta un nombre concreto para
 * que el estudiante pueda relacionar la explicación con su código.
 */
export function explicarErrorEnEspanol(
  error: string | null,
  lenguaje: LenguajeWorker,
): string | null {
  if (!error) return null;

  const mensaje = error.trim();
  if (!mensaje) return "No fue posible ejecutar el código. Revisa la solución e inténtalo otra vez.";

  const linea = numeroDeLinea(mensaje, lenguaje);
  const ultimaLinea = mensaje.split("\n").map((parte) => parte.trim()).filter(Boolean).at(-1) ?? mensaje;

  if (/IndentationError|unexpected indent|expected an indented block/i.test(mensaje)) {
    return `${linea}Error de sangría: revisa los espacios al inicio de la línea y alinea el bloque con su estructura.`;
  }
  if (/SyntaxError|invalid syntax|unexpected (?:token|identifier)|';' expected|illegal start/i.test(mensaje)) {
    return `${linea}Error de sintaxis: revisa paréntesis, llaves, comillas, dos puntos y separadores cerca de esa línea.`;
  }

  const nombreNoDefinido = mensaje.match(/NameError:\s*name ['"]([^'"]+)['"] is not defined/i)
    ?? mensaje.match(/(?:ReferenceError:\s*)?([A-Za-z_]\w*) is not defined/i);
  if (nombreNoDefinido) {
    return `${linea}“${nombreNoDefinido[1]}” no está definido. Decláralo antes de utilizarlo o corrige su nombre.`;
  }

  const variableLocal = mensaje.match(
    /UnboundLocalError:.*local variable ['"]([^'"]+)['"].*referenced before assignment/i,
  ) ?? mensaje.match(
    /UnboundLocalError:.*local variable ['"]([^'"]+)['"].*not associated with a value/i,
  );
  if (variableLocal) {
    return `${linea}La variable “${variableLocal[1]}” se usó antes de recibir un valor dentro de esta función.`;
  }

  const atributoPython = mensaje.match(/AttributeError:.*has no attribute ['"]([^'"]+)['"]/i);
  if (atributoPython) {
    return `${linea}El objeto no tiene el atributo o método “${atributoPython[1]}”. Revisa la clase y la escritura del nombre.`;
  }
  const miembroJava = mensaje.match(/(?:cannot find symbol|is undefined)[\s\S]*?(?:method|variable)\s+([A-Za-z_]\w*)/i);
  if (miembroJava) {
    return `${linea}No se encontró “${miembroJava[1]}”. Comprueba que exista en la clase y que sea accesible desde este punto.`;
  }

  const propiedadNula = mensaje.match(
    /Cannot read properties of (?:undefined|null) \(reading ['"]([^'"]+)['"]\)/i,
  );
  if (propiedadNula) {
    return `${linea}Intentaste usar “${propiedadNula[1]}” sobre un objeto que no tiene valor. Inicializa el objeto antes de acceder a sus métodos o atributos.`;
  }

  if (/TypeError|incompatible types|cannot be converted/i.test(mensaje)) {
    const argumentosFaltantes = mensaje.match(/missing (\d+) required positional argument/i);
    if (argumentosFaltantes) {
      const cantidad = Number.parseInt(argumentosFaltantes[1], 10);
      return `${linea}${cantidad === 1 ? "Falta 1 argumento obligatorio" : `Faltan ${cantidad} argumentos obligatorios`} al llamar esta función o método.`;
    }
    const argumentoInesperado = mensaje.match(/unexpected keyword argument ['"]([^'"]+)['"]/i);
    if (argumentoInesperado) {
      return `${linea}El argumento “${argumentoInesperado[1]}” no existe en la función o método que estás llamando.`;
    }
    if (/not callable/i.test(mensaje)) {
      return `${linea}Intentaste llamar como función un valor que no se puede ejecutar. Revisa los paréntesis y el nombre usado.`;
    }
    if (/not iterable/i.test(mensaje)) {
      return `${linea}Intentaste recorrer un valor que no es una colección.`;
    }
    if (/unsupported operand type(?:\(s\))?/i.test(mensaje)) {
      return `${linea}La operación no admite los tipos de valores utilizados. Revisa ambos lados del operador.`;
    }
    if (/object is not subscriptable/i.test(mensaje)) {
      return `${linea}Intentaste acceder por posición a un valor que no permite índices.`;
    }
    return `${linea}Error de tipo: estás combinando valores u operaciones incompatibles. Revisa los tipos de las variables y parámetros.`;
  }
  if (/ValueError/i.test(mensaje)) {
    return `${linea}El valor tiene el tipo correcto, pero su contenido no es válido para esta operación.`;
  }
  if (/ZeroDivisionError|division by zero|\/ by zero/i.test(mensaje)) {
    return `${linea}No se puede dividir entre cero. Valida el divisor antes de realizar la operación.`;
  }
  if (/IndexError|index out of (?:range|bounds)/i.test(mensaje)) {
    return `${linea}La posición solicitada no existe en la colección. Revisa su tamaño y el índice utilizado.`;
  }
  if (/KeyError/i.test(mensaje)) {
    return `${linea}La clave solicitada no existe. Verifica el nombre de la clave antes de consultarla.`;
  }
  if (/NullPointerException|Cannot read properties of (?:undefined|null)|undefined is not an object/i.test(mensaje)) {
    return `${linea}Intentaste usar un objeto que todavía no tiene valor. Créalo o asígnalo antes de acceder a sus propiedades.`;
  }
  if (/RecursionError|Maximum call stack/i.test(mensaje)) {
    return `${linea}La función se está llamando demasiadas veces. Revisa la condición que debe detener la recursión.`;
  }
  if (/AssertionError/i.test(mensaje)) {
    return `${linea}No se cumplió una condición obligatoria de la solución. Revisa la condición indicada por assert.`;
  }
  if (/ModuleNotFoundError|ImportError|package .* does not exist/i.test(mensaje)) {
    return `${linea}No se encontró una librería utilizada por el código. En estos ejercicios usa únicamente las herramientas disponibles en el navegador.`;
  }
  if (/OverflowError|number outside safe range/i.test(mensaje)) {
    return `${linea}El resultado numérico es demasiado grande para esta operación.`;
  }
  if (/PermissionError|SecurityError/i.test(mensaje)) {
    return `${linea}La operación solicitada no está permitida dentro del compilador seguro.`;
  }
  if (/ArithmeticException/i.test(mensaje)) {
    return `${linea}La operación aritmética no es válida. Revisa divisiones, rangos y valores numéricos.`;
  }
  if (/ClassCastException/i.test(mensaje)) {
    return `${linea}No se puede convertir el objeto al tipo indicado.`;
  }
  if (/IllegalArgumentException/i.test(mensaje)) {
    const cantidadArgumentos = mensaje.match(
      /el método [“"]([^”"]+)[”"] espera ([\d o]+) argumento\(s\), pero recibió (\d+)/i,
    );
    if (cantidadArgumentos) {
      return `${linea}El método “${cantidadArgumentos[1]}” espera ${cantidadArgumentos[2]} argumento(s), pero recibió ${cantidadArgumentos[3]}.`;
    }
    return `${linea}Uno de los argumentos enviados al método no es válido.`;
  }

  const etiqueta = lenguaje === "python" ? "Python" : "Java";
  return `${linea}${etiqueta} encontró un error: ${ultimaLinea}`;
}

function normalizarResultado(
  resultado: ResultadoEjecucion,
  lenguaje: LenguajeWorker,
): ResultadoEjecucion {
  if (!resultado.error) return resultado;
  return {
    ...resultado,
    error: explicarErrorEnEspanol(resultado.error, lenguaje),
  };
}

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
    return normalizarResultado(respuesta.resultado, "java");
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
    return normalizarResultado(respuesta.resultado, "python");
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
