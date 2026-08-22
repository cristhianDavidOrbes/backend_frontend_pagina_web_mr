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

  const transpileJavaToJS = (javaCode) => {
    let code = javaCode;

    code = code.replace(/\/\/[^\n]*/g, "");
    code = code.replace(/\/\*[\s\S]*?\*\//g, "");
    code = code.replace(/^\s*(package|import)\s+[^;]+;\s*\n?/gm, "");
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
          `${before}\n${indent}constructor(${stripParamTypes(params)}) {`,
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
          return `${constructorOpen}${indent}super();\n${indent}`;
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

    try {
      const ejecutar = new FuncionConfiable(
        "__println",
        "__print",
        `"use strict";
         const window = undefined, document = undefined, self = undefined,
               globalThis = undefined, fetch = undefined, XMLHttpRequest = undefined,
               WebSocket = undefined, localStorage = undefined, sessionStorage = undefined,
               indexedDB = undefined, caches = undefined, navigator = undefined,
               location = undefined, postMessage = undefined, importScripts = undefined,
               Worker = undefined, SharedWorker = undefined, BroadcastChannel = undefined,
               alert = undefined, confirm = undefined, prompt = undefined;
         ${jsCode}
         ${hasMain ? "new Main().main([]);" : ""}`,
      );
      ejecutar(println, print);
      if (partialLine) outputLines.push(partialLine);
      return {
        stdout: outputLines.join("\n"),
        error: null,
        tiempoMs: Date.now() - inicio,
      };
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error);
      const friendly = raw
        .replace(/^ReferenceError:\s*/, "Variable no definida: ")
        .replace(/^TypeError:\s*/, "Error de tipo: ")
        .replace(/^SyntaxError:\s*/, "Error de sintaxis: ")
        .replace(/is not defined/, "no está definida (¿olvidaste declarar la variable o usar this.?)")
        .replace(
          /Cannot read properties of undefined/,
          "No se puede acceder a una propiedad de un valor nulo",
        );
      return { stdout: "", error: friendly, tiempoMs: Date.now() - inicio };
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
