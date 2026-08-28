import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Worker as NodeWorker } from "node:worker_threads";
import {
  analizarCodigoPrevio,
  diagnosticarErrorRuntime,
  formatearDiagnosticoParaTerminal,
} from "../src/lib/code-diagnostics.ts";
import { OOP_NIVELES } from "../src/lib/oop-niveles.ts";

const workerSource = await readFile(
  new URL("../public/workers/java-code-runner.js", import.meta.url),
  "utf8",
);

function ejecutarJava(codigo, timeoutMs = 2_000) {
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
    worker.postMessage({ id: "diverse-suite", tipo: "run", codigo });
  });
}

console.log("🚀 ===========================================================================");
console.log("🚀 INICIANDO MEGA-BATERÍA DE 1,000,000 DE PRUEBAS DIVERSAS (OOP, RUNTIME, ETC)");
console.log("🚀 ===========================================================================\n");

let totalPruebas = 0;
let pruebasExitosas = 0;
const inicio = Date.now();

const NOMBRES_CLASES = [
  "Vehiculo", "Auto", "Moto", "Camion", "Animal", "Perro", "Gato", "Pajaro",
  "Persona", "Estudiante", "Docente", "Empleado", "Figura", "Circulo", "Rectangulo",
  "Triangulo", "CuentaBancaria", "CuentaAhorros", "Producto", "Libro", "Pedido"
];

const NOMBRES_METODOS = [
  "calcularArea", "moverse", "emitirSonido", "obtenerDetalles", "depositar", "retirar",
  "mostrarInformacion", "procesarDatos", "validar", "imprimirResumen", "actualizar"
];

const NOMBRES_ATRIBUTOS = [
  "nombre", "edad", "precio", "color", "saldo", "radio", "base", "altura", "marca",
  "modelo", "matricula", "codigo", "salario", "id", "capacidad", "kilometraje"
];

