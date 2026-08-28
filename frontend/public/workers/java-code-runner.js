// Intérprete Java educativo dentro de un DedicatedWorker. Este archivo es
// JavaScript autocontenido porque Turbopack copia los worker TS como assets sin
// transpilarlos. No recibe token, perfil ni ninguna otra información de sesión.
(() => {
  "use strict";

  const responder = self.postMessage.bind(self);
  const FuncionConfiable = Function;

  const javaToString = (value) => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
  };

  const getClassNames = (code) => {
    const names = [];
    const regex = /\bclass\s+(\w+)/g;
    let match;
    while ((match = regex.exec(code)) !== null) names.push(match[1]);
    return names;
  };

  const getClassHierarchy = (code) => {
    const hierarchy = new Map();
    const regex = /class\s+(\w+)\s+extends\s+(\w+)/g;
    let match;
    while ((match = regex.exec(code)) !== null) hierarchy.set(match[1], match[2]);
    return hierarchy;
  };

  const stripParamTypes = (params) => {
    if (!params.trim()) return "";
    return params
      .split(",")
      .map((param) => {
        const tokens = param.trim().split(/\s+/);
        return tokens[tokens.length - 1];
      })
      .join(", ");
  };

  const crearErrorJava = (linea, mensaje) => ({
    stdout: "",
    error: `__ALGOLAB_USER_LINE__:${linea}\n${mensaje}`,
    tiempoMs: 0,
  });

  // JavaScript es más permisivo que Java. Esta validación previa conserva las
  // líneas del editor y evita aceptar como válidos varios errores habituales.
  const validarJavaBasico = (javaCode) => {
    const aperturas = { "(": ")", "[": "]", "{": "}" };
    const cierres = new Set(Object.values(aperturas));
    const pila = [];
    let linea = 1;
    let estado = "normal";
    let lineaInicio = 1;
    let escapado = false;
    let codigoLimpio = "";

    for (let i = 0; i < javaCode.length; i += 1) {
      const actual = javaCode[i];
      const siguiente = javaCode[i + 1];
      if (actual === "\n") {
        if (estado === "cadena" || estado === "caracter") {
          return crearErrorJava(lineaInicio, "SyntaxError: cadena de texto sin comilla de cierre");
        }
        if (estado === "comentarioLinea") estado = "normal";
        codigoLimpio += "\n";
        linea += 1;
        escapado = false;
        continue;
      }
      if (estado === "comentarioLinea") {
        codigoLimpio += " ";
        continue;
      }
      if (estado === "comentarioBloque") {
        if (actual === "*" && siguiente === "/") {
          codigoLimpio += "  ";
          i += 1;
          estado = "normal";
        } else codigoLimpio += " ";
        continue;
      }
      if (estado === "cadena" || estado === "caracter") {
        codigoLimpio += " ";
        const cierre = estado === "cadena" ? '"' : "'";
        if (!escapado && actual === cierre) estado = "normal";
        escapado = !escapado && actual === "\\";
        if (actual !== "\\") escapado = false;
        continue;
      }
      if (actual === "/" && siguiente === "/") {
        codigoLimpio += "  ";
        i += 1;
        estado = "comentarioLinea";
        continue;
      }
      if (actual === "/" && siguiente === "*") {
        codigoLimpio += "  ";
        i += 1;
        estado = "comentarioBloque";
        lineaInicio = linea;
        continue;
      }
      if (actual === '"' || actual === "'") {
        codigoLimpio += " ";
        estado = actual === '"' ? "cadena" : "caracter";
        lineaInicio = linea;
        escapado = false;
        continue;
      }

      codigoLimpio += actual;
      if (aperturas[actual]) pila.push({ caracter: actual, linea });
      else if (cierres.has(actual)) {
        const apertura = pila.pop();
        if (!apertura || aperturas[apertura.caracter] !== actual) {
          return crearErrorJava(
            apertura?.linea ?? linea,
            `SyntaxError: falta cerrar “${apertura ? aperturas[apertura.caracter] : "un delimitador"}” antes de “${actual}”`,
          );
        }
      }
    }

    if (estado === "cadena" || estado === "caracter") {
      return crearErrorJava(lineaInicio, "SyntaxError: cadena de texto sin comilla de cierre");
    }
    if (estado === "comentarioBloque") {
      return crearErrorJava(lineaInicio, "SyntaxError: comentario de bloque sin cierre */");
    }
    if (pila.length) {
      const apertura = pila.at(-1);
      return crearErrorJava(apertura.linea, `SyntaxError: falta cerrar “${aperturas[apertura.caracter]}”`);
    }

    const lineas = codigoLimpio.split("\n");
    for (let indice = 0; indice < lineas.length; indice += 1) {
      const contenido = lineas[indice].trim();
      if (/\/\s*[+-]?0+(?![\d.])/.test(contenido)) {
        return crearErrorJava(indice + 1, "ArithmeticException: / by zero");
      }
      const pareceSentencia = /^(?:return\b.+|break|continue|throw\b.+|(?:final\s+)?(?:String|int|double|float|long|short|byte|boolean|char|Object|[A-Z]\w*)(?:\[\])?\s+\w+.+|(?:this\.)?\w+(?:\.\w+)*\s*(?:=|\+=|-=|\*=|\/=|\+\+|--).+|(?:System\.out\.(?:print|println)|\w+(?:\.\w+)*)\s*\(.*\))$/.test(contenido);
      if (pareceSentencia && !/[{}]/.test(contenido) && !contenido.endsWith(";")) {
        return crearErrorJava(indice + 1, "SyntaxError: falta el punto y coma ; al final de la instrucción");
      }
    }

    const firmas = new Map();
    const regexFirma = /(?:public\s+|private\s+|protected\s+|static\s+|final\s+|synchronized\s+|abstract\s+)*(?:void|String|int|double|float|long|short|byte|boolean|char|Object|[A-Z]\w*)(?:\[\])?\s+(\w+)\s*\(([^()]*)\)\s*\{/g;
    let firma;
    while ((firma = regexFirma.exec(codigoLimpio)) !== null) {
      if (firma[1] === "main") continue;
      const cantidad = firma[2].trim() ? firma[2].split(",").length : 0;
      const permitidas = firmas.get(firma[1]) ?? new Set();
      permitidas.add(cantidad);
      firmas.set(firma[1], permitidas);
    }
    for (const [nombre, permitidas] of firmas) {
      const llamadas = new RegExp(`\\b${nombre}\\s*\\(([^()]*)\\)`, "g");
      let llamada;
      while ((llamada = llamadas.exec(codigoLimpio)) !== null) {
        const despues = codigoLimpio.slice(llamada.index + llamada[0].length).trimStart();
        if (despues.startsWith("{")) continue;
        const recibidas = llamada[1].trim() ? llamada[1].split(",").length : 0;
        if (!permitidas.has(recibidas)) {
          const numeroLinea = codigoLimpio.slice(0, llamada.index).split("\n").length;
          return crearErrorJava(
            numeroLinea,
            `IllegalArgumentException: el método “${nombre}” espera ${[...permitidas].join(" o ")} argumento(s), pero recibió ${recibidas}`,
          );
        }
      }
    }
    return null;
  };

  const transpileJavaToJS = (javaCode) => {
    let code = javaCode;
    const nombresDeMetodos = new Set();
    const detectorMetodos = /(?:public\s+|private\s+|protected\s+|static\s+|final\s+|synchronized\s+|abstract\s+)*(?:void|String|int|double|float|long|short|byte|boolean|char|Object|[A-Z]\w*)(?:\[\])?\s+(\w+)\s*\(/g;
    let metodoDetectado;
    while ((metodoDetectado = detectorMetodos.exec(javaCode)) !== null) {
      if (metodoDetectado[1] !== "main") nombresDeMetodos.add(metodoDetectado[1]);
    }

    code = code.replace(/\/\/[^\n]*/g, "");
    // Conservar los saltos de línea mantiene alineados editor y runtime.
    code = code.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
      comment.replace(/[^\n]/g, " "),
    );
    code = code.replace(/^\s*(package|import)\s+[^;]+;[^\n]*(?=\n|$)/gm, "");
    code = code.replace(/^\s*@\w+[^\n]*\n/gm, "\n");

    const classNames = getClassNames(code);
    const hierarchy = getClassHierarchy(code);

    code = code.replace(
      /(?:public\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+[\w\s,<>]+)?\s*\{/g,
      (_match, name, parent) =>
        parent ? `class ${name} extends ${parent} {` : `class ${name} {`,
    );

    code = code.replace(
      /^\s*(?:(?:public|private|protected|static)\s+)*abstract\s+\w+(?:\[\])?\s+(\w+)\s*\(([^)]*)\)\s*;/gm,
      (_match, name, params) =>
        `  ${name}(${stripParamTypes(params)}) { throw new Error("Método abstracto: ${name}"); }`,
    );

    for (const className of classNames) {
      const constructorRegex = new RegExp(
        `(^|\\n)([ \\t]*)(?:public\\s+|private\\s+|protected\\s+)?${className}\\s*\\(([^)]*)\\)\\s*\\{`,
        "gm",
      );
      code = code.replace(
        constructorRegex,
        (_match, before, indent, params) =>
          `${before}${indent}constructor(${stripParamTypes(params)}) {`,
      );
    }

    const modifiers = "(?:(?:public|private|protected|static|final|synchronized|abstract)\\s+)*";
    const returnType =
      "(?:void|String|int|double|float|long|short|byte|boolean|char|Object|[A-Z]\\w*)(?:\\[\\])?";
    const methodRegex = new RegExp(
      `^([ \\t]*)${modifiers}${returnType}\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[\\w,\\s]+)?\\{`,
      "gm",
    );
    code = code.replace(methodRegex, (match, indent, name, params) => {
      if (name === "constructor") return match;
      return `${indent}${name}(${stripParamTypes(params)}) {`;
    });

    // Java permite llamar métodos de la misma clase sin escribir `this.`.
    // JavaScript no resuelve esos nombres dentro de otro método, por lo que
    // agregamos la referencia únicamente en las invocaciones (no declaraciones).
    for (const nombre of nombresDeMetodos) {
      const llamada = new RegExp(
        `(^|[^\\w.])(${nombre}\\s*\\([^)]*\\))(\\s*\\{)?`,
        "gm",
      );
      code = code.replace(llamada, (match, prefijo, expresion, abreBloque) => {
        if (abreBloque) return match;
        return `${prefijo}this.${expresion}`;
      });
    }

    for (const [child] of hierarchy) {
      const superRegex = new RegExp(
        `(constructor\\([^)]*\\)\\s*\\{\\s*\\n)([ \\t]*)(?!super\\()`,
        "g",
      );
      const classSectionRegex = new RegExp(
        `class\\s+${child}\\b[\\s\\S]*?(?=class\\s+\\w+|$)`,
        "m",
      );
      code = code.replace(classSectionRegex, (section) =>
        section.replace(superRegex, (match, constructorOpen, indent) => {
          if (section.indexOf(`${constructorOpen}${indent}super(`) > -1) return match;
          // Insertarlo en la misma línea evita desplazar errores posteriores.
          return `${constructorOpen}${indent}super(); `;
        }),
      );
    }

    const primitives = "String|int|double|float|long|short|byte|boolean|char";
    code = code.replace(
      new RegExp(
        `\\b(?:[A-Z]\\w*|${primitives})(?:\\[\\])+\\s+(\\w+)\\s*=\\s*\\{([^{}\\n]+)\\}\\s*;`,
        "g",
      ),
      (_match, name, items) => `let ${name} = [${items}];`,
    );
    code = code.replace(
      new RegExp(
        `\\b(?:[A-Z]\\w*|${primitives})(?:\\[\\])+\\s+(\\w+)\\s*=\\s*new\\s+\\w+\\[([^\\]]+)\\]`,
        "g",
      ),
      "let $1 = new Array($2)",
    );
    code = code.replace(
      new RegExp(`\\b(?:[A-Z]\\w*|${primitives})(?:\\[\\])?\\s+(\\w+)\\s*=\\s*new\\s+`, "g"),
      "let $1 = new ",
    );
    code = code.replace(
      new RegExp(`\\b(${primitives})\\s+(\\w+)\\s*=(?!=)`, "g"),
      "let $2 =",
    );
    code = code.replace(
      new RegExp(
        `^([ \\t]*)(?:(?:public|private|protected|static|final)\\s+)*(?:${primitives}|[A-Z]\\w*)(?:\\[\\])?\\s+(\\w+)\\s*;`,
        "gm",
      ),
      "$1$2;",
    );

    code = code.replace(/System\.out\.println\(/g, "__println(");
    code = code.replace(/System\.out\.print\(/g, "__print(");
    code = code.replace(
      /for\s*\(\s*(?:final\s+)?(?:\w+(?:\[\])?)\s+(\w+)\s*:\s*([^)]+)\)/g,
      "for (const $1 of $2)",
    );
    code = code.replace(/String\.valueOf\(([^)]+)\)/g, "String($1)");
    code = code.replace(/Integer\.parseInt\(([^)]+)\)/g, "parseInt($1, 10)");
    code = code.replace(/Double\.parseDouble\(([^)]+)\)/g, "parseFloat($1)");
    code = code.replace(/\bMath\.PI\b/g, "Math.PI");
    return code;
  };

  const executeJavaCode = (javaSource) => {
    const inicio = Date.now();
    const errorBasico = validarJavaBasico(javaSource);
    if (errorBasico) {
      errorBasico.tiempoMs = Date.now() - inicio;
      return errorBasico;
    }
    let jsCode;
    try {
      jsCode = transpileJavaToJS(javaSource);
    } catch (error) {
      return {
        stdout: "",
        error: `Error al procesar el código Java: ${error instanceof Error ? error.message : String(error)}`,
        tiempoMs: Date.now() - inicio,
      };
    }

    const outputLines = [];
    let partialLine = "";
    const println = (value) => {
      outputLines.push(partialLine + javaToString(value));
      partialLine = "";
    };
    const print = (value) => {
      partialLine += javaToString(value);
    };
    const hasMain = /class\s+Main\b/.test(jsCode);
    const globalsBloqueados = [
      "window", "document", "self", "globalThis", "fetch", "XMLHttpRequest",
      "WebSocket", "localStorage", "sessionStorage", "indexedDB", "caches",
      "navigator", "location", "postMessage", "importScripts", "Worker",
      "SharedWorker", "BroadcastChannel", "alert", "confirm", "prompt",
    ];

    const lineaDelEstudiante = (error) => {
      const stack = error && typeof error === "object" && "stack" in error
        ? String(error.stack ?? "")
        : "";
      const marca = stack.match(/algolab-estudiante\.java:(\d+):\d+/i)
        ?? stack.match(/<anonymous>:(\d+):\d+/i);
      if (!marca) return null;
      // Function() añade dos líneas internas antes del cuerpo proporcionado.
      const linea = Number.parseInt(marca[1], 10) - 2;
      return Number.isFinite(linea) && linea > 0 ? linea : null;
    };

    try {
      const ejecutar = new FuncionConfiable(
        "__println",
        "__print",
        ...globalsBloqueados,
        `"use strict";${jsCode}
${hasMain ? "new Main().main([]);" : ""}
//# sourceURL=algolab-estudiante.java`,
      );
      ejecutar(println, print, ...globalsBloqueados.map(() => undefined));
      if (partialLine) outputLines.push(partialLine);
      return {
        stdout: outputLines.join("\n"),
        error: null,
        tiempoMs: Date.now() - inicio,
      };
    } catch (error) {
      const linea = lineaDelEstudiante(error);
      const rawOriginal = error && typeof error === "object" && "message" in error
        ? `${"name" in error ? error.name : "Error"}: ${error.message}`
        : String(error);
      const raw = `${linea ? `__ALGOLAB_USER_LINE__:${linea}\n` : ""}${rawOriginal}`;
      // La traducción se realiza en judge0.ts para que Python y Java utilicen
      // el mismo catálogo de mensajes y la misma línea del editor.
      return { stdout: "", error: raw, tiempoMs: Date.now() - inicio };
    }
  };

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
        // DedicatedWorkerGlobalScope ya carece de DOM, cookies y storage web.
      }
    }
  };

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
    "postMessage",
    "close",
  ].forEach(bloquearApi);

  self.addEventListener("message", (evento) => {
    const solicitud = evento.data;
    if (
      !solicitud ||
      solicitud.tipo !== "run" ||
      typeof solicitud.id !== "string" ||
      typeof solicitud.codigo !== "string"
    ) {
      return;
    }

    try {
      const resultadoJava = executeJavaCode(solicitud.codigo);
      responder({
        id: solicitud.id,
        tipo: "result",
        resultado: {
          salida: resultadoJava.stdout,
          error: resultadoJava.error,
          exitoso: resultadoJava.error === null,
          tiempoMs: resultadoJava.tiempoMs,
        },
      });
    } catch (error) {
      responder({
        id: solicitud.id,
        tipo: "result",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
})();
