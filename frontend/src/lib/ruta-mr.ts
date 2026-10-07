/**
 * Ruta principal de realidad mixta (GDD AlgoLab, sección 3.3).
 * Cuatro niveles confirmados que terminan en Abstracción. Los niveles 5 y 6
 * siguen en diseño y no forman parte de la ruta visible ni de su progreso.
 * El módulo complementario "Programar POO" tiene su propia lista en oop-niveles.
 */
export const TOTAL_NIVELES_MR = 4;
export const PUNTAJE_MAXIMO_NIVEL = 100;
export function puntajeMaximoNivel(nivel: number): number {
  return ({ 1: 120, 2: 240, 3: 100, 4: 255 } as Record<number, number>)[nivel] ?? PUNTAJE_MAXIMO_NIVEL;
}

export type ObjetoNivel = "puerta" | "vehiculo" | "robot" | "biblioteca";

export type NivelRuta = {
  nivel: number;
  concepto: string;
  objeto: ObjetoNivel;
  nombreObjeto: string;
  pregunta: string;
  accion: string;
  resumen: string;
  enGafas: string;
};

export const RUTA_MR: readonly NivelRuta[] = [
  {
    nivel: 1,
    concepto: "Clases y objetos",
    objeto: "puerta",
    nombreObjeto: "Puerta",
    pregunta: "¿Qué diferencia hay entre el plano y la puerta real?",
    accion: "Abrir, cerrar y cambiar sus propiedades",
    resumen: "Una misma plantilla produce puertas distintas; cada una conserva su propio estado.",
    enGafas: "Una puerta aparece en tu habitación. Cambias su color y material y la abres o la cierras.",
  },
  {
    nivel: 2,
    concepto: "Construcción de objetos",
    objeto: "vehiculo",
    nombreObjeto: "Vehículo",
    pregunta: "¿Cómo nace un objeto con las características correctas?",
    accion: "Elegir piezas y construir",
    resumen: "Las elecciones iniciales definen cada vehículo desde el momento en que se crea.",
    enGafas: "En un garaje virtual eliges carrocería, ruedas y color antes de ensamblar cada vehículo.",
  },
  {
    nivel: 3,
    concepto: "Encapsulamiento",
    objeto: "robot",
    nombreObjeto: "Robot",
    pregunta: "¿Por qué no se cambia el interior de un objeto directamente?",
    accion: "Cargar, enfriar y apagar",
    resumen: "El estado interno cambia solo mediante acciones permitidas que respetan sus límites.",
    enGafas: "Reparas el robot del taller usando sus controles en lugar de abrirlo y mover sus piezas.",
  },
  {
    nivel: 4,
    concepto: "Abstracción",
    objeto: "biblioteca",
    nombreObjeto: "Libros y vinilos",
    pregunta: "¿Qué información necesitas según lo que vas a hacer?",
    accion: "Escuchar, comprar o clasificar",
    resumen: "El objeto conserva todas sus propiedades; tú eliges las que importan para cada propósito.",
    enGafas: "Clasificas libros y vinilos entre una biblioteca y una tienda atendiendo solo a lo esencial.",
  },
];

export function nivelRuta(nivel: number): NivelRuta {
  return RUTA_MR[Math.min(Math.max(Math.round(nivel), 1), TOTAL_NIVELES_MR) - 1];
}

export function esNivelDeRuta(nivel: number | null | undefined): nivel is number {
  return typeof nivel === "number" && nivel >= 1 && nivel <= TOTAL_NIVELES_MR;
}

/** El backend puede reportar un nivel siguiente (5) al completar la ruta. */
export function nivelActualEnRuta(nivelActual: number | null | undefined): number {
  return Math.min(Math.max(nivelActual ?? 1, 1), TOTAL_NIVELES_MR);
}
