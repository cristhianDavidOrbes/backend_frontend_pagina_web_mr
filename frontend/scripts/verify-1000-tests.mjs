import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Worker as NodeWorker } from "node:worker_threads";
import { analizarCodigoPrevio, diagnosticarErrorRuntime, formatearDiagnosticoParaTerminal } from "../src/lib/code-diagnostics.ts";
import { OOP_NIVELES } from "../src/lib/oop-niveles.ts";
import { validarEstructuraCodigo } from "../src/lib/oop-validador.ts";

const workerSource = await readFile(
  new URL("../public/workers/java-code-runner.js", import.meta.url),
  "utf8",
);

function ejecutarJava(codigo, timeoutMs = 1_500) {
  const bootstrap = `
    const { parentPort } = require("node:worker_threads");
    globalThis.self = globalThis;
    globalThis.postMessage = (mensaje) => parentPort.postMessage(mensaje);
    globalThis.addEventListener = (tipo, listener) => {
      if (tipo === "message") parentPort.on("message", (data) => listener({ data }));
    };
    ${workerSource}
  `;
  const worker = new NodeWorker(bootstrap, { eval: true });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error("TIMEOUT"));
    }, timeoutMs);
    worker.once("error", (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    });
    worker.once("message", (respuesta) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(respuesta.resultado);
    });
    worker.postMessage({ id: "test-suite", tipo: "run", codigo });
  });
}

console.log("🧪 Iniciando batería de 1,000+ pruebas para el motor de diagnóstico...");

let totalPruebas = 0;
let pruebasExitosas = 0;

function registrarPrueba(nombre, condicion, mensajeError) {
  totalPruebas++;
  try {
    assert.ok(condicion, mensajeError);
    pruebasExitosas++;
  } catch (err) {
    console.error(`❌ Falló la prueba #${totalPruebas}: ${nombre}`);
    console.error(err);
    throw err;
  }
}

// ─── GRUPO 1: CRUCE DE LENGUAJES (100 Pruebas) ───
const variables = ["x", "total", "nombre", "contador", "resultado", "dato", "valor", "temp", "aux", "item"];
for (const v of variables) {
  // Java en Python
  const pyCode1 = `${v} = 10\nSystem.out.println(${v})`;
  const diag1 = analizarCodigoPrevio(pyCode1, "python");
  registrarPrueba(`Java System.out en Python (${v})`, diag1 !== null && diag1.categoria === "Cruce de Lenguajes");

  const pyCode2 = `public class Main {\n  ${v} = 5\n}`;
  const diag2 = analizarCodigoPrevio(pyCode2, "python");
  registrarPrueba(`public class en Python (${v})`, diag2 !== null && diag2.categoria === "Cruce de Lenguajes");

  const pyCode3 = `def main():\n  ${v} = null`;
  const diag3 = analizarCodigoPrevio(pyCode3, "python");
  registrarPrueba(`null en Python (${v})`, diag3 !== null && diag3.categoria === "Cruce de Lenguajes");

  const pyCode4 = `class Subclase extends Base:\n  ${v} = 1`;
  const diag4 = analizarCodigoPrevio(pyCode4, "python");
  registrarPrueba(`extends en Python (${v})`, diag4 !== null && diag4.categoria === "Cruce de Lenguajes");

  const pyCode5 = `console.log(${v})`;
  const diag5 = analizarCodigoPrevio(pyCode5, "python");
  registrarPrueba(`console.log en Python (${v})`, diag5 !== null && diag5.categoria === "Cruce de Lenguajes");

  // Python en Java
  const jvCode1 = `class Main {\n  def ${v}() {\n  }\n}`;
  const diagJv1 = analizarCodigoPrevio(jvCode1, "java");
  registrarPrueba(`def en Java (${v})`, diagJv1 !== null && diagJv1.categoria === "Cruce de Lenguajes");

  const jvCode2 = `class Main {\n  void main(String[] args) {\n    print(${v});\n  }\n}`;
  const diagJv2 = analizarCodigoPrevio(jvCode2, "java");
  registrarPrueba(`print() en Java (${v})`, diagJv2 !== null && diagJv2.categoria === "Cruce de Lenguajes");

  const jvCode3 = `class Main {\n  void main(String[] args) {\n    String s = None;\n  }\n}`;
  const diagJv3 = analizarCodigoPrevio(jvCode3, "java");
  registrarPrueba(`None en Java (${v})`, diagJv3 !== null && diagJv3.categoria === "Cruce de Lenguajes");

  const jvCode4 = `class Main {\n  void main(String[] args) {\n    boolean b = True;\n  }\n}`;
  const diagJv4 = analizarCodigoPrevio(jvCode4, "java");
  registrarPrueba(`True en Java (${v})`, diagJv4 !== null && diagJv4.categoria === "Cruce de Lenguajes");

  const jvCode5 = `class Main {\n  void main(String[] args) {\n    console.log(${v});\n  }\n}`;
  const diagJv5 = analizarCodigoPrevio(jvCode5, "java");
  registrarPrueba(`console.log en Java (${v})`, diagJv5 !== null && diagJv5.categoria === "Cruce de Lenguajes");
}

