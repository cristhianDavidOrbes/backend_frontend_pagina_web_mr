import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Worker as NodeWorker } from "node:worker_threads";

const [orquestador, javaWorker, pythonWorker] = await Promise.all([
  readFile(new URL("../src/lib/judge0.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/workers/java-code-runner.js", import.meta.url), "utf8"),
  readFile(new URL("../public/workers/python-code-runner.js", import.meta.url), "utf8"),
]);

assert.doesNotMatch(
  orquestador,
  /executeJavaCode|new Function|document\.createElement|loadPyodide\s*\(/,
  "El hilo principal no debe interpretar Java ni cargar Pyodide directamente.",
);
assert.match(orquestador, /new Worker\(/, "La ejecución debe delegarse a workers.");
assert.match(orquestador, /worker\.terminate\(\)/, "Debe existir un corte duro con terminate.");
assert.match(orquestador, /TIEMPO_MAXIMO_EJECUCION_MS\s*=\s*5_000/, "El límite debe ser 5 s.");

for (const [nombre, fuente] of [
  ["Java", javaWorker],
  ["Python", pythonWorker],
]) {
  for (const api of [
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "indexedDB",
    "cookieStore",
    "postMessage",
  ]) {
    assert.match(fuente, new RegExp(`["']${api}["']`), `${nombre} debe bloquear ${api}.`);
  }
  assert.doesNotMatch(
    fuente,
    /localStorage\.(?:getItem|setItem)|getAlgolabToken|algolab_token|document\.cookie/,
    `${nombre} no debe conocer almacenamiento, cookies ni tokens de sesión.`,
  );
}

assert.match(javaWorker, /executeJavaCode/, "Java debe ejecutarse exclusivamente dentro de su worker.");
assert.match(pythonWorker, /importScripts/, "Pyodide debe cargarse dentro del worker de Python.");

const ejecutarJavaReal = (codigo, timeoutMs = 1_000) => {
  const bootstrap = `
    const { parentPort } = require("node:worker_threads");
    globalThis.self = globalThis;
    globalThis.postMessage = (mensaje) => parentPort.postMessage(mensaje);
    globalThis.addEventListener = (tipo, listener) => {
      if (tipo === "message") parentPort.on("message", (data) => listener({ data }));
    };
    ${javaWorker}
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
      resolve(respuesta);
    });
    worker.postMessage({ id: "prueba", tipo: "run", codigo });
  });
};

const respuestaJava = await ejecutarJavaReal(`
class Main {
  public void main(String[] args) {
    System.out.println("aislado");
    System.out.println(globalThis);
  }
}
`);
assert.equal(respuestaJava.resultado.salida, "aislado\nnull");
assert.equal(respuestaJava.resultado.exitoso, true);

await assert.rejects(
  ejecutarJavaReal(`
class Main {
  public void main(String[] args) {
    while (true) {}
  }
}
`, 100),
  /TIMEOUT/,
  "Un ciclo infinito debe poder cortarse destruyendo el worker.",
);

console.log("OK: ejecutores Java/Python aislados, sin sesión y con terminación dura.");
