// Módulo de datos para los 8 mini-niveles de OOP
// IMPORTANTE: Los ejemplos Java usan `this.campo` explícitamente para ser compatibles
// con el transpilador local Java→JS que ejecuta el código en el navegador.

export type LenguajeOOP = "python" | "java";

export type MiniNivel = {
  id: number;
  titulo: string;
  concepto: string;
  descripcionCorta: string;
  puntaje: number;
  emoji: string;
  color: string;
  docs: {
    intro: string;
    concepto: string;
    ejemploPython: string;
    ejemploJava: string;
    tip: string;
  };
  practica: {
    enunciado: string;
    salidaEsperada: string;
  };
  codigoBasePython: string;
  codigoBaseJava: string;
  solucionPython: string;
  solucionJava: string;
};

export const OOP_NIVELES: MiniNivel[] = [
  {
    id: 1,
    titulo: "Variables y Tipos",
    concepto: "Fundamentos",
    descripcionCorta: "Los bloques básicos de cualquier programa",
    puntaje: 10,
    emoji: "🧱",
    color: "cyan",
    docs: {
      intro:
        "Antes de construir clases y objetos, necesitas entender las variables. Una variable es como una caja con nombre donde guardas información.",
      concepto:
        "**Tipos básicos** que usarás en POO:\n- **Texto (String)**: palabras, nombres → `\"AlgoLab\"`\n- **Entero (int)**: números enteros → `42`\n- **Decimal (float/double)**: números con punto → `3.14`\n- **Booleano (bool)**: verdadero o falso → `True / False`",
      ejemploPython: `# En Python no declaras el tipo, es automático
nombre = "Luna"        # str
edad = 3               # int
peso = 4.5             # float
es_mascota = True      # bool

print(f"{nombre} tiene {edad} años y pesa {peso} kg")`,
      ejemploJava: `public class Main {
    public static void main(String[] args) {
        String nombre = "Luna";
        int edad = 3;
        double peso = 4.5;
        boolean esMascota = true;

        System.out.println(nombre + " tiene " + edad + " años y pesa " + peso + " kg");
    }
}`,
      tip: "💡 En Python las variables son flexibles (tipado dinámico). En Java debes decir qué tipo es cada variable desde el inicio (tipado estático).",
    },
    practica: {
      enunciado:
        "Crea tres variables: `nombre` con tu nombre, `edad` con tu edad, y `lenguaje` con el lenguaje que estás aprendiendo. Luego imprime:\n\n`Hola, soy Ana, tengo 20 años y aprendo Python`\n\n*(reemplaza los valores con los tuyos)*",
      salidaEsperada: "Hola, soy Ana, tengo 20 años y aprendo Python",
    },
    codigoBasePython: `# Nivel 1: Variables y Tipos
nombre = "Ana"
edad = 20
lenguaje = "Python"

print(f"Hola, soy {nombre}, tengo {edad} años y aprendo {lenguaje}")
`,
    codigoBaseJava: `public class Main {
    public static void main(String[] args) {
        String nombre = "Ana";
        int edad = 20;
        String lenguaje = "Java";

        System.out.println("Hola, soy " + nombre + ", tengo " + edad + " años y aprendo " + lenguaje);
    }
}
`,
    solucionPython: `nombre = "Ana"
edad = 20
lenguaje = "Python"

print(f"Hola, soy {nombre}, tengo {edad} años y aprendo {lenguaje}")
`,
    solucionJava: `public class Main {
    public static void main(String[] args) {
        String nombre = "Ana";
        int edad = 20;
        String lenguaje = "Java";

        System.out.println("Hola, soy " + nombre + ", tengo " + edad + " años y aprendo " + lenguaje);
    }
}
`,
  },
  {
    id: 2,
    titulo: "Funciones y Métodos",
    concepto: "Reutilización",
    descripcionCorta: "Bloques de código que puedes llamar cuando quieras",
    puntaje: 15,
    emoji: "⚙️",
    color: "amber",
    docs: {
      intro:
        "Una función es como un botón mágico: le pones un nombre, defines qué hace, y cada vez que lo necesitas, ¡solo llamas a ese nombre!",
      concepto:
        "**¿Por qué usar funciones?**\n- **Evitar repetición**: escribes el código una vez y lo reutilizas\n- **Organización**: divides problemas grandes en pequeños\n- **Parámetros**: les pasas información para que trabajen con ella\n- **Retorno**: pueden devolverte un resultado",
      ejemploPython: `# Función sin parámetros
def saludar():
    print("¡Hola AlgoLab!")

# Función con parámetros y retorno
def sumar(a, b):
    return a + b

saludar()              # ¡Hola AlgoLab!
resultado = sumar(3, 5)
print(resultado)       # 8`,
      ejemploJava: `public class Main {
    static void saludar() {
        System.out.println("¡Hola AlgoLab!");
    }

    static int sumar(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        saludar();
        int resultado = sumar(3, 5);
        System.out.println(resultado);
    }
}`,
      tip: "💡 En Python usas `def` para definir funciones. En Java declaras el tipo de retorno (o `void` si no devuelve nada).",
    },
    practica: {
      enunciado:
        "Crea una función `calcular_area` que reciba `ancho` y `alto` y retorne el área. Prueba con ancho=6 y alto=4.\n\nSalida esperada:\n`El área del rectángulo es: 24`",
      salidaEsperada: "El área del rectángulo es: 24",
    },
    codigoBasePython: `# Nivel 2: Funciones
def calcular_area(ancho, alto):
    return ancho * alto

area = calcular_area(6, 4)
print(f"El área del rectángulo es: {area}")
`,
    codigoBaseJava: `public class Main {
    static int calcularArea(int ancho, int alto) {
        return ancho * alto;
    }

    public static void main(String[] args) {
        int area = calcularArea(6, 4);
        System.out.println("El área del rectángulo es: " + area);
    }
}
`,
    solucionPython: `def calcular_area(ancho, alto):
    return ancho * alto

area = calcular_area(6, 4)
print(f"El área del rectángulo es: {area}")
`,
    solucionJava: `public class Main {
    static int calcularArea(int ancho, int alto) {
        return ancho * alto;
    }

    public static void main(String[] args) {
        int area = calcularArea(6, 4);
        System.out.println("El área del rectángulo es: " + area);
    }
}
`,
  },
  {
    id: 3,
    titulo: "Clases y Objetos",
    concepto: "1er Pilar: Identidad",
    descripcionCorta: "Crea tus propios tipos de datos con moldes",
    puntaje: 20,
    emoji: "🏗️",
    color: "emerald",
    docs: {
      intro:
        "Una **Clase** es como el plano de un edificio. Un **Objeto** es el edificio ya construido. Puedes construir muchos edificios con el mismo plano.",
      concepto:
        "**Clase** = molde / plantilla\n**Objeto** = instancia del molde\n\nCada objeto tiene:\n- **Atributos**: características (el color, el nombre, la edad)\n- **Métodos**: acciones que puede hacer (hablar, correr, calcular)\n- **`this`**: dentro de un método, `this` se refiere al objeto actual",
      ejemploPython: `class Perro:
    def __init__(self, nombre, raza):
        self.nombre = nombre  # atributo
        self.raza = raza      # atributo

    def ladrar(self):         # método
        print(f"¡Guau! Soy {self.nombre}")

rex = Perro("Rex", "Pastor")
luna = Perro("Luna", "Labrador")
rex.ladrar()   # ¡Guau! Soy Rex
luna.ladrar()  # ¡Guau! Soy Luna`,
      ejemploJava: `class Perro {
    String nombre;
    String raza;

    Perro(String nombre, String raza) {
        this.nombre = nombre;  // this = este objeto
        this.raza = raza;
    }

    void ladrar() {
        System.out.println("¡Guau! Soy " + this.nombre);
    }
}

public class Main {
    public static void main(String[] args) {
        Perro rex = new Perro("Rex", "Pastor");
        Perro luna = new Perro("Luna", "Labrador");
        rex.ladrar();
        luna.ladrar();
    }
}`,
      tip: "💡 En Java usa siempre `this.campo` dentro de los métodos para referirte a los atributos del objeto. En Python usas `self.campo`.",
    },
    practica: {
      enunciado:
        "Crea una clase `Gato` con atributos `nombre` y `color`. Agrega un método `presentarse()` que imprima:\n\n`Soy Michi, un gato de color naranja`\n\nCrea un objeto con nombre `Michi` y color `naranja`.",
      salidaEsperada: "Soy Michi, un gato de color naranja",
    },
    codigoBasePython: `# Nivel 3: Clases y Objetos
class Gato:
    def __init__(self, nombre, color):
        self.nombre = nombre
        self.color = color

    def presentarse(self):
        print(f"Soy {self.nombre}, un gato de color {self.color}")

michi = Gato("Michi", "naranja")
michi.presentarse()
`,
    codigoBaseJava: `class Gato {
    String nombre;
    String color;

    Gato(String nombre, String color) {
        this.nombre = nombre;
        this.color = color;
    }

    void presentarse() {
        // Usa this.nombre y this.color
        System.out.println("Soy " + this.nombre + ", un gato de color " + this.color);
    }
}

public class Main {
    public static void main(String[] args) {
        Gato michi = new Gato("Michi", "naranja");
        michi.presentarse();
    }
}
`,
    solucionPython: `class Gato:
    def __init__(self, nombre, color):
        self.nombre = nombre
        self.color = color

    def presentarse(self):
        print(f"Soy {self.nombre}, un gato de color {self.color}")

michi = Gato("Michi", "naranja")
michi.presentarse()
`,
    solucionJava: `class Gato {
    String nombre;
    String color;

    Gato(String nombre, String color) {
        this.nombre = nombre;
        this.color = color;
    }

    void presentarse() {
        System.out.println("Soy " + this.nombre + ", un gato de color " + this.color);
    }
}

public class Main {
    public static void main(String[] args) {
        Gato michi = new Gato("Michi", "naranja");
        michi.presentarse();
    }
}
`,
  },
  {
    id: 4,
    titulo: "Encapsulamiento",
    concepto: "2do Pilar: Protección",
    descripcionCorta: "Controla el acceso a los datos de tu objeto",
    puntaje: 25,
    emoji: "🔐",
    color: "violet",
    docs: {
      intro:
        "El encapsulamiento es como tener una caja fuerte: guardas datos importantes dentro del objeto y controlas exactamente quién puede verlos o cambiarlos.",
      concepto:
        "**¿Para qué sirve?**\n- Protege datos de modificaciones accidentales\n- Da control sobre cómo se leen o cambian los valores\n- Oculta detalles internos innecesarios\n\n**Getters**: métodos para *leer* un atributo privado\n**Setters**: métodos para *modificar* con validación",
      ejemploPython: `class CuentaBancaria:
    def __init__(self, saldo):
        self.__saldo = saldo  # privado con __

    def get_saldo(self):
        return self.__saldo

    def depositar(self, monto):
        if monto > 0:
            self.__saldo += monto

cuenta = CuentaBancaria(100)
cuenta.depositar(50)
print(cuenta.get_saldo())  # 150`,
      ejemploJava: `class CuentaBancaria {
    private double saldo;

    CuentaBancaria(double saldo) {
        this.saldo = saldo;
    }

    public double getSaldo() {
        return this.saldo;
    }

    public void depositar(double monto) {
        if (monto > 0) this.saldo += monto;
    }
}

public class Main {
    public static void main(String[] args) {
        CuentaBancaria cuenta = new CuentaBancaria(100);
        cuenta.depositar(50);
        System.out.println(cuenta.getSaldo());
    }
}`,
      tip: "💡 En Python usas `__nombre` (doble guion bajo) para hacer privado. En Java usas la palabra clave `private`. Accede siempre con `this.campo` en los métodos.",
    },
    practica: {
      enunciado:
        "Crea `Estudiante` con atributo privado `nota`. Getter `get_nota()` y setter `set_nota(valor)` que valide entre 0 y 100. Si no es válida imprime `Nota inválida`. Prueba:\n```\nest = Estudiante(75)\nest.set_nota(110)  → Nota inválida\nest.set_nota(90)\nprint(est.get_nota())  → 90\n```\nSalida esperada:\n`Nota inválida\n90`",
      salidaEsperada: "Nota inválida\n90",
    },
    codigoBasePython: `# Nivel 4: Encapsulamiento
class Estudiante:
    def __init__(self, nota):
        self.__nota = nota

    def get_nota(self):
        return self.__nota

    def set_nota(self, valor):
        if 0 <= valor <= 100:
            self.__nota = valor
        else:
            print("Nota inválida")

est = Estudiante(75)
est.set_nota(110)
est.set_nota(90)
print(est.get_nota())
`,
    codigoBaseJava: `class Estudiante {
    private int nota;

    Estudiante(int nota) {
        this.nota = nota;
    }

    public int getNota() {
        return this.nota;
    }

    public void setNota(int valor) {
        if (valor >= 0 && valor <= 100) {
            this.nota = valor;
        } else {
            System.out.println("Nota inválida");
        }
    }
}

public class Main {
    public static void main(String[] args) {
        Estudiante est = new Estudiante(75);
        est.setNota(110);
        est.setNota(90);
        System.out.println(est.getNota());
    }
}
`,
    solucionPython: `class Estudiante:
    def __init__(self, nota):
        self.__nota = nota

    def get_nota(self):
        return self.__nota

    def set_nota(self, valor):
        if 0 <= valor <= 100:
            self.__nota = valor
        else:
            print("Nota inválida")

est = Estudiante(75)
est.set_nota(110)
est.set_nota(90)
print(est.get_nota())
`,
    solucionJava: `class Estudiante {
    private int nota;

    Estudiante(int nota) {
        this.nota = nota;
    }

    public int getNota() {
        return this.nota;
    }

    public void setNota(int valor) {
        if (valor >= 0 && valor <= 100) {
            this.nota = valor;
        } else {
            System.out.println("Nota inválida");
        }
    }
}

public class Main {
    public static void main(String[] args) {
        Estudiante est = new Estudiante(75);
        est.setNota(110);
        est.setNota(90);
        System.out.println(est.getNota());
    }
}
`,
  },
  {
    id: 5,
    titulo: "Herencia",
    concepto: "3er Pilar: Reutilización",
    descripcionCorta: "Crea nuevas clases basándose en otras existentes",
    puntaje: 30,
    emoji: "🌳",
    color: "sky",
    docs: {
      intro:
        "La herencia es como la biología: los hijos heredan características de sus padres. En POO una clase hija hereda atributos y métodos de la clase padre.",
      concepto:
        "**Clase padre (base)**: tiene lo común\n**Clase hija (derivada)**: hereda lo del padre y agrega lo suyo\n\n**`super()`**: llama al constructor del padre. En Java y JavaScript siempre debes llamarlo primero en el constructor de la clase hija.",
      ejemploPython: `class Animal:
    def __init__(self, nombre):
        self.nombre = nombre

    def respirar(self):
        print(f"{self.nombre} respira")

class Perro(Animal):  # Hereda de Animal
    def ladrar(self):
        print(f"{self.nombre} dice: ¡Guau!")

rex = Perro("Rex")
rex.respirar()  # heredado
rex.ladrar()    # propio`,
      ejemploJava: `class Animal {
    String nombre;

    Animal(String nombre) {
        this.nombre = nombre;
    }

    void respirar() {
        System.out.println(this.nombre + " respira");
    }
}

class Perro extends Animal {
    Perro(String nombre) {
        super(nombre);  // SIEMPRE primero
    }

    void ladrar() {
        System.out.println(this.nombre + " dice: ¡Guau!");
    }
}

public class Main {
    public static void main(String[] args) {
        Perro rex = new Perro("Rex");
        rex.respirar();
        rex.ladrar();
    }
}`,
      tip: "💡 En Python heredas con paréntesis: `class Perro(Animal)`. En Java usas `extends`. El `super()` SIEMPRE va primero en el constructor hijo.",
    },
    practica: {
      enunciado:
        "Crea `Vehiculo` con `marca` y método `arrancar()` que imprima `{marca} arrancando...`. Crea `Moto` que herede y agregue `wheelie()` que imprima `{marca} hace un caballito! 🏍️`.\n\nSalida esperada:\n`Yamaha arrancando...\nYamaha hace un caballito! 🏍️`",
      salidaEsperada: "Yamaha arrancando...\nYamaha hace un caballito! 🏍️",
    },
    codigoBasePython: `# Nivel 5: Herencia
class Vehiculo:
    def __init__(self, marca):
        self.marca = marca

    def arrancar(self):
        print(f"{self.marca} arrancando...")

class Moto(Vehiculo):
    def wheelie(self):
        print(f"{self.marca} hace un caballito! 🏍️")

moto = Moto("Yamaha")
moto.arrancar()
moto.wheelie()
`,
    codigoBaseJava: `class Vehiculo {
    String marca;

    Vehiculo(String marca) {
        this.marca = marca;
    }

    void arrancar() {
        System.out.println(this.marca + " arrancando...");
    }
}

class Moto extends Vehiculo {
    Moto(String marca) {
        super(marca);  // Llama al constructor padre PRIMERO
    }

    void wheelie() {
        System.out.println(this.marca + " hace un caballito! 🏍️");
    }
}

public class Main {
    public static void main(String[] args) {
        Moto moto = new Moto("Yamaha");
        moto.arrancar();
        moto.wheelie();
    }
}
`,
    solucionPython: `class Vehiculo:
    def __init__(self, marca):
        self.marca = marca

    def arrancar(self):
        print(f"{self.marca} arrancando...")

class Moto(Vehiculo):
    def wheelie(self):
        print(f"{self.marca} hace un caballito! 🏍️")

moto = Moto("Yamaha")
moto.arrancar()
moto.wheelie()
`,
    solucionJava: `class Vehiculo {
    String marca;

    Vehiculo(String marca) {
        this.marca = marca;
    }

    void arrancar() {
        System.out.println(this.marca + " arrancando...");
    }
}

class Moto extends Vehiculo {
    Moto(String marca) {
        super(marca);
    }

    void wheelie() {
        System.out.println(this.marca + " hace un caballito! 🏍️");
    }
}

public class Main {
    public static void main(String[] args) {
        Moto moto = new Moto("Yamaha");
        moto.arrancar();
        moto.wheelie();
    }
}
`,
  },
  {
    id: 6,
    titulo: "Abstracción",
    concepto: "Simplificación",
    descripcionCorta: "Muestra solo lo esencial, oculta lo complejo",
    puntaje: 25,
    emoji: "🎭",
    color: "rose",
    docs: {
      intro:
        "La abstracción es como usar un control remoto: sabes que el botón sube el volumen, pero no necesitas saber cómo funciona el circuito interno.",
      concepto:
        "**Abstracción en POO:**\n- Define *qué* hace un objeto, no *cómo* lo hace\n- Se implementa con **clases abstractas**\n- Las clases hijas implementan los detalles\n- Una clase abstracta **no puede** instanciarse directamente\n- `super()` es necesario en los constructores hijos",
      ejemploPython: `from abc import ABC, abstractmethod

class Forma(ABC):
    @abstractmethod
    def area(self):
        pass

    def describir(self):
        print(f"Mi área es: {self.area()}")

class Circulo(Forma):
    def __init__(self, radio):
        self.radio = radio

    def area(self):
        return 3.14 * self.radio ** 2

c = Circulo(5)
c.describir()  # Mi área es: 78.5`,
      ejemploJava: `abstract class Forma {
    abstract double area();

    void describir() {
        System.out.println("Mi área es: " + this.area());
    }
}

class Circulo extends Forma {
    double radio;

    Circulo(double radio) {
        super();         // Llama al padre primero
        this.radio = radio;
    }

    double area() {
        return 3.14 * this.radio * this.radio;
    }
}

public class Main {
    public static void main(String[] args) {
        Circulo c = new Circulo(5);
        c.describir();
    }
}`,
      tip: "💡 En Python importas `ABC` y `abstractmethod`. En Java usas `abstract` antes de la clase y el método. Siempre llama `super()` en el constructor hijo.",
    },
    practica: {
      enunciado:
        "Crea clase abstracta `Figura` con método abstracto `perimetro()` y método concreto `mostrar()` que imprima `Perímetro: {valor}`. Crea `Cuadrado` con `lado` que implemente `perimetro()` como `lado * 4`.\n\nSalida esperada:\n`Perímetro: 20`",
      salidaEsperada: "Perímetro: 20",
    },
    codigoBasePython: `from abc import ABC, abstractmethod

class Figura(ABC):
    @abstractmethod
    def perimetro(self):
        pass

    def mostrar(self):
        print(f"Perímetro: {self.perimetro()}")

class Cuadrado(Figura):
    def __init__(self, lado):
        self.lado = lado

    def perimetro(self):
        return self.lado * 4

cuadrado = Cuadrado(5)
cuadrado.mostrar()
`,
    codigoBaseJava: `abstract class Figura {
    abstract int perimetro();

    void mostrar() {
        System.out.println("Perímetro: " + this.perimetro());
    }
}

class Cuadrado extends Figura {
    int lado;

    Cuadrado(int lado) {
        super();          // Requerido al extender
        this.lado = lado;
    }

    int perimetro() {
        return this.lado * 4;
    }
}

public class Main {
    public static void main(String[] args) {
        Cuadrado cuadrado = new Cuadrado(5);
        cuadrado.mostrar();
    }
}
`,
    solucionPython: `from abc import ABC, abstractmethod

class Figura(ABC):
    @abstractmethod
    def perimetro(self):
        pass

    def mostrar(self):
        print(f"Perímetro: {self.perimetro()}")

class Cuadrado(Figura):
    def __init__(self, lado):
        self.lado = lado

    def perimetro(self):
        return self.lado * 4

cuadrado = Cuadrado(5)
cuadrado.mostrar()
`,
    solucionJava: `abstract class Figura {
    abstract int perimetro();

    void mostrar() {
        System.out.println("Perímetro: " + this.perimetro());
    }
}

class Cuadrado extends Figura {
    int lado;

    Cuadrado(int lado) {
        super();
        this.lado = lado;
    }

    int perimetro() {
        return this.lado * 4;
    }
}

public class Main {
    public static void main(String[] args) {
        Cuadrado cuadrado = new Cuadrado(5);
        cuadrado.mostrar();
    }
}
`,
  },
  {
    id: 7,
    titulo: "Polimorfismo",
    concepto: "4to Pilar: Muchas Formas",
    descripcionCorta: "Un mismo mensaje, muchas respuestas distintas",
    puntaje: 30,
    emoji: "🔮",
    color: "purple",
    docs: {
      intro:
        'Poli = muchos, morfismo = formas. El polimorfismo permite que objetos de diferentes clases respondan al mismo mensaje de formas distintas.',
      concepto:
        "**Override (Sobreescritura)**: la clase hija redefine un método del padre\n- Una misma llamada, diferente comportamiento según el objeto\n- Permite escribir código más flexible y genérico\n- En Java se marca con `@Override` (es opcional pero recomendado)",
      ejemploPython: `class Animal:
    def __init__(self, nombre):
        self.nombre = nombre

    def sonido(self):
        return "..."

class Perro(Animal):
    def sonido(self):
        return "¡Guau!"

class Gato(Animal):
    def sonido(self):
        return "¡Miau!"

animales = [Perro("Rex"), Gato("Luna")]
for animal in animales:
    print(f"{animal.nombre}: {animal.sonido()}")`,
      ejemploJava: `class Animal {
    String nombre;
    Animal(String nombre) { this.nombre = nombre; }
    String sonido() { return "..."; }
}

class Perro extends Animal {
    Perro(String nombre) { super(nombre); }

    String sonido() { return "¡Guau!"; }
}

class Gato extends Animal {
    Gato(String nombre) { super(nombre); }

    String sonido() { return "¡Miau!"; }
}

public class Main {
    public static void main(String[] args) {
        Animal[] animales = { new Perro("Rex"), new Gato("Luna") };
        for (Animal a : animales) {
            System.out.println(a.nombre + ": " + a.sonido());
        }
    }
}`,
      tip: "💡 El polimorfismo te permite tratar objetos de distintas clases de forma uniforme. `a.sonido()` llama al método correcto según el tipo real del objeto.",
    },
    practica: {
      enunciado:
        "Crea clase base `Instrumento` con método `tocar()` que retorne `'...'`. Crea `Guitarra` y `Piano` que lo sobreescriban. Crea un arreglo e imprime cada sonido.\n\nSalida esperada:\n`Guitarra: ¡Tachán!\nPiano: ¡Plonk!`",
      salidaEsperada: "Guitarra: ¡Tachán!\nPiano: ¡Plonk!",
    },
    codigoBasePython: `# Nivel 7: Polimorfismo
class Instrumento:
    def __init__(self, nombre):
        self.nombre = nombre

    def tocar(self):
        return "..."

class Guitarra(Instrumento):
    def tocar(self):
        return "¡Tachán!"

class Piano(Instrumento):
    def tocar(self):
        return "¡Plonk!"

instrumentos = [Guitarra("Guitarra"), Piano("Piano")]
for inst in instrumentos:
    print(f"{inst.nombre}: {inst.tocar()}")
`,
    codigoBaseJava: `class Instrumento {
    String nombre;
    Instrumento(String nombre) { this.nombre = nombre; }
    String tocar() { return "..."; }
}

class Guitarra extends Instrumento {
    Guitarra(String nombre) { super(nombre); }
    String tocar() { return "¡Tachán!"; }
}

class Piano extends Instrumento {
    Piano(String nombre) { super(nombre); }
    String tocar() { return "¡Plonk!"; }
}

public class Main {
    public static void main(String[] args) {
        Instrumento[] instrumentos = { new Guitarra("Guitarra"), new Piano("Piano") };
        for (Instrumento inst : instrumentos) {
            System.out.println(inst.nombre + ": " + inst.tocar());
        }
    }
}
`,
    solucionPython: `class Instrumento:
    def __init__(self, nombre):
        self.nombre = nombre

    def tocar(self):
        return "..."

class Guitarra(Instrumento):
    def tocar(self):
        return "¡Tachán!"

class Piano(Instrumento):
    def tocar(self):
        return "¡Plonk!"

instrumentos = [Guitarra("Guitarra"), Piano("Piano")]
for inst in instrumentos:
    print(f"{inst.nombre}: {inst.tocar()}")
`,
    solucionJava: `class Instrumento {
    String nombre;
    Instrumento(String nombre) { this.nombre = nombre; }
    String tocar() { return "..."; }
}

class Guitarra extends Instrumento {
    Guitarra(String nombre) { super(nombre); }
    String tocar() { return "¡Tachán!"; }
}

class Piano extends Instrumento {
    Piano(String nombre) { super(nombre); }
    String tocar() { return "¡Plonk!"; }
}

public class Main {
    public static void main(String[] args) {
        Instrumento[] instrumentos = { new Guitarra("Guitarra"), new Piano("Piano") };
        for (Instrumento inst : instrumentos) {
            System.out.println(inst.nombre + ": " + inst.tocar());
        }
    }
}
`,
  },
  {
    id: 8,
    titulo: "Desafío Final OOP",
    concepto: "Los 4 Pilares Unidos",
    descripcionCorta: "Aplica todo lo aprendido en un sistema completo",
    puntaje: 50,
    emoji: "🏆",
    color: "yellow",
    docs: {
      intro:
        "¡Llegaste al nivel final! Aquí combinarás los 4 pilares: **Encapsulamiento**, **Abstracción**, **Herencia** y **Polimorfismo** en un mini sistema de biblioteca.",
      concepto:
        "**Los 4 pilares en acción:**\n- 🔐 **Encapsulamiento**: dato privado `titulo` con getter\n- 🎭 **Abstracción**: clase abstracta `Publicacion` con `describir()` abstracto\n- 🌳 **Herencia**: `Libro` y `Revista` extienden `Publicacion`\n- 🔮 **Polimorfismo**: cada uno implementa `describir()` diferente",
      ejemploPython: `from abc import ABC, abstractmethod

class Publicacion(ABC):
    def __init__(self, titulo):
        self.__titulo = titulo  # privado

    def get_titulo(self):
        return self.__titulo

    @abstractmethod
    def describir(self):
        pass

class Libro(Publicacion):
    def __init__(self, titulo, autor):
        super().__init__(titulo)
        self.autor = autor

    def describir(self):
        print(f"📚 Libro: {self.get_titulo()} por {self.autor}")`,
      ejemploJava: `abstract class Publicacion {
    private String titulo;

    Publicacion(String titulo) {
        this.titulo = titulo;
    }

    public String getTitulo() {
        return this.titulo;
    }

    abstract void describir();
}

class Libro extends Publicacion {
    String autor;

    Libro(String titulo, String autor) {
        super(titulo);
        this.autor = autor;
    }

    void describir() {
        System.out.println("📚 Libro: " + this.getTitulo() + " por " + this.autor);
    }
}`,
      tip: "🏆 Este desafío vale 50 puntos. Usa `this.getTitulo()` para acceder al título privado desde las clases hijas.",
    },
    practica: {
      enunciado:
        "Crea el sistema completo:\n1. Clase abstracta `Publicacion`: titulo privado + getter + `describir()` abstracto\n2. Clase `Libro`: hereda, añade `autor`, `describir()` imprime: `📚 Libro: {titulo} por {autor}`\n3. Clase `Revista`: hereda, añade `edicion`, `describir()` imprime: `📰 Revista: {titulo} - Edición {edicion}`\n\nSalida esperada:\n`📚 Libro: El Principito por Saint-Exupéry\n📰 Revista: Tech Monthly - Edición 42`",
      salidaEsperada: "📚 Libro: El Principito por Saint-Exupéry\n📰 Revista: Tech Monthly - Edición 42",
    },
    codigoBasePython: `from abc import ABC, abstractmethod

class Publicacion(ABC):
    def __init__(self, titulo):
        self.__titulo = titulo

    def get_titulo(self):
        return self.__titulo

    @abstractmethod
    def describir(self):
        pass

class Libro(Publicacion):
    def __init__(self, titulo, autor):
        super().__init__(titulo)
        self.autor = autor

    def describir(self):
        print(f"📚 Libro: {self.get_titulo()} por {self.autor}")

class Revista(Publicacion):
    def __init__(self, titulo, edicion):
        super().__init__(titulo)
        self.edicion = edicion

    def describir(self):
        print(f"📰 Revista: {self.get_titulo()} - Edición {self.edicion}")

libro = Libro("El Principito", "Saint-Exupéry")
revista = Revista("Tech Monthly", 42)
libro.describir()
revista.describir()
`,
    codigoBaseJava: `abstract class Publicacion {
    private String titulo;

    Publicacion(String titulo) {
        this.titulo = titulo;
    }

    public String getTitulo() {
        return this.titulo;
    }

    abstract void describir();
}

class Libro extends Publicacion {
    String autor;

    Libro(String titulo, String autor) {
        super(titulo);
        this.autor = autor;
    }

    void describir() {
        // Usa this.getTitulo() para el titulo y this.autor
        System.out.println("📚 Libro: " + this.getTitulo() + " por " + this.autor);
    }
}

class Revista extends Publicacion {
    int edicion;

    Revista(String titulo, int edicion) {
        super(titulo);
        this.edicion = edicion;
    }

    void describir() {
        // Usa this.getTitulo() para el titulo y this.edicion
        System.out.println("📰 Revista: " + this.getTitulo() + " - Edición " + this.edicion);
    }
}

public class Main {
    public static void main(String[] args) {
        Libro libro = new Libro("El Principito", "Saint-Exupéry");
        Revista revista = new Revista("Tech Monthly", 42);
        libro.describir();
        revista.describir();
    }
}
`,
    solucionPython: `from abc import ABC, abstractmethod

class Publicacion(ABC):
    def __init__(self, titulo):
        self.__titulo = titulo

    def get_titulo(self):
        return self.__titulo

    @abstractmethod
    def describir(self):
        pass

class Libro(Publicacion):
    def __init__(self, titulo, autor):
        super().__init__(titulo)
        self.autor = autor

    def describir(self):
        print(f"📚 Libro: {self.get_titulo()} por {self.autor}")

class Revista(Publicacion):
    def __init__(self, titulo, edicion):
        super().__init__(titulo)
        self.edicion = edicion

    def describir(self):
        print(f"📰 Revista: {self.get_titulo()} - Edición {self.edicion}")

libro = Libro("El Principito", "Saint-Exupéry")
revista = Revista("Tech Monthly", 42)
libro.describir()
revista.describir()
`,
    solucionJava: `abstract class Publicacion {
    private String titulo;

    Publicacion(String titulo) {
        this.titulo = titulo;
    }

    public String getTitulo() {
        return this.titulo;
    }

    abstract void describir();
}

class Libro extends Publicacion {
    String autor;

    Libro(String titulo, String autor) {
        super(titulo);
        this.autor = autor;
    }

    void describir() {
        System.out.println("📚 Libro: " + this.getTitulo() + " por " + this.autor);
    }
}

class Revista extends Publicacion {
    int edicion;

    Revista(String titulo, int edicion) {
        super(titulo);
        this.edicion = edicion;
    }

    void describir() {
        System.out.println("📰 Revista: " + this.getTitulo() + " - Edición " + this.edicion);
    }
}

public class Main {
    public static void main(String[] args) {
        Libro libro = new Libro("El Principito", "Saint-Exupéry");
        Revista revista = new Revista("Tech Monthly", 42);
        libro.describir();
        revista.describir();
    }
}
`,
  },
];