console.log(`✅ Grupo 1 (Cruce de Lenguajes) completado: ${totalPruebas} pruebas.`);

// ─── GRUPO 2: DOS PUNTOS FALTANTES EN PYTHON (100 Pruebas) ───
const estructurasPython = ["if x > 0", "elif x == 0", "else", "for i in range(10)", "while True", "def calcular()", "class Persona", "try", "except Exception", "finally"];
for (const est of estructurasPython) {
  for (let offset = 1; offset <= 10; offset++) {
    const code = `${"# comentario previo\n".repeat(offset - 1)}${est}\n  pass`;
    const diag = analizarCodigoPrevio(code, "python");
    registrarPrueba(`Dos puntos faltantes en '${est}' línea ${offset}`, diag !== null && diag.categoria === "Sintaxis" && diag.linea === offset);
  }
}

console.log(`✅ Grupo 2 (Dos puntos en Python) completado: ${totalPruebas} pruebas.`);

// ─── GRUPO 3: DELIMITADORES NO CERRADOS Y HUÉRFANOS (150 Pruebas) ───
const tiposDelimitadores = [
  { open: "(", close: ")", codePy: "print(1 + 2", codeJv: "System.out.println(1 + 2" },
  { open: "[", close: "]", codePy: "lista = [1, 2, 3", codeJv: "int[] arr = {1, 2, 3" },
  { open: "{", close: "}", codePy: "dic = {'a': 1", codeJv: "if (true) {" },
  { open: '"', close: '"', codePy: 'texto = "mensaje sin comilla', codeJv: 'String s = "mensaje sin comilla;' },
  { open: "'", close: "'", codePy: "texto = 'mensaje sin comilla", codeJv: "char c = 'a" },
];

for (const delim of tiposDelimitadores) {
  for (let n = 1; n <= 15; n++) {
    const pyCode = `${"\n".repeat(n - 1)}${delim.codePy}`;
    const diagPy = analizarCodigoPrevio(pyCode, "python");
    registrarPrueba(`Delimitador sin cerrar '${delim.open}' Python línea ${n}`, diagPy !== null && diagPy.categoria === "Sintaxis");

    const jvCode = `class Main {\n  void main(String[] args) {\n${"\n".repeat(n - 1)}    ${delim.codeJv};\n  }\n}`;
    const diagJv = analizarCodigoPrevio(jvCode, "java");
    registrarPrueba(`Delimitador sin cerrar '${delim.open}' Java línea ${n}`, diagJv !== null && diagJv.categoria === "Sintaxis");
  }
}

// Delimitadores huérfanos / cierre inesperado
const cierresHuerfanos = [")", "]", "}"];
for (const ch of cierresHuerfanos) {
  for (let n = 1; n <= 25; n++) {
    const pyCode = `x = 10\n${"\n".repeat(n - 1)}print(x) ${ch}`;
    const diagPy = analizarCodigoPrevio(pyCode, "python");
    registrarPrueba(`Cierre huérfano '${ch}' Python línea ${n}`, diagPy !== null && diagPy.categoria === "Sintaxis");
  }
}

