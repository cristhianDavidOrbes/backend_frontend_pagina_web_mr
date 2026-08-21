// java-interpreter.ts
// Transpila código Java simple OOP a JavaScript y lo ejecuta en el navegador.
// 100% local: sin servidores externos, sin instalaciones, sin internet.
// Diseñado para los patrones de los 8 niveles OOP de AlgoLab.

export type JavaExecutionResult = {
  stdout: string;
  error: string | null;
  tiempoMs: number;
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

function javaToString(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function getClassNames(code: string): string[] {
  const names: string[] = [];
  const re = /\bclass\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) names.push(m[1]);
  return names;
}

function getClassHierarchy(code: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /class\s+(\w+)\s+extends\s+(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) map.set(m[1], m[2]);
  return map;
}

/** Quita los tipos de los parámetros: "String nombre, int edad" → "nombre, edad" */
function stripParamTypes(params: string): string {
  if (!params.trim()) return "";
  return params
    .split(",")
    .map((p) => {
      const tokens = p.trim().split(/\s+/);
      return tokens[tokens.length - 1]; // último token = nombre del parámetro
    })
    .join(", ");
}

// ─── Transpilador Java → JavaScript ───────────────────────────────────────────

export function transpileJavaToJS(javaCode: string): string {
  let code = javaCode;

  // 1. Quitar comentarios de línea y de bloque
  code = code.replace(/\/\/[^\n]*/g, "");
  code = code.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. Quitar package e import
  code = code.replace(/^\s*(package|import)\s+[^;]+;\s*\n?/gm, "");

  // 3. Quitar anotaciones (@Override, @SuppressWarnings, etc.)
  code = code.replace(/^\s*@\w+[^\n]*\n/gm, "\n");

  // 4. Recopilar nombres de clases y jerarquía ANTES de transformar
  const classNames = getClassNames(code);
  const hierarchy = getClassHierarchy(code);

  // 5. Transformar declaraciones de clases:
  //    [public] [abstract] class Nombre [extends Padre] [implements ...] {
  code = code.replace(
    /(?:public\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+[\w\s,<>]+)?\s*\{/g,
    (_, name, parent) => (parent ? `class ${name} extends ${parent} {` : `class ${name} {`),
  );

  // 6. Transformar métodos abstractos (terminan en ; no en {)
  //    abstract ReturnType method(params); → method(params) { throw ... }
  code = code.replace(
    /^\s*(?:(?:public|private|protected|static)\s+)*abstract\s+\w+(?:\[\])?\s+(\w+)\s*\(([^)]*)\)\s*;/gm,
    (_, name, params) =>
      `  ${name}(${stripParamTypes(params)}) { throw new Error("Método abstracto: ${name}"); }`,
  );

  // 7. Transformar constructores: ClassName(params) { → constructor(params) {
  //    ANTES de la transformación general de métodos
  for (const cn of classNames) {
    const ctorRe = new RegExp(
      `(^|\\n)([ \\t]*)(?:public\\s+|private\\s+|protected\\s+)?${cn}\\s*\\(([^)]*)\\)\\s*\\{`,
      "gm",
    );
    code = code.replace(ctorRe, (_, before, indent, params) => {
      const body = `\n${indent}constructor(${stripParamTypes(params)}) {`;
      // Agregar super() automáticamente si es clase hija y no llama super
      // (se añadirá en el siguiente paso)
      return before + body;
    });
  }

  // 8. Transformar declaraciones de métodos generales:
  //    [modificadores] TipoRetorno methodName(params) { → methodName(params) {
  const modsPat = "(?:(?:public|private|protected|static|final|synchronized|abstract)\\s+)*";
  const retTypePat =
    "(?:void|String|int|double|float|long|short|byte|boolean|char|Object|[A-Z]\\w*)(?:\\[\\])?";
  const methodRe = new RegExp(
    `^([ \\t]*)${modsPat}${retTypePat}\\s+(\\w+)\\s*\\(([^)]*)\\)\\s*(?:throws\\s+[\\w,\\s]+)?\\{`,
    "gm",
  );
  code = code.replace(methodRe, (_, indent, name, params) => {
    if (name === "constructor") return _;
    return `${indent}${name}(${stripParamTypes(params)}) {`;
  });

  // 9. Añadir super() implícito a constructores de clases hijas que no lo tienen
  for (const [child] of hierarchy) {
    // Busca: constructor( ... ) {\n[sin super()]
    const superCheckRe = new RegExp(
      `(constructor\\([^)]*\\)\\s*\\{\\s*\\n)([ \\t]*)(?!super\\()`,
      "g",
    );
    // Para ser seguros: si el constructor existe en la clase hija y no empieza con super
    // Insertamos super() antes de la primera línea de código
    // Usamos un marcador de clase para no afectar otras clases
    const classSectionRe = new RegExp(
      `class\\s+${child}\\b[\\s\\S]*?(?=class\\s+\\w+|$)`,
      "m",
    );
    code = code.replace(classSectionRe, (section) => {
      return section.replace(superCheckRe, (m, ctorOpen, indent) => {
        // Solo agregar si no hay super( ya
        if (section.indexOf(`${ctorOpen}${indent}super(`) > -1) return m;
        return `${ctorOpen}${indent}super();\n${indent}`;
      });
    });
  }

  // 10. Transformar declaraciones de variables con asignación:
  //     Tipo name = valor; → let name = valor;

  const primitives = "String|int|double|float|long|short|byte|boolean|char";

  // Arrays de una línea: Tipo[] name = { a, b }; → let name = [a, b];
  code = code.replace(
    new RegExp(
      `\\b(?:[A-Z]\\w*|${primitives})(?:\\[\\])+\\s+(\\w+)\\s*=\\s*\\{([^{}\\n]+)\\}\\s*;`,
      "g",
    ),
    (_, name, items) => `let ${name} = [${items}];`,
  );

  // Arrays: Tipo[] name = new Tipo[tamaño]
  code = code.replace(
    new RegExp(
      `\\b(?:[A-Z]\\w*|${primitives})(?:\\[\\])+\\s+(\\w+)\\s*=\\s*new\\s+\\w+\\[([^\\]]+)\\]`,
      "g",
    ),
    "let $1 = new Array($2)",
  );

  // Tipo name = new ClassName(...)
  code = code.replace(
    new RegExp(`\\b(?:[A-Z]\\w*|${primitives})(?:\\[\\])?\\s+(\\w+)\\s*=\\s*new\\s+`, "g"),
    "let $1 = new ",
  );

  // Primitivo name = valor
  code = code.replace(
    new RegExp(`\\b(${primitives})\\s+(\\w+)\\s*=(?!=)`, "g"),
    "let $2 =",
  );

  // 11. Transformar declaraciones de campos de clase: [mods] Tipo nombre; → nombre;
  code = code.replace(
    new RegExp(
      `^([ \\t]*)(?:(?:public|private|protected|static|final)\\s+)*(?:${primitives}|[A-Z]\\w*)(?:\\[\\])?\\s+(\\w+)\\s*;`,
      "gm",
    ),
    "$1$2;",
  );

  // 12. System.out.println / System.out.print
  code = code.replace(/System\.out\.println\(/g, "__println(");
  code = code.replace(/System\.out\.print\(/g, "__print(");

  // 13. for-each: for (Tipo var : colección) → for (const var of colección)
  code = code.replace(
    /for\s*\(\s*(?:final\s+)?(?:\w+(?:\[\])?)\s+(\w+)\s*:\s*([^)]+)\)/g,
    "for (const $1 of $2)",
  );

  // 14. Conversiones adicionales Java → JS
  code = code.replace(/String\.valueOf\(([^)]+)\)/g, "String($1)");
  code = code.replace(/Integer\.parseInt\(([^)]+)\)/g, "parseInt($1, 10)");
  code = code.replace(/Double\.parseDouble\(([^)]+)\)/g, "parseFloat($1)");
  code = code.replace(/\bMath\.PI\b/g, "Math.PI");

  return code;
}