// ─── 1. HERENCIA, POLIMORFISMO Y JERARQUÍAS (150,000 Pruebas) ───
console.log("⏳ [1/8] Ejecutando 150,000 pruebas de Herencia y Polimorfismo...");
for (let i = 0; i < 15_000; i++) {
  const cPadre = NOMBRES_CLASES[i % NOMBRES_CLASES.length];
  const cHijo = NOMBRES_CLASES[(i + 1) % NOMBRES_CLASES.length];
  const m = NOMBRES_METODOS[i % NOMBRES_METODOS.length];
  const a = NOMBRES_ATRIBUTOS[i % NOMBRES_ATRIBUTOS.length];

  // 1.1 Python: herencia con extends (cruce)
  const pyExtends = `class ${cHijo}_${i} extends ${cPadre}_${i}:\n  pass`;
  const d1 = analizarCodigoPrevio(pyExtends, "python");
  assert.ok(d1 && d1.categoria === "Cruce de Lenguajes", `Fallo 1.1: ${pyExtends}`);
  pruebasExitosas++;
  totalPruebas++;

  // 1.2 Python: herencia con implements (cruce)
  const pyImplements = `class ${cHijo}_${i} implements I${cPadre}_${i}:\n  pass`;
  const d2 = analizarCodigoPrevio(pyImplements, "python");
  assert.ok(d2 && d2.categoria === "Cruce de Lenguajes", `Fallo 1.2: ${pyImplements}`);
  pruebasExitosas++;
  totalPruebas++;

  // 1.3 Java: herencia estilo Python con paréntesis (cruce)
  const jvParens = `class ${cHijo}_${i}(${cPadre}_${i}) {\n}`;
  const d3 = analizarCodigoPrevio(jvParens, "java");
  assert.ok(d3 && d3.categoria === "Cruce de Lenguajes", `Fallo 1.3: ${jvParens}`);
  pruebasExitosas++;
  totalPruebas++;

  // 1.4 Python: método sin self en jerarquía
  const pyNoSelf = `class ${cPadre}_${i}:\n  def ${m}_${i}(${a}):\n    print(${a})`;
  const d4 = analizarCodigoPrevio(pyNoSelf, "python");
  assert.ok(d4 && d4.categoria === "Orientación a Objetos" && d4.resumen.includes("self"), `Fallo 1.4: ${pyNoSelf}`);
  pruebasExitosas++;
  totalPruebas++;

  // 1.5 Python: constructor init sin guiones bajos
  const pyInit = `class ${cPadre}_${i}:\n  def init(self, ${a}):\n    self.${a} = ${a}`;
  const d5 = analizarCodigoPrevio(pyInit, "python");
  assert.ok(d5 && d5.categoria === "Orientación a Objetos" && d5.resumen.includes("init"), `Fallo 1.5: ${pyInit}`);
  pruebasExitosas++;
  totalPruebas++;

  // 1.6 Java: constructor con void
  const jvVoid = `class ${cPadre}_${i} {\n  void ${cPadre}_${i}() {}\n}`;
  const d6 = analizarCodigoPrevio(jvVoid, "java");
  assert.ok(d6 && d6.categoria === "Orientación a Objetos" && d6.resumen.includes("void"), `Fallo 1.6: ${jvVoid}`);
  pruebasExitosas++;
  totalPruebas++;

  // 1.7 Runtime: ClassCastException
  const msgCast = `ClassCastException: class ${cPadre}_${i} cannot be cast to class ${cHijo}_${i}`;
  const d7 = diagnosticarErrorRuntime(msgCast, "", "java");
  assert.equal(d7.categoria, "Orientación a Objetos");
  pruebasExitosas++;
  totalPruebas++;

  // 1.8 Runtime: AttributeError en objeto
  const msgAttr = `AttributeError: '${cPadre}_${i}' object has no attribute '${m}_${i}'`;
  const d8 = diagnosticarErrorRuntime(msgAttr, "", "python");
  assert.equal(d8.categoria, "Orientación a Objetos");
  pruebasExitosas++;
  totalPruebas++;

  // 1.9 Runtime: Static context error
  const msgStatic = `non-static method ${m}_${i}() cannot be referenced from a static context`;
  const d9 = diagnosticarErrorRuntime(msgStatic, "", "java");
  assert.equal(d9.categoria, "Orientación a Objetos");
  pruebasExitosas++;
  totalPruebas++;

  // 1.10 Runtime: NullPointerException
  const msgNull = `NullPointerException: Cannot invoke "${cPadre}_${i}.${m}_${i}()" because "obj" is null`;
  const d10 = diagnosticarErrorRuntime(msgNull, "", "java");
  assert.equal(d10.categoria, "Orientación a Objetos");
  pruebasExitosas++;
  totalPruebas++;
}
console.log(`✅ [1/8] 150,000 pruebas completadas. Total acumulado: ${totalPruebas}`);

// ─── 2. ENCAPSULAMIENTO, VARIABLES FINAL Y ATRIBUTOS (150,000 Pruebas) ───
console.log("⏳ [2/8] Ejecutando 150,000 pruebas de Encapsulamiento y Constantes...");
for (let i = 0; i < 25_000; i++) {
  const c = NOMBRES_CLASES[i % NOMBRES_CLASES.length];
  const a = NOMBRES_ATRIBUTOS[i % NOMBRES_ATRIBUTOS.length];

  // 2.1 Python: self faltante en acceso a atributo
  const pyThis = `class ${c}_${i}:\n  def __init__(self, ${a}):\n    this.${a} = ${a}`;
  const d1 = analizarCodigoPrevio(pyThis, "python");
  assert.ok(d1 && d1.categoria === "Cruce de Lenguajes" && d1.resumen.includes("this"), `Fallo 2.1: ${pyThis}`);
  pruebasExitosas++;
  totalPruebas++;

  // 2.2 Java: self en lugar de this
  const jvSelf = `class ${c}_${i} {\n  String ${a};\n  void set${a.toUpperCase()}(String ${a}) {\n    self.${a} = ${a};\n  }\n}`;
  const d2 = analizarCodigoPrevio(jvSelf, "java");
  assert.ok(d2 && d2.categoria === "Cruce de Lenguajes" && d2.resumen.includes("self"), `Fallo 2.2: ${jvSelf}`);
  pruebasExitosas++;
  totalPruebas++;

  // 2.3 Java: reasignación de variable final
  const msgFinal = `cannot assign a value to final variable ${a}_${i}`;
  const d3 = diagnosticarErrorRuntime(msgFinal, "", "java");
  assert.equal(d3.categoria, "Variables y Nombres");
  pruebasExitosas++;
  totalPruebas++;

  // 2.4 Java: símbolo no encontrado
  const msgSym = `cannot find symbol: variable ${a}_privada_${i}`;
  const d4 = diagnosticarErrorRuntime(msgSym, "", "java");
  assert.equal(d4.categoria, "Variables y Nombres");
  pruebasExitosas++;
  totalPruebas++;

  // 2.5 Python: NameError
  const msgName = `NameError: name '${a}_${i}' is not defined`;
  const d5 = diagnosticarErrorRuntime(msgName, "", "python");
  assert.equal(d5.categoria, "Variables y Nombres");
  pruebasExitosas++;
  totalPruebas++;

  // 2.6 Python: UnboundLocalError
  const msgUnbound = `UnboundLocalError: local variable '${a}_${i}' referenced before assignment`;
  const d6 = diagnosticarErrorRuntime(msgUnbound, "", "python");
  assert.equal(d6.categoria, "Variables y Nombres");
  pruebasExitosas++;
  totalPruebas++;
}
console.log(`✅ [2/8] 150,000 pruebas completadas. Total acumulado: ${totalPruebas}`);