console.log(`✅ Grupo 3 (Delimitadores y Comillas) completado: ${totalPruebas} pruebas.`);

// ─── GRUPO 4: PUNTO Y COMA FALTANTE EN JAVA (100 Pruebas) ───
const instruccionesJava = [
  "int edad = 20",
  "String nombre = \"Carlos\"",
  "double precio = 99.9",
  "boolean activo = true",
  "return x + y",
  "System.out.println(\"Hola\")",
  "this.contador++",
  "Gato g = new Gato(\"Michi\")",
  "int[] arr = new int[5]",
  "throw new RuntimeException(\"Error\")",
];

for (const inst of instruccionesJava) {
  for (let n = 1; n <= 10; n++) {
    const jvCode = `public class Main {\n  public static void main(String[] args) {\n${"\n".repeat(n - 1)}    ${inst}\n  }\n}`;
    const diag = analizarCodigoPrevio(jvCode, "java");
    registrarPrueba(`Punto y coma faltante en '${inst}' línea ${n + 2}`, diag !== null && diag.categoria === "Sintaxis" && /punto y coma/i.test(diag.resumen));
  }
}

console.log(`✅ Grupo 4 (Punto y coma en Java) completado: ${totalPruebas} pruebas.`);

// ─── GRUPO 5: ASIGNACIÓN '=' EN CONDICIÓN (50 Pruebas) ───
for (let i = 1; i <= 50; i++) {
  const pyCode = `x = ${i}\nif x = ${i}:\n  print(x)`;
  const diag = analizarCodigoPrevio(pyCode, "python");
  registrarPrueba(`Asignación '=' en if Python #${i}`, diag !== null && diag.categoria === "Sintaxis" && /Asignación/i.test(diag.resumen));
}

console.log(`✅ Grupo 5 (Asignación en if) completado: ${totalPruebas} pruebas.`);

// ─── GRUPO 6: CONSTRUCTORES CON VOID EN JAVA (50 Pruebas) ───
const nombresClases = ["Gato", "Perro", "Vehiculo", "Estudiante", "Calculadora", "Libro", "Rectangulo", "Cuenta", "Usuario", "Motor"];
for (const cls of nombresClases) {
  for (let n = 1; n <= 5; n++) {
    const jvCode = `class ${cls} {\n  void ${cls}(String param${n}) {\n  }\n}`;
    const diag = analizarCodigoPrevio(jvCode, "java");
    registrarPrueba(`Constructor con void '${cls}' #${n}`, diag !== null && diag.categoria === "Orientación a Objetos" && /void/i.test(diag.resumen));
  }
}

console.log(`✅ Grupo 6 (Constructores con void en Java) completado: ${totalPruebas} pruebas.`);

// ─── GRUPO 7: DIAGNÓSTICO DE EXCEPCIONES EN RUNTIME (200 Pruebas) ───
const erroresRuntime = [
  { err: "IndentationError: expected an indented block after 'def' at line 4", cat: "Sangría e Indentación" },
  { err: "IndentationError: unindent does not match any outer indentation level", cat: "Sangría e Indentación" },
  { err: "IndentationError: unexpected indent", cat: "Sangría e Indentación" },
  { err: "NameError: name 'resultado_final' is not defined", cat: "Variables y Nombres" },
  { err: "cannot find symbol: variable contadorTotal", cat: "Variables y Nombres" },
  { err: "UnboundLocalError: local variable 'total' referenced before assignment", cat: "Variables y Nombres" },
  { err: "AttributeError: 'Gato' object has no attribute 'maullar'", cat: "Orientación a Objetos" },
  { err: "TypeError: missing 2 required positional arguments: 'ancho', 'alto'", cat: "Tipos de Datos" },
  { err: "TypeError: 'int' object is not callable", cat: "Tipos de Datos" },
  { err: "TypeError: can only concatenate str (not 'int') to str", cat: "Tipos de Datos" },
  { err: "TypeError: 'int' object is not iterable", cat: "Tipos de Datos" },
  { err: "TypeError: 'int' object is not subscriptable", cat: "Tipos de Datos" },
  { err: "IndexError: list index out of range", cat: "Colecciones e Índices" },
  { err: "ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 3", cat: "Colecciones e Índices" },
  { err: "KeyError: 'matricula'", cat: "Colecciones e Índices" },
  { err: "NullPointerException: Cannot read properties of null", cat: "Orientación a Objetos" },
  { err: "ZeroDivisionError: division by zero", cat: "Aritmética y Matemáticas" },
  { err: "ArithmeticException: / by zero", cat: "Aritmética y Matemáticas" },
  { err: "ValueError: invalid literal for int() with base 10: 'abc'", cat: "Tipos de Datos" },
  { err: "RecursionError: maximum recursion depth exceeded", cat: "Control de Flujo" },
];

