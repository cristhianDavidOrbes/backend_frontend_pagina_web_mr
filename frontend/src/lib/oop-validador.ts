// oop-validador.ts
// Validador de estructura y patrones de código para los retos de POO.
// Evita que el usuario pase niveles simplemente haciendo un "print" con el texto esperado
// sin aplicar los conceptos enseñados (variables, funciones, clases, encapsulamiento, herencia, abstracción, polimorfismo).

import type { LenguajeOOP } from "./oop-niveles";

export type ResultadoValidacion = {
  valido: boolean;
  mensaje?: string;
};

/** Quita comentarios y cadenas de texto literales para analizar la estructura real del código */
function limpiarCodigoParaAnalisis(codigo: string): string {
  return codigo
    .replace(/\/\/[^\n]*/g, "") // comentarios //
    .replace(/\/\*[\s\S]*?\*\//g, "") // comentarios /* */
    .replace(/#[^\n]*/g, ""); // comentarios #
}

export function validarEstructuraCodigo(
  nivelId: number,
  codigo: string,
  lenguaje: LenguajeOOP,
): ResultadoValidacion {
  const code = limpiarCodigoParaAnalisis(codigo);

  switch (nivelId) {
    case 1: {
      // Nivel 1: Variables y Tipos
      if (lenguaje === "python") {
        const tieneNombre = /\b(nombre|name)\s*=\s*["'][^"']+["']/i.test(code);
        const tieneEdad = /\b(edad|age)\s*=\s*\d+/i.test(code);
        const tieneLenguaje = /\b(lenguaje|language|lang)\s*=\s*["'][^"']+["']/i.test(code);

        if (!tieneNombre || !tieneEdad || !tieneLenguaje) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes declarar y asignar las 3 variables requeridas: 'nombre = ...', 'edad = ...' y 'lenguaje = ...' antes de imprimirlas.",
          };
        }

        // Verificar que el print use las variables y no sea solo texto fijo
        const printUsaVariables =
          /print\s*\(\s*f["'].*?\{(nombre|edad|lenguaje)\}/i.test(code) ||
          /print\s*\([^)]*(nombre|edad|lenguaje)[^)]*\)/i.test(code);

        if (!printUsaVariables) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes usar las variables 'nombre', 'edad' y 'lenguaje' dentro de la función print (por ejemplo con f-strings: f\"Hola, soy {nombre}...\").",
          };
        }
      } else {
        // Java
        const tieneNombre = /String\s+(nombre|name)\s*=\s*["'][^"']+["']/i.test(code);
        const tieneEdad = /int\s+(edad|age)\s*=\s*\d+/i.test(code);
        const tieneLenguaje = /String\s+(lenguaje|language|lang)\s*=\s*["'][^"']+["']/i.test(code);

        if (!tieneNombre || !tieneEdad || !tieneLenguaje) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes declarar las 3 variables con sus tipos: 'String nombre = ...;', 'int edad = ...;' y 'String lenguaje = ...;'.",
          };
        }

        const printUsaVariables =
          /System\.out\.println\([^)]*(nombre|edad|lenguaje)[^)]*\)/i.test(code);

        if (!printUsaVariables) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes usar las variables 'nombre', 'edad' y 'lenguaje' dentro de System.out.println concatenándolas con +.",
          };
        }
      }
      return { valido: true };
    }

    case 2: {
      // Nivel 2: Funciones y Métodos
      if (lenguaje === "python") {
        const tieneFuncion = /def\s+(calcular_area|calcularArea)\s*\([^)]*\)/i.test(code);
        const tieneReturn = /\breturn\b/i.test(code);
        const tieneMultiplicacion = /\*/.test(code);
        const llamaFuncion = /(calcular_area|calcularArea)\s*\(\s*\d+\s*,\s*\d+\s*\)/i.test(code);

        if (!tieneFuncion) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes definir la función 'def calcular_area(ancho, alto):' con sus parámetros correspondientes.",
          };
        }
        if (!tieneReturn || !tieneMultiplicacion) {
          return {
            valido: false,
            mensaje:
              "⚠️ La función debe calcular y retornar el resultado usando 'return ancho * alto'.",
          };
        }
        if (!llamaFuncion) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes llamar a la función 'calcular_area(6, 4)' y mostrar su resultado en el print.",
          };
        }
      } else {
        // Java
        const tieneMetodo = /(?:static\s+)?int\s+(calcularArea|calcular_area)\s*\([^)]*\)/i.test(code);
        const tieneReturn = /\breturn\b/i.test(code);
        const tieneMultiplicacion = /\*/.test(code);
        const llamaMetodo = /(calcularArea|calcular_area)\s*\(\s*\d+\s*,\s*\d+\s*\)/i.test(code);

        if (!tieneMetodo) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes definir el método 'static int calcularArea(int ancho, int alto)' dentro de la clase Main.",
          };
        }
        if (!tieneReturn || !tieneMultiplicacion) {
          return {
            valido: false,
            mensaje:
              "⚠️ El método debe retornar el cálculo del área usando 'return ancho * alto;'.",
          };
        }
        if (!llamaMetodo) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes llamar al método 'calcularArea(6, 4)' dentro del 'main' y mostrar su resultado.",
          };
        }
      }
      return { valido: true };
    }

    case 3: {
      // Nivel 3: Clases y Objetos
      if (lenguaje === "python") {
        const tieneClase = /\bclass\s+Gato\b/i.test(code);
        const tieneInit = /def\s+__init__\s*\(\s*self\s*,\s*nombre\s*,\s*color\s*\)/i.test(code);
        const tieneMetodo = /def\s+presentarse\s*\(\s*self\s*\)/i.test(code);
        const instanciaObjeto = /\b(michi|gato|\w+)\s*=\s*Gato\s*\(/i.test(code);
        const llamaMetodo = /\.presentarse\s*\(\s*\)/i.test(code);

        if (!tieneClase) {
          return {
            valido: false,
            mensaje: "⚠️ Debes definir la clase 'class Gato:'.",
          };
        }
        if (!tieneInit) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Gato debe tener el constructor '__init__(self, nombre, color)' guardando los atributos con 'self.nombre' y 'self.color'.",
          };
        }
        if (!tieneMetodo) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Gato debe tener el método 'def presentarse(self):' que imprima su presentación.",
          };
        }
        if (!instanciaObjeto || !llamaMetodo) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes crear un objeto gato (ej: michi = Gato('Michi', 'naranja')) y llamar a 'michi.presentarse()'.",
          };
        }
      } else {
        // Java
        const tieneClase = /\bclass\s+Gato\b/i.test(code);
        const tieneConstructor = /Gato\s*\(\s*String\s+\w+\s*,\s*String\s+\w+\s*\)/i.test(code);
        const tieneMetodo = /void\s+presentarse\s*\(\s*\)/i.test(code);
        const instanciaObjeto = /new\s+Gato\s*\(/i.test(code);
        const llamaMetodo = /\.presentarse\s*\(\s*\)/i.test(code);

        if (!tieneClase) {
          return {
            valido: false,
            mensaje: "⚠️ Debes definir la clase 'class Gato { ... }'.",
          };
        }
        if (!tieneConstructor) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Gato debe tener un constructor 'Gato(String nombre, String color)' que inicialice 'this.nombre' y 'this.color'.",
          };
        }
        if (!tieneMetodo) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Gato debe tener el método 'void presentarse()' que imprima su presentación.",
          };
        }
        if (!instanciaObjeto || !llamaMetodo) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes instanciar el gato con 'new Gato(\"Michi\", \"naranja\")' y llamar a su método '.presentarse()'.",
          };
        }
      }
      return { valido: true };
    }

    case 4: {
      // Nivel 4: Encapsulamiento
      if (lenguaje === "python") {
        const tieneClase = /\bclass\s+Estudiante\b/i.test(code);
        const tieneAtributoPrivado = /self\.__nota\b|self\._nota\b/i.test(code);
        const tieneGetter = /def\s+(get_nota|getNota)\s*\(\s*self\s*\)/i.test(code);
        const tieneSetter = /def\s+(set_nota|setNota)\s*\(\s*self\s*,\s*\w+\s*\)/i.test(code);
        const tieneValidacion = /(0\s*<=|>\s*=\s*0|<=?\s*100|>\s*100)/.test(code);

        if (!tieneClase) {
          return { valido: false, mensaje: "⚠️ Debes definir la clase 'class Estudiante:'." };
        }
        if (!tieneAtributoPrivado) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes usar un atributo privado con doble guion bajo ('self.__nota') para proteger el dato.",
          };
        }
        if (!tieneGetter || !tieneSetter) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes implementar los métodos 'get_nota(self)' y 'set_nota(self, valor)'.",
          };
        }
        if (!tieneValidacion) {
          return {
            valido: false,
            mensaje:
              "⚠️ El método 'set_nota' debe validar que la nota se encuentre en el rango de 0 a 100.",
          };
        }
      } else {
        // Java
        const tieneClase = /\bclass\s+Estudiante\b/i.test(code);
        const tienePrivado = /private\s+int\s+nota/i.test(code);
        const tieneGetter = /int\s+(getNota|get_nota)\s*\(\s*\)/i.test(code);
        const tieneSetter = /void\s+(setNota|set_nota)\s*\(\s*int\s+\w+\s*\)/i.test(code);
        const tieneValidacion = /(0\s*<=|>\s*=\s*0|<=?\s*100|>\s*100)/.test(code);

        if (!tieneClase) {
          return { valido: false, mensaje: "⚠️ Debes definir la clase 'class Estudiante { ... }'." };
        }
        if (!tienePrivado) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes declarar el atributo como privado usando 'private int nota;'.",
          };
        }
        if (!tieneGetter || !tieneSetter) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes implementar los métodos 'public int getNota()' y 'public void setNota(int valor)'.",
          };
        }
        if (!tieneValidacion) {
          return {
            valido: false,
            mensaje:
              "⚠️ El método 'setNota' debe validar con un if que el valor esté entre 0 y 100.",
          };
        }
      }
      return { valido: true };
    }

    case 5: {
      // Nivel 5: Herencia
      if (lenguaje === "python") {
        const tieneVehiculo = /\bclass\s+Vehiculo\b/i.test(code);
        const tieneMotoHerencia = /\bclass\s+Moto\s*\(\s*Vehiculo\s*\)/i.test(code);
        const tieneArrancar = /def\s+arrancar\s*\(\s*self\s*\)/i.test(code);
        const tieneWheelie = /def\s+wheelie\s*\(\s*self\s*\)/i.test(code);

        if (!tieneVehiculo) {
          return { valido: false, mensaje: "⚠️ Debes definir la clase base 'class Vehiculo:'." };
        }
        if (!tieneMotoHerencia) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Moto debe heredar de Vehiculo usando la sintaxis: 'class Moto(Vehiculo):'.",
          };
        }
        if (!tieneArrancar || !tieneWheelie) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes definir el método 'arrancar()' en Vehiculo y el método 'wheelie()' en Moto.",
          };
        }
      } else {
        // Java
        const tieneVehiculo = /\bclass\s+Vehiculo\b/i.test(code);
        const tieneMotoExtends = /\bclass\s+Moto\s+extends\s+Vehiculo\b/i.test(code);
        const tieneSuper = /\bsuper\s*\(/i.test(code);
        const tieneArrancar = /void\s+arrancar\s*\(\s*\)/i.test(code);
        const tieneWheelie = /void\s+wheelie\s*\(\s*\)/i.test(code);

        if (!tieneVehiculo) {
          return { valido: false, mensaje: "⚠️ Debes definir la clase padre 'class Vehiculo'." };
        }
        if (!tieneMotoExtends) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Moto debe heredar usando 'extends': 'class Moto extends Vehiculo'.",
          };
        }
        if (!tieneSuper) {
          return {
            valido: false,
            mensaje:
              "⚠️ El constructor de Moto debe llamar al constructor padre usando 'super(marca);'.",
          };
        }
        if (!tieneArrancar || !tieneWheelie) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes definir el método 'arrancar()' en Vehiculo y el método 'wheelie()' en Moto.",
          };
        }
      }
      return { valido: true };
    }

    case 6: {
      // Nivel 6: Abstracción
      if (lenguaje === "python") {
        const tieneFiguraAbc = /\bclass\s+Figura\s*\(\s*ABC\s*\)/i.test(code);
        const tieneAbstractMethod = /@abstractmethod/i.test(code);
        const tienePerimetro = /def\s+perimetro\s*\(\s*self\s*\)/i.test(code);
        const tieneMostrar = /def\s+mostrar\s*\(\s*self\s*\)/i.test(code);
        const tieneCuadrado = /\bclass\s+Cuadrado\s*\(\s*Figura\s*\)/i.test(code);

        if (!tieneFiguraAbc || !tieneAbstractMethod) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes crear la clase abstracta 'class Figura(ABC):' y marcar 'def perimetro(self)' con '@abstractmethod'.",
          };
        }
        if (!tieneMostrar) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Figura debe tener el método concreto 'def mostrar(self):' que imprima el perímetro.",
          };
        }
        if (!tieneCuadrado || !tienePerimetro) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes crear 'class Cuadrado(Figura):' e implementar su propio 'def perimetro(self): return self.lado * 4'.",
          };
        }
      } else {
        // Java
        const tieneAbstractClass = /abstract\s+class\s+Figura\b/i.test(code);
        const tieneAbstractMethod = /abstract\s+(?:int|double)\s+perimetro\s*\(\s*\)\s*;/i.test(code);
        const tieneMostrar = /void\s+mostrar\s*\(\s*\)/i.test(code);
        const tieneCuadrado = /\bclass\s+Cuadrado\s+extends\s+Figura\b/i.test(code);

        if (!tieneAbstractClass || !tieneAbstractMethod) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes definir 'abstract class Figura' con el método abstracto 'abstract int perimetro();'.",
          };
        }
        if (!tieneMostrar) {
          return {
            valido: false,
            mensaje:
              "⚠️ La clase Figura debe tener el método concreto 'void mostrar()' que imprima 'Perímetro: ' + perimetro().",
          };
        }
        if (!tieneCuadrado) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes definir 'class Cuadrado extends Figura' e implementar el método 'int perimetro()'.",
          };
        }
      }
      return { valido: true };
    }

    case 7: {
      // Nivel 7: Polimorfismo
      if (lenguaje === "python") {
        const tieneInstrumento = /\bclass\s+Instrumento\b/i.test(code);
        const tieneGuitarra = /\bclass\s+Guitarra\s*\(\s*Instrumento\s*\)/i.test(code);
        const tienePiano = /\bclass\s+Piano\s*\(\s*Instrumento\s*\)/i.test(code);
        const tieneTocar = /def\s+tocar\s*\(\s*self\s*\)/i.test(code);
        const tieneBucle = /\bfor\s+\w+\s+in\s+/i.test(code);

        if (!tieneInstrumento) {
          return { valido: false, mensaje: "⚠️ Debes definir la clase base 'class Instrumento:'." };
        }
        if (!tieneGuitarra || !tienePiano) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes crear 'class Guitarra(Instrumento)' y 'class Piano(Instrumento)' heredando de Instrumento.",
          };
        }
        if (!tieneTocar) {
          return {
            valido: false,
            mensaje:
              "⚠️ Cada clase debe sobreescribir el método 'def tocar(self):' con su respectivo sonido.",
          };
        }
        if (!tieneBucle) {
          return {
            valido: false,
            mensaje:
              "⚠️ Para demostrar polimorfismo, coloca los instrumentos en una lista y recórrelos con un bucle 'for inst in instrumentos:'.",
          };
        }
      } else {
        // Java
        const tieneInstrumento = /\bclass\s+Instrumento\b/i.test(code);
        const tieneGuitarra = /\bclass\s+Guitarra\s+extends\s+Instrumento\b/i.test(code);
        const tienePiano = /\bclass\s+Piano\s+extends\s+Instrumento\b/i.test(code);
        const tieneTocar = /String\s+tocar\s*\(\s*\)/i.test(code);
        const tieneBucle = /\bfor\s*\(/i.test(code);

        if (!tieneInstrumento) {
          return { valido: false, mensaje: "⚠️ Debes definir la clase base 'class Instrumento'." };
        }
        if (!tieneGuitarra || !tienePiano) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes crear 'class Guitarra extends Instrumento' y 'class Piano extends Instrumento'.",
          };
        }
        if (!tieneTocar) {
          return {
            valido: false,
            mensaje:
              "⚠️ Debes sobreescribir el método 'String tocar()' en cada subclase.",
          };
        }
        if (!tieneBucle) {
          return {
            valido: false,
            mensaje:
              "⚠️ Para demostrar polimorfismo, agrupa los objetos en un arreglo 'Instrumento[]' y recórrelos con un bucle 'for'.",
          };
        }
      }
      return { valido: true };
    }

    case 8: {
      // Nivel 8: Desafío Final POO (Integración de los 4 Pilares)
      if (lenguaje === "python") {
        const tienePublicacion = /\bclass\s+Publicacion\s*\(\s*ABC\s*\)/i.test(code);
        const tieneEncapsulamiento = /self\.__titulo\b|self\._titulo\b|get_titulo/i.test(code);
        const tieneLibro = /\bclass\s+Libro\s*\(\s*Publicacion\s*\)/i.test(code);
        const tieneRevista = /\bclass\s+Revista\s*\(\s*Publicacion\s*\)/i.test(code);
        const tieneDescribir = /def\s+describir\s*\(\s*self\s*\)/i.test(code);

        if (!tienePublicacion) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 1 - Abstracción): Debes definir la clase abstracta 'class Publicacion(ABC):' con el método abstracto 'describir()'.",
          };
        }
        if (!tieneEncapsulamiento) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 2 - Encapsulamiento): Publicacion debe guardar el título como atributo privado ('self.__titulo') y proveer 'get_titulo(self)'.",
          };
        }
        if (!tieneLibro || !tieneRevista) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 3 - Herencia): Debes crear 'class Libro(Publicacion)' y 'class Revista(Publicacion)'.",
          };
        }
        if (!tieneDescribir) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 4 - Polimorfismo): Tanto Libro como Revista deben implementar su propia versión de 'def describir(self):'.",
          };
        }
      } else {
        // Java
        const tienePublicacion = /abstract\s+class\s+Publicacion\b/i.test(code);
        const tieneEncapsulamiento = /private\s+String\s+titulo/i.test(code) && /getTitulo/i.test(code);
        const tieneLibro = /\bclass\s+Libro\s+extends\s+Publicacion\b/i.test(code);
        const tieneRevista = /\bclass\s+Revista\s+extends\s+Publicacion\b/i.test(code);
        const tieneDescribir = /void\s+describir\s*\(\s*\)/i.test(code);

        if (!tienePublicacion) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 1 - Abstracción): Debes definir 'abstract class Publicacion' con el método abstracto 'abstract void describir();'.",
          };
        }
        if (!tieneEncapsulamiento) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 2 - Encapsulamiento): Publicacion debe tener 'private String titulo;' y el getter 'public String getTitulo()'.",
          };
        }
        if (!tieneLibro || !tieneRevista) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 3 - Herencia): Debes crear 'class Libro extends Publicacion' y 'class Revista extends Publicacion'.",
          };
        }
        if (!tieneDescribir) {
          return {
            valido: false,
            mensaje:
              "⚠️ (Pilar 4 - Polimorfismo): Tanto Libro como Revista deben implementar su propia versión de 'void describir()'.",
          };
        }
      }
      return { valido: true };
    }

    default:
      return { valido: true };
  }
}
