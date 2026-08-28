import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { Worker as NodeWorker } from "node:worker_threads";
import { explicarErrorEnEspanol, obtenerLineaError } from "../src/lib/judge0.ts";
import { OOP_NIVELES } from "../src/lib/oop-niveles.ts";

const workerSource = await readFile(
  new URL("../public/workers/java-code-runner.js", import.meta.url),
  "utf8",
);
const normalizarSalida = (valor) => String(valor ?? "").replace(/\r\n/g, "\n").trim();

function ejecutarPython(codigo) {
  const resultado = spawnSync("python", ["-c", codigo], {
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  return {
    exitoso: resultado.status === 0,
    salida: resultado.stdout.trimEnd(),
    error: resultado.stderr.trim(),
  };
}

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
    worker.postMessage({ id: "matriz", tipo: "run", codigo });
  });
}

const pythonCases = [
  ["sintaxis", "x = 1\nif x print(x)", 2, /sintaxis/i],
  ["sangría", "if True:\nprint('x')", 2, /sangría/i],
  ["nombre", "x = 1\nprint(valor)", 2, /no está definido/i],
  ["local sin valor", "x = 1\ndef f():\n  print(x)\n  x = 2\nf()", 3, /antes de recibir un valor/i],
  ["atributo", "class A: pass\na = A()\nprint(a.nombre)", 3, /atributo o método/i],
  ["argumento faltante", "def sumar(a, b): return a + b\nprint(sumar(1))", 2, /Falta 1 argumento/i],
  ["argumento inesperado", "def f(a): return a\nf(valor=1)", 2, /argumento “valor”/i],
  ["no invocable", "x = 3\nx()", 2, /llamar como función/i],
  ["no iterable", "for x in 3:\n  print(x)", 1, /no es una colección/i],
  ["operadores", "print('a' - 1)", 1, /no admite los tipos/i],
  ["índice no permitido", "x = 3\nprint(x[0])", 2, /no permite índices/i],
  ["valor", "int('texto')", 1, /contenido no es válido/i],
  ["cero", "print(10 / 0)", 1, /dividir entre cero/i],
  ["índice", "x = []\nprint(x[1])", 2, /posición solicitada/i],
  ["clave", "x = {}\nprint(x['a'])", 2, /clave solicitada/i],
  ["assert", "x = 1\nassert x == 2", 2, /condición obligatoria/i],
  ["importación", "import modulo_que_no_existe", 1, /librería/i],
  ["recursión", "def f():\n  f()\nf()", 2, /demasiadas veces/i],
  ["desbordamiento", "import math\nmath.exp(1000)", 2, /demasiado grande/i],
];

for (const [nombre, codigo, lineaEsperada, patron] of pythonCases) {
  const resultado = ejecutarPython(codigo);
  assert.equal(resultado.exitoso, false, `Python/${nombre} debía fallar.`);
  assert.equal(obtenerLineaError(resultado.error, "python"), lineaEsperada, `Python/${nombre}: línea incorrecta.`);
  const explicado = explicarErrorEnEspanol(resultado.error, "python");
  assert.match(explicado ?? "", new RegExp(`^Línea ${lineaEsperada} ·`), `Python/${nombre}: falta la línea.`);
  assert.match(explicado ?? "", patron, `Python/${nombre}: explicación poco útil.`);
  assert.doesNotMatch(explicado ?? "", /line 573|_pyodide|Traceback/i, `Python/${nombre}: filtró detalles internos.`);
}

const javaCases = [
  ["variable", "class Main {\n void main(String[] args) {\n  System.out.println(valor);\n }\n}", 3, /no está definido|No se encontró/i],
  ["método", "class Main {\n void main(String[] args) {\n  inexistente();\n }\n}", 3, /no está definido|No se encontró/i],
  ["objeto nulo", "class Main {\n void main(String[] args) {\n  String texto = null;\n  texto.toUpperCase();\n }\n}", 4, /todavía no tiene valor|no tiene valor/i],
  ["llave", "class Main {\n void main(String[] args) {\n  System.out.println(1);\n }", 1, /sintaxis/i],
  ["paréntesis", "class Main {\n void main(String[] args) {\n  System.out.println(1;\n }\n}", 3, /sintaxis/i],
  ["cadena", "class Main {\n void main(String[] args) {\n  System.out.println(\"hola);\n }\n}", 3, /sintaxis/i],
  ["punto y coma", "class Main {\n void main(String[] args) {\n  int x = 2\n }\n}", 3, /sintaxis/i],
  ["cero", "class Main {\n void main(String[] args) {\n  int x = 10 / 0;\n }\n}", 3, /dividir entre cero|aritmética/i],
  ["argumentos", "class Main {\n void sumar(int a, int b) {}\n void main(String[] args) {\n  sumar(1);\n }\n}", 4, /espera 2 argumento/i],
];

for (const [nombre, codigo, lineaEsperada, patron] of javaCases) {
  const resultado = await ejecutarJava(codigo);
  assert.equal(resultado.exitoso, false, `Java/${nombre} debía fallar.`);
  assert.equal(obtenerLineaError(resultado.error, "java"), lineaEsperada, `Java/${nombre}: línea incorrecta. ${resultado.error}`);
  const explicado = explicarErrorEnEspanol(resultado.error, "java");
  assert.match(explicado ?? "", new RegExp(`^Línea ${lineaEsperada} ·`), `Java/${nombre}: falta la línea.`);
  assert.match(explicado ?? "", patron, `Java/${nombre}: explicación poco útil. ${explicado}`);
  assert.doesNotMatch(explicado ?? "", /__ALGOLAB_USER_LINE__|eval at|Function anonymous/i, `Java/${nombre}: filtró detalles internos.`);
}

for (const nivel of OOP_NIVELES) {
  const py = ejecutarPython(nivel.solucionPython);
  assert.equal(py.exitoso, true, `Solución Python ${nivel.subnivel} falló: ${py.error}`);
  assert.equal(normalizarSalida(py.salida), normalizarSalida(nivel.practica.salidaEsperada), `Salida Python ${nivel.subnivel} incorrecta.`);

  const java = await ejecutarJava(nivel.solucionJava);
  assert.equal(java.exitoso, true, `Solución Java ${nivel.subnivel} falló: ${java.error}`);
  const salidaJavaEsperada = nivel.practica.salidaEsperada.replace(/\bPython\b/g, "Java");
  assert.equal(normalizarSalida(java.salida), normalizarSalida(salidaJavaEsperada), `Salida Java ${nivel.subnivel} incorrecta.`);
}

const pyodideInterno = `Traceback (most recent call last):\n  File "/lib/python3.12/site-packages/_pyodide/_base.py", line 573, in eval_code_async\n  File "<exec>", line 9, in <module>\nNameError: name 'Michi' is not defined`;
assert.equal(obtenerLineaError(pyodideInterno, "python"), 9, "Nunca debe mostrarse la línea interna 573 de Pyodide.");

console.log(`OK: ${pythonCases.length} errores Python, ${javaCases.length} errores Java y ${OOP_NIVELES.length * 2} soluciones oficiales verificadas.`);