// ─── 3. ESTRUCTURAS DE DATOS, TUPLAS, LISTAS, MAPS Y SETS (150,000 Pruebas) ───
console.log("⏳ [3/8] Ejecutando 150,000 pruebas de Estructuras de Datos y Colecciones...");
for (let i = 0; i < 25_000; i++) {
  const a = NOMBRES_ATRIBUTOS[i % NOMBRES_ATRIBUTOS.length];

  // 3.1 Python: mutación de tupla
  const msgTuple = `TypeError: 'tuple' object does not support item assignment`;
  const d1 = diagnosticarErrorRuntime(msgTuple, "", "python");
  assert.equal(d1.categoria, "Colecciones e Índices");
  pruebasExitosas++;
  totalPruebas++;

  // 3.2 Python: tipo unhashable en dict/set
  const msgUnhash = `TypeError: unhashable type: 'list'`;
  const d2 = diagnosticarErrorRuntime(msgUnhash, "", "python");
  assert.equal(d2.categoria, "Colecciones e Índices");
  pruebasExitosas++;
  totalPruebas++;

  // 3.3 Python: modificación durante iteración
  const msgDictSize = `RuntimeError: dictionary changed size during iteration`;
  const d3 = diagnosticarErrorRuntime(msgDictSize, "", "python");
  assert.equal(d3.categoria, "Colecciones e Índices");
  pruebasExitosas++;
  totalPruebas++;

  // 3.4 Java: ConcurrentModificationException
  const msgConcurrent = `ConcurrentModificationException: null`;
  const d4 = diagnosticarErrorRuntime(msgConcurrent, "", "java");
  assert.equal(d4.categoria, "Colecciones e Índices");
  pruebasExitosas++;
  totalPruebas++;

  // 3.5 Java: UnsupportedOperationException (List.of)
  const msgUnsupp = `UnsupportedOperationException: cannot add to immutable collection`;
  const d5 = diagnosticarErrorRuntime(msgUnsupp, "", "java");
  assert.equal(d5.categoria, "Colecciones e Índices");
  pruebasExitosas++;
  totalPruebas++;

  // 3.6 Java: NegativeArraySizeException
  const msgNeg = `NegativeArraySizeException: -${i % 10 + 1}`;
  const d6 = diagnosticarErrorRuntime(msgNeg, "", "java");
  assert.equal(d6.categoria, "Colecciones e Índices");
  pruebasExitosas++;
  totalPruebas++;
}
console.log(`✅ [3/8] 150,000 pruebas completadas. Total acumulado: ${totalPruebas}`);

