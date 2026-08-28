// code-diagnostics.ts
// Motor de Diagnóstico Pedagógico y Clasificación Exhaustiva de Errores para AlgoLab.
// Analiza tanto sintaxis estática como excepciones de runtime para Python y Java,
// traduciendo códigos de error técnicos en explicaciones claras con línea exacta,
// causa raíz del problema y sugerencia pedagógica para el estudiante.

export type DiagnosticoError = {
  linea: number | null;
  categoria:
    | "Sintaxis"
    | "Sangría e Indentación"
    | "Variables y Nombres"
    | "Tipos de Datos"
    | "Orientación a Objetos"
    | "Colecciones e Índices"
    | "Aritmética y Matemáticas"
    | "Control de Flujo"
    | "Librerías e Importaciones"
    | "Cruce de Lenguajes"
    | "Ejecución General";
  resumen: string;
  detalle: string;
  solucion: string;
  simboloAfectado?: string;
};

const PALABRAS_RESERVADAS_PYTHON = [
  "def", "class", "return", "pass", "for", "while", "if", "elif", "else",
  "import", "from", "as", "in", "is", "not", "and", "or", "try", "except",
  "finally", "with", "yield", "lambda", "global", "nonlocal", "raise", "break",
  "continue", "del", "assert", "async", "await"
];

const PALABRAS_RESERVADAS_JAVA = [
  "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
  "class", "const", "continue", "default", "do", "double", "else", "enum",
  "extends", "final", "finally", "float", "for", "goto", "if", "implements",
  "import", "instanceof", "int", "interface", "long", "native", "new", "package",
  "private", "protected", "public", "return", "short", "static", "strictfp",
  "super", "switch", "synchronized", "this", "throw", "throws", "transient",
  "try", "void", "volatile", "while"
];

/**
 * Analiza el código del estudiante ANTES de la ejecución para detectar errores comunes
 * y prevenir ejecuciones fallidas con explicaciones directas y exactas.
 */