// ─── Ejecutor ──────────────────────────────────────────────────────────────────

export function executeJavaCode(javaSource: string): JavaExecutionResult {
  const inicio = Date.now();

  let jsCode: string;
  try {
    jsCode = transpileJavaToJS(javaSource);
  } catch (e) {
    return {
      stdout: "",
      error: `Error al procesar el código Java: ${e instanceof Error ? e.message : String(e)}`,
      tiempoMs: Date.now() - inicio,
    };
  }

  const outputLines: string[] = [];
  let partialLine = "";

  const __println = (value: unknown): void => {
    outputLines.push(partialLine + javaToString(value));
    partialLine = "";
  };

  const __print = (value: unknown): void => {
    partialLine += javaToString(value);
  };

  const hasMain = /class\s+Main\b/.test(jsCode);

  try {
    const fn = new Function(
      "__println",
      "__print",
      `"use strict";
       // Sandboxing básico: ocultar APIs del navegador
       const window = undefined, document = undefined, fetch = undefined,
             XMLHttpRequest = undefined, localStorage = undefined,
             sessionStorage = undefined, alert = undefined,
             confirm = undefined, prompt = undefined;
       ${jsCode}
       ${hasMain ? "new Main().main([]);" : ""}
      `,
    );

    fn(__println, __print);

    if (partialLine) outputLines.push(partialLine);

    return {
      stdout: outputLines.join("\n"),
      error: null,
      tiempoMs: Date.now() - inicio,
    };
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    // Mensajes de error más amigables para estudiantes
    const friendlyMsg = raw
      .replace(/^ReferenceError:\s*/, "Variable no definida: ")
      .replace(/^TypeError:\s*/, "Error de tipo: ")
      .replace(/^SyntaxError:\s*/, "Error de sintaxis: ")
      .replace(/is not defined/, "no está definida (¿olvidaste declarar la variable o usar this.?)")
      .replace(/Cannot read properties of undefined/, "No se puede acceder a una propiedad de un valor nulo");

    return { stdout: "", error: friendlyMsg, tiempoMs: Date.now() - inicio };
  }
}