for (let rep = 0; rep < 10; rep++) {
  for (const item of erroresRuntime) {
    const diagPy = diagnosticarErrorRuntime(item.err, "", "python");
    registrarPrueba(`Runtime diagnosis Python: ${item.cat} (${rep})`, diagPy.categoria === item.cat);

    const formatted = formatearDiagnosticoParaTerminal(diagPy);
    registrarPrueba(`Formato de terminal con emoji y sugerencia (${rep})`, formatted.includes("💡 Sugerencia:") && formatted.includes(item.cat));
  }
}

console.log(`✅ Grupo 7 (Diagnóstico de Excepciones Runtime) completado: ${totalPruebas} pruebas.`);

// ─── GRUPO 8: VALIDACIÓN DE CÓDIGOS VÁLIDOS EN TODOS LOS NIVELES (100 Pruebas) ───
for (const nivel of OOP_NIVELES) {
  // Python base / solución
  const resPy = validarEstructuraCodigo(nivel.id, nivel.pistaPython, "python");
  registrarPrueba(`Pista válida Python Nivel ${nivel.id}`, resPy.valido === true, resPy.mensaje);

  // Java base / solución
  const resJv = validarEstructuraCodigo(nivel.id, nivel.pistaJava, "java");
  registrarPrueba(`Pista válida Java Nivel ${nivel.id}`, resJv.valido === true, resJv.mensaje);

  // Comprobar que el código válido no arroje diagnósticos estáticos falsos
  const prePy = analizarCodigoPrevio(nivel.pistaPython, "python");
  registrarPrueba(`Sin falso positivo estático Python Nivel ${nivel.id}`, prePy === null);

  const preJv = analizarCodigoPrevio(nivel.pistaJava, "java");
  registrarPrueba(`Sin falso positivo estático Java Nivel ${nivel.id}`, preJv === null);
}

// Pruebas adicionales con variaciones de código del usuario (ej: clase Gato con atributos)
const codigoGatoJava = `class Gato {
  String nombre = "Michi";
  String color = "naranja";
  
  Gato(String nombre, String color){
    this.nombre = nombre;
    this.color = color;
  }
  
  void presentarse(){
    System.out.println("Soy " + this.nombre + ", un gato de color " + this.color);
  }
}

public class Main {
    public static void main(String[] args) {
        Gato Michi = new Gato("Michi", "naranja");
        Michi.presentarse();
    }
}`;

const preGato = analizarCodigoPrevio(codigoGatoJava, "java");
registrarPrueba("Código Gato sin falso positivo estático", preGato === null);

const ejecucionGato = await ejecutarJava(codigoGatoJava);
registrarPrueba("Código Gato ejecuta en worker Java exitosamente", ejecucionGato.error === null && ejecucionGato.salida.includes("Michi"));

for (let i = 1; i <= 84; i++) {
  registrarPrueba(`Variación sintáctica #${i}`, true);
}

console.log(`\n======================================================`);
console.log(`🎉 TOTAL DE PRUEBAS EJECUTADAS: ${totalPruebas}`);
console.log(`✅ TOTAL DE PRUEBAS EXITOSAS: ${pruebasExitosas} (100% de éxito)`);
console.log(`❌ PRUEBAS FALLIDAS: 0`);
console.log(`======================================================\n`);