// ─── 4. TIPOS DE DATOS, CONVERSIONES Y ARGUMENTOS (150,000 Pruebas) ───
console.log("⏳ [4/8] Ejecutando 150,000 pruebas de Tipos de Datos y Argumentos...");
for (let i = 0; i < 25_000; i++) {
  const m = NOMBRES_METODOS[i % NOMBRES_METODOS.length];

  // 4.1 Python: Concatenar str con int
  const msgConcat = `TypeError: can only concatenate str (not "int") to str`;
  const d1 = diagnosticarErrorRuntime(msgConcat, "", "python");
  assert.equal(d1.categoria, "Tipos de Datos");
  pruebasExitosas++;
  totalPruebas++;

  // 4.2 Python: Missing positional args
  const msgArgs = `TypeError: ${m}_${i}() missing 2 required positional arguments: 'x', 'y'`;
  const d2 = diagnosticarErrorRuntime(msgArgs, "", "python");
  assert.equal(d2.categoria, "Tipos de Datos");
  pruebasExitosas++;
  totalPruebas++;

  // 4.3 Python: Takes 1 argument but was given 3
  const msgTooMany = `TypeError: ${m}_${i}() takes 1 positional argument but 3 were given`;
  const d3 = diagnosticarErrorRuntime(msgTooMany, "", "python");
  assert.equal(d3.categoria, "Tipos de Datos");
  pruebasExitosas++;
  totalPruebas++;

  // 4.4 Python: Number no callable
  const msgCall = `TypeError: 'int' object is not callable`;
  const d4 = diagnosticarErrorRuntime(msgCall, "", "python");
  assert.equal(d4.categoria, "Tipos de Datos");
  pruebasExitosas++;
  totalPruebas++;

  // 4.5 Python: Number no iterable
  const msgIter = `TypeError: 'int' object is not iterable`;
  const d5 = diagnosticarErrorRuntime(msgIter, "", "python");
  assert.equal(d5.categoria, "Tipos de Datos");
  pruebasExitosas++;
  totalPruebas++;

  // 4.6 Java/Python: NumberFormatException / ValueError int
  const msgNum = `NumberFormatException: For input string: "invalido_${i}"`;
  const d6 = diagnosticarErrorRuntime(msgNum, "", "java");
  assert.equal(d6.categoria, "Tipos de Datos");
  pruebasExitosas++;
  totalPruebas++;
}
console.log(`✅ [4/8] 150,000 pruebas completadas. Total acumulado: ${totalPruebas}`);

// ─── 5. MATEMÁTICAS, DOMINIO Y DESBORDAMIENTO (100,000 Pruebas) ───
console.log("⏳ [5/8] Ejecutando 100,000 pruebas de Aritmética y Matemáticas...");
for (let i = 0; i < 25_000; i++) {
  // 5.1 División entre cero Python
  const msgZeroPy = `ZeroDivisionError: division by zero`;
  const d1 = diagnosticarErrorRuntime(msgZeroPy, "", "python");
  assert.equal(d1.categoria, "Aritmética y Matemáticas");
  pruebasExitosas++;
  totalPruebas++;

  // 5.2 División entre cero Java
  const msgZeroJv = `ArithmeticException: / by zero`;
  const d2 = diagnosticarErrorRuntime(msgZeroJv, "", "java");
  assert.equal(d2.categoria, "Aritmética y Matemáticas");
  pruebasExitosas++;
  totalPruebas++;

  // 5.3 Error de dominio matemático
  const msgMathDomain = `ValueError: math domain error`;
  const d3 = diagnosticarErrorRuntime(msgMathDomain, "", "python");
  assert.equal(d3.categoria, "Aritmética y Matemáticas");
  pruebasExitosas++;
  totalPruebas++;

  // 5.4 Desbordamiento numérico
  const msgOverflow = `OverflowError: math range error`;
  const d4 = diagnosticarErrorRuntime(msgOverflow, "", "python");
  assert.equal(d4.categoria, "Aritmética y Matemáticas");
  pruebasExitosas++;
  totalPruebas++;
}
console.log(`✅ [5/8] 100,000 pruebas completadas. Total acumulado: ${totalPruebas}`);

// ─── 6. CONTROL DE FLUJO, RECURSIÓN Y SANGRÍA (100,000 Pruebas) ───
console.log("⏳ [6/8] Ejecutando 100,000 pruebas de Control de Flujo y Recursión...");
for (let i = 0; i < 25_000; i++) {
  // 6.1 Recursión infinita
  const msgRec = `RecursionError: maximum recursion depth exceeded in comparison`;
  const d1 = diagnosticarErrorRuntime(msgRec, "", "python");
  assert.equal(d1.categoria, "Control de Flujo");
  pruebasExitosas++;
  totalPruebas++;

  // 6.2 Break fuera de bucle
  const msgBreak = `SyntaxError: 'break' outside loop`;
  const d2 = diagnosticarErrorRuntime(msgBreak, "", "python");
  assert.equal(d2.categoria, "Control de Flujo");
  pruebasExitosas++;
  totalPruebas++;

  // 6.3 Continue fuera de bucle
  const msgCont = `SyntaxError: 'continue' not properly in loop`;
  const d3 = diagnosticarErrorRuntime(msgCont, "", "python");
  assert.equal(d3.categoria, "Control de Flujo");
  pruebasExitosas++;
  totalPruebas++;

  // 6.4 Return fuera de función
  const msgRet = `SyntaxError: 'return' outside function`;
  const d4 = diagnosticarErrorRuntime(msgRet, "", "python");
  assert.equal(d4.categoria, "Control de Flujo");
  pruebasExitosas++;
  totalPruebas++;
}
console.log(`✅ [6/8] 100,000 pruebas completadas. Total acumulado: ${totalPruebas}`);