export function analizarCodigoPrevio(
  codigo: string,
  lenguaje: "python" | "java",
): DiagnosticoError | null {
  const lineas = codigo.split("\n");

  // ─── 1. CRUCE DE LENGUAJES (Escribir Java/JS/C en Python o Python/JS en Java) ───
  if (lenguaje === "python") {
    for (let i = 0; i < lineas.length; i++) {
      const numLinea = i + 1;
      const linea = lineas[i].trim();
      if (linea.startsWith("#")) continue;

      if (/\bSystem\.out\.(?:println|print)\b/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Comando de Java en código Python",
          detalle: "Intentaste usar 'System.out.println', que pertenece a Java.",
          solucion: "En Python para imprimir en consola usa la función 'print(...)'.",
          simboloAfectado: "System.out.println",
        };
      }
      if (/\bpublic\s+class\b/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Estructura de clase Java en Python",
          detalle: "En Python no se utilizan modificadores de acceso como 'public class'.",
          solucion: "Para crear una clase en Python escribe simplemente 'class NombreClase:'.",
          simboloAfectado: "public class",
        };
      }
      if (/\bpublic\s+static\s+void\s+main\b/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Método main de Java en Python",
          detalle: "En Python no necesitas definir 'public static void main'.",
          solucion: "Escribe tus instrucciones directamente en el archivo o usa 'if __name__ == \"__main__\":'.",
          simboloAfectado: "public static void main",
        };
      }
      if (/\bnull\b/.test(linea) && !/["'].*null.*["']/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Uso de 'null' en lugar de 'None'",
          detalle: "En Python el valor nulo se escribe con 'None' (con N mayúscula).",
          solucion: "Reemplaza 'null' por 'None'.",
          simboloAfectado: "null",
        };
      }
      if (/\btrue\b/.test(linea) && !/["'].*true.*["']/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Booleano 'true' en minúsculas",
          detalle: "En Python los valores booleanos inician con mayúscula: 'True' y 'False'.",
          solucion: "Reemplaza 'true' por 'True'.",
          simboloAfectado: "true",
        };
      }
      if (/\bfalse\b/.test(linea) && !/["'].*false.*["']/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Booleano 'false' en minúsculas",
          detalle: "En Python los valores booleanos inician con mayúscula: 'True' y 'False'.",
          solucion: "Reemplaza 'false' por 'False'.",
          simboloAfectado: "false",
        };
      }
      if (/\bextends\b/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Palabra clave 'extends' en Python",
          detalle: "En Python la herencia no usa la palabra 'extends'.",
          solucion: "Pasa la clase padre entre paréntesis: 'class Hijo(Padre):'.",
          simboloAfectado: "extends",
        };
      }
      if (/\bimplements\b/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Palabra clave 'implements' en Python",
          detalle: "En Python no existe la palabra clave 'implements' para interfaces.",
          solucion: "En Python se usa herencia múltiple directa: 'class MiClase(Interfaz1, Interfaz2):'.",
          simboloAfectado: "implements",
        };
      }
      if (/console\.log\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Comando de JavaScript en Python",
          detalle: "Intentaste usar 'console.log', que pertenece a JavaScript.",
          solucion: "Usa la función 'print(...)' para mostrar texto en consola.",
          simboloAfectado: "console.log",
        };
      }
      if (/^\s*(?:let|const|var)\s+\w+/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Declaración con let/const/var en Python",
          detalle: "En Python las variables se declaran directamente asignando su valor (ej: nombre = 'Juan'), sin 'let', 'const' o 'var'.",
          solucion: "Elimina 'let', 'const' o 'var' y escribe directamente 'variable = valor'.",
        };
      }
      if (/^\s*function\s+\w+\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Palabra clave 'function' en Python",
          detalle: "En Python las funciones se definen con 'def', no con 'function'.",
          solucion: "Reemplaza 'function nombre()' por 'def nombre():'.",
          simboloAfectado: "function",
        };
      }
      if (/\bnew\s+[A-Z]\w*\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Palabra clave 'new' en Python",
          detalle: "En Python no se usa la palabra 'new' para instanciar objetos.",
          solucion: "Llama directamente al constructor: 'objeto = MiClase(...)'.",
          simboloAfectado: "new",
        };
      }
      if (/\bthis\.\w+/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Uso de 'this' en lugar de 'self' en Python",
          detalle: "En Python la referencia a la instancia actual de la clase se llama 'self', no 'this'.",
          solucion: "Reemplaza 'this.atributo' por 'self.atributo'.",
          simboloAfectado: "this",
        };
      }
      if (/\b(?:String|int|double|float|boolean|char)\s+[a-zA-Z_]\w*\s*=/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Declaración de tipos estilo Java en Python",
          detalle: "En Python no se antepone el tipo antes del nombre de la variable al declararla.",
          solucion: "Escribe directamente 'nombre = valor' sin especificar el tipo al inicio.",
        };
      }
      if (/\bprintf\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Función 'printf' de C/C++ en Python",
          detalle: "En Python para formatear e imprimir texto se usa print() con f-strings: print(f\"Valor: {x}\").",
          solucion: "Usa 'print(f\"...\")' en lugar de 'printf'.",
          simboloAfectado: "printf",
        };
      }
      if (/\b\w+\.length\b/i.test(linea) && !/["'].*length.*["']/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Propiedad '.length' en Python",
          detalle: "En Python para obtener el tamaño de una lista, cadena o colección se usa la función global len(coleccion).",
          solucion: "Reemplaza 'lista.length' por 'len(lista)'.",
          simboloAfectado: ".length",
        };
      }
      if (/\b\w+\.push\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Método '.push()' de JavaScript en Python",
          detalle: "En Python las listas agregan elementos usando el método '.append(elemento)'.",
          solucion: "Reemplaza '.push(...)' por '.append(...)'.",
          simboloAfectado: ".push",
        };
      }
    }
  } else {
    // Java
    for (let i = 0; i < lineas.length; i++) {
      const numLinea = i + 1;
      const linea = lineas[i].trim();
      if (linea.startsWith("//") || linea.startsWith("/*")) continue;

      if (/^\s*def\s+[a-zA-Z_]\w*\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Palabra clave 'def' de Python en Java",
          detalle: "En Java los métodos se declaran indicando el tipo de retorno y el nombre, no con 'def'.",
          solucion: "Declara el método con su tipo, por ejemplo: 'public void miMetodo()' o 'int sumar()'.",
          simboloAfectado: "def",
        };
      }
      if (/\bprint\s*\(/i.test(linea) && !/System\.out\.print/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Función 'print' de Python en Java",
          detalle: "En Java no existe la función global 'print(...)'.",
          solucion: "Usa 'System.out.println(...)' para imprimir con salto de línea.",
          simboloAfectado: "print",
        };
      }
      if (/\bNone\b/.test(linea) && !/["'].*None.*["']/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Uso de 'None' en lugar de 'null'",
          detalle: "En Java el valor nulo se escribe en minúsculas: 'null'.",
          solucion: "Reemplaza 'None' por 'null'.",
          simboloAfectado: "None",
        };
      }
      if (/\bTrue\b/.test(linea) && !/["'].*True.*["']/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Booleano 'True' con mayúscula en Java",
          detalle: "En Java los booleanos se escriben en minúsculas: 'true' y 'false'.",
          solucion: "Reemplaza 'True' por 'true'.",
          simboloAfectado: "True",
        };
      }
      if (/\bFalse\b/.test(linea) && !/["'].*False.*["']/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Booleano 'False' con mayúscula en Java",
          detalle: "En Java los booleanos se escriben en minúsculas: 'true' y 'false'.",
          solucion: "Reemplaza 'False' por 'false'.",
          simboloAfectado: "False",
        };
      }
      if (/console\.log\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Comando de JavaScript en Java",
          detalle: "Intentaste usar 'console.log', que pertenece a JavaScript.",
          solucion: "Usa 'System.out.println(...)' para imprimir en consola.",
          simboloAfectado: "console.log",
        };
      }
      if (/\bself\.\w+/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Uso de 'self' en lugar de 'this' en Java",
          detalle: "En Java la autoreferencia al objeto actual es 'this', no 'self'.",
          solucion: "Reemplaza 'self.atributo' por 'this.atributo'.",
          simboloAfectado: "self",
        };
      }
      if (/\b__init__\b/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Constructor '__init__' de Python en Java",
          detalle: "En Java los constructores llevan exactamente el mismo nombre de la clase (ej: 'Gato(...)'), no '__init__'.",
          solucion: "Declara el constructor usando el nombre de la clase.",
          simboloAfectado: "__init__",
        };
      }
      if (/\belif\b/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Condicional 'elif' de Python en Java",
          detalle: "En Java la condición alternativa se escribe 'else if (...)', no 'elif'.",
          solucion: "Reemplaza 'elif' por 'else if (...)'.",
          simboloAfectado: "elif",
        };
      }
      if (/\blen\s*\(/i.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Función 'len()' de Python en Java",
          detalle: "En Java para arreglos se usa '.length' y para textos/listas se usa '.length()' o '.size()'.",
          solucion: "Usa 'arreglo.length' o 'texto.length()'.",
          simboloAfectado: "len",
        };
      }
      if (/class\s+([A-Z]\w*)\s*\(\s*([A-Z]\w*)\s*\)\s*\{/i.test(linea)) {
        const matchHerencia = linea.match(/class\s+([A-Z]\w*)\s*\(\s*([A-Z]\w*)\s*\)\s*\{/i);
        return {
          linea: numLinea,
          categoria: "Cruce de Lenguajes",
          resumen: "Herencia con paréntesis estilo Python en Java",
          detalle: `En Java la herencia se declara con la palabra clave 'extends', no con paréntesis '(' y ')'.`,
          solucion: `Escribe 'class ${matchHerencia ? matchHerencia[1] : "Hijo"} extends ${matchHerencia ? matchHerencia[2] : "Padre"} {'.`,
          simboloAfectado: "extends",
        };
      }
    }
  }

  // ─── 2. DOS PUNTOS FALTANTES EN PYTHON ───
  if (lenguaje === "python") {
    for (let i = 0; i < lineas.length; i++) {
      const numLinea = i + 1;
      const linea = lineas[i].replace(/#.*$/, "").trim();
      if (!linea) continue;

      // Variables que inician con números
      const varIniciaNumero = linea.match(/^(\d+[a-zA-Z_]\w*)\s*=/);
      if (varIniciaNumero) {
        return {
          linea: numLinea,
          categoria: "Variables y Nombres",
          resumen: `Nombre de variable inválido: '${varIniciaNumero[1]}'`,
          detalle: "En programación los identificadores y nombres de variables NO pueden comenzar con números.",
          solucion: `Cambia el nombre para que empiece con una letra o guion bajo (ej: 'var${varIniciaNumero[1]}').`,
          simboloAfectado: varIniciaNumero[1],
        };
      }

      // Uso de palabras reservadas como nombres de variable
      for (const kw of PALABRAS_RESERVADAS_PYTHON) {
        const regexKwAsignacion = new RegExp(`^${kw}\\s*=(?!=)`);
        if (regexKwAsignacion.test(linea)) {
          return {
            linea: numLinea,
            categoria: "Variables y Nombres",
            resumen: `Palabra reservada '${kw}' usada como nombre de variable`,
            detalle: `'${kw}' es una palabra clave del lenguaje Python y no puede ser reasignada como variable.`,
            solucion: `Elige otro nombre descriptivo para tu variable (ej: '${kw}_valor' o 'mi_${kw}').`,
            simboloAfectado: kw,
          };
        }
      }

      // Asignación con = dentro de un if o while
      if (/^(?:if|elif|while)\s+[^=!<>\n]+=[^=!<>\n]+:/.test(linea)) {
        return {
          linea: numLinea,
          categoria: "Sintaxis",
          resumen: "Asignación '=' dentro de una condición",
          detalle: "Usaste un solo '=' (asignación) para evaluar la condición.",
          solucion: "Usa '==' (doble igual) para comprobar si dos valores son iguales.",
          simboloAfectado: "==",
        };
      }

      // ─── DOS PUNTOS FALTANTES EN PYTHON ───
      const palabrasClave = ["def", "class", "if", "elif", "else", "while", "for", "try", "except", "finally", "with"];
      for (const kw of palabrasClave) {
        const regexInicio = new RegExp(`^${kw}\\b`);
        if (regexInicio.test(linea) && !linea.endsWith(":")) {
          return {
            linea: numLinea,
            categoria: "Sintaxis",
            resumen: `Faltan los dos puntos ':' al final de '${kw}'`,
            detalle: `En Python todas las estructuras de bloque ('${kw}') deben terminar con dos puntos ':'.`,
            solucion: `Agrega ':' al final de la línea ${numLinea}.`,
            simboloAfectado: ":",
          };
        }
      }
    }
  }

  // ─── 3. ERRORES DE DELIMITADORES (Llaves, Paréntesis, Corchetes, Comillas) ───
  const aperturas: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const cierresInversos: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const pila: { char: string; linea: number }[] = [];

  for (let i = 0; i < lineas.length; i++) {
    const numLinea = i + 1;
    const linea = lineas[i];
    let enCadena: string | null = null;
    let escapado = false;

    for (let j = 0; j < linea.length; j++) {
      const c = linea[j];
      const siguiente = linea[j + 1];

      // Ignorar comentarios de una línea
      if (!enCadena && lenguaje === "python" && c === "#") break;
      if (!enCadena && lenguaje === "java" && c === "/" && siguiente === "/") break;

      if (enCadena) {
        if (!escapado && c === enCadena) {
          enCadena = null;
        }
        escapado = !escapado && c === "\\";
        continue;
      }

      if (c === '"' || c === "'") {
        enCadena = c;
        escapado = false;
        continue;
      }

      if (aperturas[c]) {
        pila.push({ char: c, linea: numLinea });
      } else if (cierresInversos[c]) {
        const ultimo = pila.pop();
        if (!ultimo || ultimo.char !== cierresInversos[c]) {
          return {
            linea: numLinea,
            categoria: "Sintaxis",
            resumen: `Delimitador de cierre '${c}' inesperado o huérfano`,
            detalle: `Encontraste '${c}' en la línea ${numLinea} sin una apertura '${cierresInversos[c]}' correspondiente previa.`,
            solucion: `Revisa los delimitadores abiertos y cerrados antes de la línea ${numLinea}.`,
            simboloAfectado: c,
          };
        }
      }
    }

    if (enCadena) {
      return {
        linea: numLinea,
        categoria: "Sintaxis",
        resumen: `Comilla de texto ${enCadena} sin cerrar`,
        detalle: `Abriste una cadena de texto con ${enCadena} en la línea ${numLinea} pero no la cerraste antes del final de la línea.`,
        solucion: `Cierra la cadena de texto con ${enCadena} al final del mensaje.`,
        simboloAfectado: enCadena,
      };
    }
  }

  if (pila.length > 0) {
    const sinCerrar = pila[pila.length - 1];
    return {
      linea: sinCerrar.linea,
      categoria: "Sintaxis",
      resumen: `Falta cerrar '${aperturas[sinCerrar.char]}' abierto en la línea ${sinCerrar.linea}`,
      detalle: `Abriste '${sinCerrar.char}' en la línea ${sinCerrar.linea} pero nunca fue cerrado con '${aperturas[sinCerrar.char]}'.`,
      solucion: `Añade '${aperturas[sinCerrar.char]}' donde termina el bloque o expresión correspondiente.`,
      simboloAfectado: aperturas[sinCerrar.char],
    };
  }

  // ─── 4. REGLAS ESTÁTICAS DE JAVA (Punto y coma, constructores, palabras reservadas) ───
  if (lenguaje === "java") {
    for (let i = 0; i < lineas.length; i++) {
      const numLinea = i + 1;
      const linea = lineas[i].replace(/\/\/.*$/, "").trim();
      if (!linea || linea.startsWith("/*") || linea.startsWith("*")) continue;
      const lineaSinCadenas = linea.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");

      const esSentencia =
        /^(?:(?:return|break|continue|throw)\b.*|(?:final\s+)?(?:String|int|double|float|long|short|byte|boolean|char|Object|[A-Z]\w*)(?:\[\])*\s+\w+.*|(?:this\.)?\w+(?:\.\w+)*\s*(?:=|\+=|-=|\*=|\/=|\+\+|--).*|System\.out\.(?:print|println)\s*\(.*\)|\w+\s*\(.*\))$/.test(
          lineaSinCadenas,
        );

      if (esSentencia && !/[{}]/.test(lineaSinCadenas) && !/^\s*(?:for|if|while|switch|catch)\b/.test(lineaSinCadenas) && !linea.endsWith(";")) {
        return {
          linea: numLinea,
          categoria: "Sintaxis",
          resumen: "Falta el punto y coma ';' al final de la instrucción",
          detalle: `En Java toda instrucción o declaración debe terminar con punto y coma ';'.`,
          solucion: `Coloca ';' al final de la línea ${numLinea}.`,
          simboloAfectado: ";",
        };
      }

      // Constructor con tipo de retorno void
      const constructorConVoid = linea.match(/^(?:public\s+|private\s+|protected\s+)?void\s+([A-Z]\w*)\s*\(/);
      if (constructorConVoid) {
        return {
          linea: numLinea,
          categoria: "Orientación a Objetos",
          resumen: `Constructor '${constructorConVoid[1]}' no debe llevar 'void'`,
          detalle: `Los constructores en Java NO llevan tipo de retorno (ni siquiera 'void').`,
          solucion: `Elimina 'void' de la declaración del constructor: '${constructorConVoid[1]}(...) { ... }'.`,
          simboloAfectado: constructorConVoid[1],
        };
      }

      // Variables con palabras reservadas en Java
      for (const kw of PALABRAS_RESERVADAS_JAVA) {
        const regexJavaKw = new RegExp(`(?:int|double|float|String|boolean|char)\\s+${kw}\\s*=` );
        if (regexJavaKw.test(linea)) {
          return {
            linea: numLinea,
            categoria: "Variables y Nombres",
            resumen: `Palabra reservada '${kw}' usada como identificador`,
            detalle: `'${kw}' es una palabra reservada del lenguaje Java y no puede ser utilizada como nombre de variable o método.`,
            solucion: `Cambia '${kw}' por un nombre no reservado como 'mi${kw.charAt(0).toUpperCase() + kw.slice(1)}'.`,
            simboloAfectado: kw,
          };
        }
      }
    }
  }

  // ─── 5. DIAGNÓSTICO ESTÁTICO DE POO EN PYTHON (self faltante en métodos) ───
  if (lenguaje === "python") {
    let dentroDeClase = false;
    for (let i = 0; i < lineas.length; i++) {
      const numLinea = i + 1;
      const lineaOriginal = lineas[i];
      const lineaTrim = lineaOriginal.trim();
      if (!lineaTrim || lineaTrim.startsWith("#")) continue;

      if (/^class\s+[A-Z]\w*/.test(lineaTrim)) {
        dentroDeClase = true;
        continue;
      }

      if (dentroDeClase) {
        // Fin de clase si vuelve al margen 0
        if (!/^\s+/.test(lineaOriginal) && !lineaTrim.startsWith("class")) {
          dentroDeClase = false;
        } else {
          // Método dentro de clase
          const matchMetodo = lineaTrim.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\):/);
          if (matchMetodo) {
            const nombreMetodo = matchMetodo[1];
            const params = matchMetodo[2].trim();
            if (nombreMetodo === "init") {
              return {
                linea: numLinea,
                categoria: "Orientación a Objetos",
                resumen: "Constructor 'init' mal nombrado (faltan guiones bajos)",
                detalle: "En Python el método constructor debe llamarse '__init__' con dos guiones bajos antes y después.",
                solucion: "Renombra 'def init(...)' por 'def __init__(self, ...):'.",
                simboloAfectado: "__init__",
              };
            }
            if (!params.startsWith("self") && !lineaTrim.includes("@staticmethod") && !lineaTrim.includes("@classmethod")) {
              return {
                linea: numLinea,
                categoria: "Orientación a Objetos",
                resumen: `Falta 'self' como primer parámetro en el método '${nombreMetodo}'`,
                detalle: `En Python todos los métodos de instancia deben recibir 'self' como su primer parámetro para acceder a los atributos del objeto.`,
                solucion: `Modifica la firma a 'def ${nombreMetodo}(self${params ? ", " + params : ""}):'.`,
                simboloAfectado: "self",
              };
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Traduce y diagnostica cualquier excepción o error técnico arrojado durante la ejecución en runtime.
 */
export function diagnosticarErrorRuntime(
  errorRaw: string,
  codigoEstudiante: string,
  lenguaje: "python" | "java",
): DiagnosticoError {
  const mensaje = (errorRaw || "").trim();

  // 1. Extraer número de línea
  let linea: number | null = null;
  if (lenguaje === "python") {
    const marcos = [...mensaje.matchAll(/File\s+["']<(?:exec|string|stdin|input)>["']\s*,\s*(?:line|línea)\s+(\d+)/gi)];
    const ultimo = marcos.at(-1);
    if (ultimo) linea = Number.parseInt(ultimo[1], 10);
  } else {
    const marcaJava = mensaje.match(/__ALGOLAB_USER_LINE__:(\d+)/i);
    if (marcaJava) linea = Number.parseInt(marcaJava[1], 10);
  }

  if (linea === null) {
    const coincidencias = [...mensaje.matchAll(/(?:line|línea)\s+(\d+)/gi)];
    const coincidencia = lenguaje === "python" ? coincidencias.at(-1) : coincidencias[0];
    if (coincidencia) linea = Number.parseInt(coincidencia[1], 10);
  }

  // ─── ERRORES DE SANGRÍA / INDENTACIÓN ───
  if (/IndentationError|unexpected indent|expected an indented block|unindent does not match/i.test(mensaje)) {
    const bloqueEsperado = mensaje.match(/expected an indented block (?:after ['"]?([^'":\n]+)['"]?|at line (\d+))/i);
    if (bloqueEsperado) {
      const contexto = bloqueEsperado[1] ? ` después de '${bloqueEsperado[1]}'` : "";
      return {
        linea,
        categoria: "Sangría e Indentación",
        resumen: "Falta indentar el bloque de código",
        detalle: `En Python el contenido dentro de una función, clase o condición${contexto} debe estar indentado con 2 o 4 espacios hacia la derecha.`,
        solucion: `Agrega sangría (2 espacios o tabulador) a las líneas que están dentro de la estructura.`,
      };
    }
    if (/unindent does not match any outer indentation level/i.test(mensaje)) {
      return {
        linea,
        categoria: "Sangría e Indentación",
        resumen: "Nivel de sangría desalineado",
        detalle: "La cantidad de espacios al inicio de esta línea no coincide con ningún bloque anterior.",
        solucion: "Alinea la línea exactamente con el inicio de su bloque o función correspondiente.",
      };
    }
    if (/unexpected indent/i.test(mensaje)) {
      return {
        linea,
        categoria: "Sangría e Indentación",
        resumen: "Sangría inesperada al inicio de la línea",
        detalle: "Esta línea tiene espacios al inicio pero no se encuentra dentro de ningún bloque o condicional.",
        solucion: "Elimina los espacios al principio de la línea para alinearla al margen izquierdo.",
      };
    }
    return {
      linea,
      categoria: "Sangría e Indentación",
      resumen: "Error de sangría en la estructura",
      detalle: "Revisa los espacios al inicio de las líneas para que cada bloque quede bien delimitado.",
      solucion: "Usa 2 o 4 espacios consistentes para indentar.",
    };
  }

  // ─── ERRORES DE NOMBRES Y VARIABLES NO DEFINIDAS ───
  const matchNameError =
    mensaje.match(/NameError:\s*name ['"]([^'"]+)['"] is not defined/i) ??
    mensaje.match(/(?:ReferenceError:\s*)?([A-Za-z_]\w*) is not defined/i);
  if (matchNameError) {
    const varName = matchNameError[1];
    let sugerencia = `Declara '${varName} = ...' antes de usarlo o verifica si está bien escrito.`;
    if (varName === "print" || varName === "Print" || varName === "pritn") {
      sugerencia = "La función para imprimir es 'print' en minúsculas.";
    } else if (varName === "true" || varName === "false") {
      sugerencia = "En Python los booleanos inician con mayúscula: 'True' y 'False'.";
    } else if (varName === "null") {
      sugerencia = "En Python el valor nulo se escribe 'None'.";
    }
    return {
      linea,
      categoria: "Variables y Nombres",
      resumen: `“${varName}” no está definido`,
      detalle: `El programa intentó usar '${varName}', pero no existe ninguna variable, función o clase con ese nombre en este punto.`,
      solucion: sugerencia,
      simboloAfectado: varName,
    };
  }

  const matchJavaSymbol = mensaje.match(/(?:cannot find symbol|is undefined)[\s\S]*?(?:method|variable|class)\s+([A-Za-z_]\w*)/i);
  if (matchJavaSymbol) {
    const simbolo = matchJavaSymbol[1];
    return {
      linea,
      categoria: "Variables y Nombres",
      resumen: `Símbolo no encontrado: “${simbolo}”`,
      detalle: `El compilador no encuentra ninguna variable, método o clase llamada '${simbolo}'.`,
      solucion: `Verifica que '${simbolo}' esté declarado antes de esta línea y que la ortografía de mayúsculas y minúsculas sea exacta.`,
      simboloAfectado: simbolo,
    };
  }

  const matchUnboundLocal = mensaje.match(/UnboundLocalError:.*local variable ['"]?([^'"\s]+)['"]?.*/i);
  if (matchUnboundLocal) {
    const varName = matchUnboundLocal[1];
    return {
      linea,
      categoria: "Variables y Nombres",
      resumen: `Variable local “${varName}” usada antes de ser asignada`,
      detalle: `Dentro de esta función intentaste leer '${varName}' antes de darle un valor inicial.`,
      solucion: `Asigna un valor inicial a '${varName}' antes de consultarla o utilizarla en operaciones.`,
      simboloAfectado: varName,
    };
  }

  // ─── ERRORES DE ATRIBUTOS Y MÉTODOS (POO) ───
  const matchAttrError = mensaje.match(/AttributeError:.*['"]?(\w+)['"]?\s+object has no attribute\s+['"]?([^'"\s]+)['"]?/i);
  if (matchAttrError) {
    const clase = matchAttrError[1];
    const atributo = matchAttrError[2];
    let sugerencia = `Comprueba el nombre exacto definido en la clase '${clase}' (recuerda que distingue mayúsculas de minúsculas).`;
    if (atributo === "length" || atributo === "size") {
      sugerencia = `En Python usa la función global len(objeto) en lugar de '.${atributo}'.`;
    } else if (atributo === "push") {
      sugerencia = "En listas de Python usa el método '.append(elemento)' en lugar de '.push()'.";
    }
    return {
      linea,
      categoria: "Orientación a Objetos",
      resumen: `El objeto '${clase}' no tiene el atributo o método “${atributo}”`,
      detalle: `Intentaste acceder a '.${atributo}', pero la clase '${clase}' no lo define en sus métodos ni en '__init__'.`,
      solucion: sugerencia,
      simboloAfectado: atributo,
    };
  }

  // ─── ERRORES DE TIPO Y ARGUMENTOS ───
  if (/TypeError|incompatible types|cannot be converted/i.test(mensaje)) {
    const missingArgs = mensaje.match(/missing (\d+) required positional argument(?:\(s\))?:?\s*(.*)/i);
    if (missingArgs) {
      const cantidad = missingArgs[1];
      const nombres = missingArgs[2] ? ` (${missingArgs[2]})` : "";
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: `Faltan ${cantidad} argumento(s) obligatorio(s)${nombres}`,
        detalle: "Llamaste a una función o método sin pasarle todos los valores que necesita para operar.",
        solucion: `Proporciona los ${cantidad} argumento(s) requeridos dentro de los paréntesis.`,
      };
    }

    const unexpectedKeyword = mensaje.match(/unexpected keyword argument ['"]([^'"]+)['"]/i);
    if (unexpectedKeyword) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: `Parámetro con nombre “${unexpectedKeyword[1]}” no reconocido`,
        detalle: `La función que estás llamando no tiene ningún parámetro llamado '${unexpectedKeyword[1]}'.`,
        solucion: `Revisa la definición de la función y los nombres de sus parámetros.`,
        simboloAfectado: unexpectedKeyword[1],
      };
    }

    const tooManyArgs = mensaje.match(/takes (\d+) positional argument[s]? but (\d+) (?:were|was) given/i);
    if (tooManyArgs) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: `Demasiados argumentos: esperaba ${tooManyArgs[1]} y recibió ${tooManyArgs[2]}`,
        detalle: "Pasaste más parámetros de los que la función o método tiene definidos.",
        solucion: `Ajusta los argumentos al llamar la función para que coincida con la cantidad definida (${tooManyArgs[1]}).`,
      };
    }

    if (/not callable/i.test(mensaje)) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: "Intentaste llamar un valor como función",
        detalle: "Pusiste paréntesis '()' después de una variable (como un número, texto o booleano) que no es una función.",
        solucion: "Quita los paréntesis '()' si se trata de una variable o atributo.",
      };
    }

    if (/can only concatenate str \(not ["']int["']\) to str|cannot concatenate ['"]str['"] and ['"]int['"]|TypeError: can only concatenate str/i.test(mensaje)) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: "No se puede concatenar texto con números directamente",
        detalle: "En Python no puedes unir una cadena de texto y un número entero usando el operador '+'.",
        solucion: "Usa un f-string: f\"Texto {variable_numerica}\" o convierte el número con str(numero).",
        simboloAfectado: "+",
      };
    }

    if (/unsupported operand type/i.test(mensaje)) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: "Operación no admitida entre estos tipos de datos",
        detalle: "Intentaste realizar una operación matemática o lógica entre tipos incompatibles.",
        solucion: "Verifica los tipos de ambos lados del operador y realiza las conversiones necesarias (ej: int(), str()).",
      };
    }

    if (/not iterable/i.test(mensaje)) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: "El valor no es una colección o elemento iterable",
        detalle: "Intentaste recorrer con un bucle 'for' un valor único (como un número o booleano) en lugar de una lista o rango.",
        solucion: "Usa una lista, cadena de texto o 'range(n)' para iterar.",
      };
    }

    if (/not subscriptable/i.test(mensaje)) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: "El tipo de dato no admite acceso por índice '[]'",
        detalle: "Intentaste usar corchetes '[0]' sobre un número, función o booleano.",
        solucion: "Los corchetes '[]' solo se pueden usar en listas, diccionarios, tuplas y cadenas de texto.",
      };
    }

    return {
      linea,
      categoria: "Tipos de Datos",
      resumen: "Incompatibilidad de tipos de datos",
      detalle: "Se intentó realizar una operación entre tipos de datos que no son compatibles.",
      solucion: "Revisa los tipos de tus variables y realiza conversiones explícitas.",
    };
  }

  // ─── ERRORES DE ÍNDICE Y COLECCIONES ───
  if (/IndexError|index out of (?:range|bounds)|ArrayIndexOutOfBoundsException|StringIndexOutOfBoundsException/i.test(mensaje)) {
    return {
      linea,
      categoria: "Colecciones e Índices",
      resumen: "Índice fuera de rango (Posición no existe)",
      detalle: "Intentaste consultar una posición en una lista o arreglo que no existe.",
      solucion: "Recuerda que en programación los índices empiezan en 0. El último elemento válido está en longitud - 1.",
    };
  }

  if (/KeyError:\s*['"]?([^'"\n]+)['"]?/i.test(mensaje)) {
    const keyMatch = mensaje.match(/KeyError:\s*['"]?([^'"\n]+)['"]?/i);
    const clave = keyMatch ? keyMatch[1] : "solicitada";
    return {
      linea,
      categoria: "Colecciones e Índices",
      resumen: `Clave “${clave}” no encontrada en el diccionario`,
      detalle: `Intentaste consultar la clave '${clave}', pero no existe en el diccionario o mapa.`,
      solucion: `Verifica cómo fue escrita la clave o usa .get('${clave}') para evitar errores si no existe.`,
      simboloAfectado: clave,
    };
  }

  // ─── ERRORES DE NULIDAD / PUNTEROS NULOS ───
  if (/NullPointerException|Cannot read properties of (?:undefined|null)|undefined is not an object/i.test(mensaje)) {
    return {
      linea,
      categoria: "Orientación a Objetos",
      resumen: "Referencia nula (NullPointerException)",
      detalle: "Intentaste llamar un método o acceder a un atributo sobre un objeto que tiene valor 'null' o no fue inicializado.",
      solucion: "Crea o asigna el objeto antes de acceder a sus propiedades (ej: objeto = new Clase(...)).",
    };
  }

  // ─── ERRORES ARITMÉTICOS Y MATEMÁTICOS ───
  if (/ZeroDivisionError|division by zero|\/ by zero|ArithmeticException/i.test(mensaje)) {
    return {
      linea,
      categoria: "Aritmética y Matemáticas",
      resumen: "División entre cero",
      detalle: "No es posible dividir un número entre cero en matemáticas ni en programación.",
      solucion: "Valida que el divisor sea distinto de cero antes de realizar la división.",
      simboloAfectado: "/",
    };
  }

  if (/ValueError|NumberFormatException/i.test(mensaje)) {
    const convError = mensaje.match(/(?:invalid literal for int\(\) with base 10|For input string):\s*['"]?([^'"\n]+)['"]?/i);
    if (convError) {
      return {
        linea,
        categoria: "Tipos de Datos",
        resumen: `No se puede convertir “${convError[1]}” a número`,
        detalle: `El texto '${convError[1]}' contiene letras o símbolos que no representan un número válido.`,
        solucion: "Asegúrate de que la cadena contenga únicamente dígitos numéricos antes de convertirla a número.",
        simboloAfectado: convError[1],
      };
    }
    return {
      linea,
      categoria: "Tipos de Datos",
      resumen: "Valor no válido para la operación",
      detalle: "El tipo de dato es correcto, pero su contenido o formato no es admitido por la función.",
      solucion: "Revisa los valores pasados a la función.",
    };
  }

  // ─── ERRORES DE RECURSIÓN Y CONTROL DE FLUJO ───
  if (/RecursionError|Maximum call stack|StackOverflowError/i.test(mensaje)) {
    return {
      linea,
      categoria: "Control de Flujo",
      resumen: "Recursión infinita (Desbordamiento de pila)",
      detalle: "La función se llamó a sí misma tantas veces que agotó la memoria del sistema.",
      solucion: "Asegúrate de tener un caso base con 'if' que detenga las llamadas recursivas.",
    };
  }

  if (/(?:SyntaxError:.*)?(?:['"]?break['"]?\s+outside loop)/i.test(mensaje)) {
    return {
      linea,
      categoria: "Control de Flujo",
      resumen: "'break' fuera de un bucle",
      detalle: "La instrucción 'break' solo puede usarse dentro de un bucle 'for' o 'while'.",
      solucion: "Elimina 'break' o colócalo dentro de un bucle.",
      simboloAfectado: "break",
    };
  }

  if (/(?:SyntaxError:.*)?(?:['"]?continue['"]?\s+not properly in loop|continue['"]?\s+outside loop)/i.test(mensaje)) {
    return {
      linea,
      categoria: "Control de Flujo",
      resumen: "'continue' fuera de un bucle",
      detalle: "La instrucción 'continue' solo puede usarse dentro de un bucle 'for' o 'while'.",
      solucion: "Elimina 'continue' o colócalo dentro de un bucle.",
      simboloAfectado: "continue",
    };
  }

  if (/(?:SyntaxError:.*)?(?:['"]?return['"]?\s+outside function)/i.test(mensaje)) {
    return {
      linea,
      categoria: "Control de Flujo",
      resumen: "'return' fuera de una función o método",
      detalle: "La sentencia 'return' solo tiene sentido dentro del cuerpo de una función o método.",
      solucion: "Coloca el 'return' dentro de una función 'def ...' o elimina la línea.",
      simboloAfectado: "return",
    };
  }

  // ─── CLASIFICACIÓN GENERAL PARA OTROS CASOS ───
  return {
    linea,
    categoria: "Ejecución General",
    resumen: "Error durante la ejecución del programa",
    detalle: mensaje.split("\n").filter(Boolean).at(-1) || "Revisa la lógica de tu solución.",
    solucion: "Verifica la sintaxis, tipos de variables y estructuras cerca de la línea indicada.",
  };
}

/**
 * Formatea un diagnóstico en un mensaje claro, estructurado y visual para la terminal.
 */
export function formatearDiagnosticoParaTerminal(diag: DiagnosticoError): string {
  const encLinea = diag.linea ? `Línea ${diag.linea} · ` : "";
  const categoriaEmoji: Record<string, string> = {
    "Sintaxis": "⚙️",
    "Sangría e Indentación": "📐",
    "Variables y Nombres": "🏷️",
    "Tipos de Datos": "🔄",
    "Orientación a Objetos": "🧱",
    "Colecciones e Índices": "📦",
    "Aritmética y Matemáticas": "🔢",
    "Control de Flujo": "🔀",
    "Librerías e Importaciones": "📚",
    "Cruce de Lenguajes": "🌐",
    "Ejecución General": "⚠️",
  };

  const emoji = categoriaEmoji[diag.categoria] || "⚠️";

  return `${encLinea}${emoji} ${diag.categoria}: ${diag.resumen}\n   ${diag.detalle}\n   💡 Sugerencia: ${diag.solucion}`;
}