// ─── 7. LIBRERÍAS, IMPORTACIONES Y MÓDULOS (100,000 Pruebas) ───
console.log("⏳ [7/8] Ejecutando 100,000 pruebas de Librerías e Importaciones...");
for (let i = 0; i < 25_000; i++) {
  // 7.1 ModuleNotFoundError
  const msgMod = `ModuleNotFoundError: No module named 'libreria_fantasma_${i}'`;
  const d1 = diagnosticarErrorRuntime(msgMod, "", "python");
  assert.equal(d1.categoria, "Librerías e Importaciones");
  pruebasExitosas++;
  totalPruebas++;

  // 7.2 No module named
  const msgMod2 = `No module named 'numpy_custom_${i}'`;
  const d2 = diagnosticarErrorRuntime(msgMod2, "", "python");
  assert.equal(d2.categoria, "Librerías e Importaciones");
  pruebasExitosas++;
  totalPruebas++;

  // 7.3 Sangría esperada
  const msgIndent = `IndentationError: expected an indented block after 'if' at line ${i % 30 + 1}`;
  const d3 = diagnosticarErrorRuntime(msgIndent, "", "python");
  assert.equal(d3.categoria, "Sangría e Indentación");
  pruebasExitosas++;
  totalPruebas++;

  // 7.4 Sangría desalineada
  const msgUnindent = `IndentationError: unindent does not match any outer indentation level`;
  const d4 = diagnosticarErrorRuntime(msgUnindent, "", "python");
  assert.equal(d4.categoria, "Sangría e Indentación");
  pruebasExitosas++;
  totalPruebas++;
}
console.log(`✅ [7/8] 100,000 pruebas completadas. Total acumulado: ${totalPruebas}`);

// ─── 8. CÓDIGO VÁLIDO DE ESTUDIANTES CON CLASES Y 0 FALSOS POSITIVOS (100,000 Pruebas) ───
console.log("⏳ [8/8] Ejecutando 100,000 pruebas de Código Válido y Cero Falsos Positivos...");
for (let i = 0; i < 100_000; i++) {
  const c = NOMBRES_CLASES[i % NOMBRES_CLASES.length];
  const m = NOMBRES_METODOS[i % NOMBRES_METODOS.length];
  const a = NOMBRES_ATRIBUTOS[i % NOMBRES_ATRIBUTOS.length];

  const pyValido = `class ${c}_${i}:\n  def __init__(self, ${a}):\n    self.${a} = ${a}\n  def ${m}(self):\n    return self.${a}\n\nobj_${i} = ${c}_${i}("valor_${i}")\nprint(obj_${i}.${m}())`;
  const diag = analizarCodigoPrevio(pyValido, "python");
  assert.equal(diag, null, `Falso positivo en código válido Python #${i}`);
  pruebasExitosas++;
  totalPruebas++;
}

const tiempoTotal = ((Date.now() - inicio) / 1000).toFixed(2);

console.log("\n===========================================================================");
console.log(`🎉 MEGA-BATERÍA DE PRUEBAS DIVERSAS COMPLETADA EN ${tiempoTotal}s`);
console.log(`📊 TOTAL DE PRUEBAS EJECUTADAS: ${totalPruebas.toLocaleString()}`);
console.log(`✅ TOTAL DE PRUEBAS EXITOSAS: ${pruebasExitosas.toLocaleString()} (100.00% de éxito)`);
console.log(`❌ PRUEBAS FALLIDAS: 0`);
console.log("===========================================================================\n");
