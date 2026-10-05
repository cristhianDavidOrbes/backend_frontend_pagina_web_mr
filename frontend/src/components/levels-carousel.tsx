"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  CarFront,
  ShieldCheck,
  Disc3,
  GitFork,
  Shuffle,
  Gamepad2,
  type LucideIcon,
} from "lucide-react";
import styles from "./levels-carousel.module.css";

export type NivelData = {
  numero: string;
  id: number;
  titulo: string;
  concepto: string;
  objeto: string;
  texto: string;
  detalles: string;
  misionVR: string;
  image?: string;
  icon: LucideIcon;
  color: "cyan" | "orange" | "emerald" | "blue" | "violet" | "rose";
  accentHex: string;
  bgGradient: string;
};

export const NIVELES: NivelData[] = [
  {
    numero: "01",
    id: 1,
    titulo: "Clases y Objetos",
    concepto: "Instanciación y Estado",
    objeto: "Puerta interactiva en tu espacio",
    texto: "Mira cómo color, modelo y estado se vuelven atributos; abrir y cerrar se convierten en acciones físicas.",
    detalles: "Aprende la diferencia entre el plano (clase) y la entidad viva en memoria (objeto). Manipula propiedades con tus manos en realidad mixta.",
    misionVR: "Acércate a la puerta, cambia sus propiedades de color y material, y observa cómo se actualiza la instancia en el diagrama vivo.",
    icon: DoorOpen,
    color: "cyan",
    accentHex: "#0db8eb",
    bgGradient: "from-cyan-500/20 via-slate-900/80 to-slate-950",
  },
  {
    numero: "02",
    id: 2,
    titulo: "Construcción de Objetos",
    concepto: "Constructores y Parámetros",
    objeto: "Vehículo configurable en garaje",
    texto: "Crea instancias reales: elige carrocería, año, color y estado antes de conducirlas al garaje.",
    detalles: "Comprende cómo los constructores inicializan atributos críticos y cómo múltiples instancias comparten la misma estructura pero con estados independientes.",
    misionVR: "Ensambla partes del vehículo pasando parámetros al constructor. Prueba arrancar solo si el estado es válido.",
    icon: CarFront,
    color: "orange",
    accentHex: "#ff8e42",
    bgGradient: "from-amber-500/20 via-slate-900/80 to-slate-950",
  },
  {
    numero: "03",
    id: 3,
    titulo: "Encapsulamiento",
    concepto: "Visibilidad y Métodos Públicos",
    objeto: "Robot de taller por reparar",
    texto: "Protege batería y temperatura. Los métodos públicos permiten cargar, enfriar y apagar sin romper el estado interno.",
    detalles: "Los atributos privados protegen el sistema contra valores inválidos. Solo los métodos públicos con validación interna pueden cambiar el estado.",
    misionVR: "Interactúa con los interruptores y herramientas del taller para estabilizar la energía y la temperatura del robot.",
    image: "/algolab/encapsulamiento.png",
    icon: ShieldCheck,
    color: "emerald",
    accentHex: "#2ed6a1",
    bgGradient: "from-emerald-500/20 via-slate-900/80 to-slate-950",
  },
  {
    numero: "04",
    id: 4,
    titulo: "Abstracción",
    concepto: "Modelado y Relevancia",
    objeto: "Vinilos musicales y libros",
    texto: "Decide qué información importa según el contexto: escuchar una canción, comprarla o clasificar un libro.",
    detalles: "Oculta la complejidad innecesaria y expón solo los detalles esenciales para el contexto actual del problema.",
    misionVR: "Selecciona las características relevantes de los objetos del entorno y descarta los detalles irrelevantes para completar el modelo.",
    image: "/algolab/abstraccion.png",
    icon: Disc3,
    color: "blue",
    accentHex: "#148cff",
    bgGradient: "from-blue-500/20 via-slate-900/80 to-slate-950",
  },
  {
    numero: "05",
    id: 5,
    titulo: "Herencia",
    concepto: "Jerarquías y Reutilización",
    objeto: "Árbol de tipos y familias",
    texto: "Construye jerarquías y descubre qué comportamiento pasa de una clase padre a sus especializaciones.",
    detalles: "Evita la duplicación de código compartiendo lógica común en superclases mientras permites comportamientos especializados en subclases.",
    misionVR: "Conecta nodos de herencia física arrastrando bloques para ver qué atributos se heredan automáticamente.",
    image: "/algolab/herencia.png",
    icon: GitFork,
    color: "violet",
    accentHex: "#9e7bff",
    bgGradient: "from-violet-500/20 via-slate-900/80 to-slate-950",
  },
  {
    numero: "06",
    id: 6,
    titulo: "Polimorfismo",
    concepto: "Sobreescritura y Mensajes",
    objeto: "Acciones mutables en tiempo real",
    texto: "Observa cómo el mismo mensaje produce comportamientos distintos según el objeto que lo recibe.",
    detalles: "Envía la misma orden a diferentes objetos y observa cómo cada uno responde según su propia implementación polimórfica.",
    misionVR: "Emite el comando ejecutar() a diferentes entidades en la escena y analiza las variadas respuestas en el diagrama.",
    image: "/algolab/polimorfismo.png",
    icon: Shuffle,
    color: "rose",
    accentHex: "#e96868",
    bgGradient: "from-rose-500/20 via-slate-900/80 to-slate-950",
  },
];

export function LevelsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeLevel = NIVELES[activeIndex];
  const IconComponent = activeLevel.icon;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + NIVELES.length) % NIVELES.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % NIVELES.length);
  };

  return (
    <section
      aria-label="Explora los niveles de programación orientada a objetos"
      className={styles.explorer}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          handlePrev();
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          handleNext();
        }
      }}
      role="region"
      tabIndex={0}
    >
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Aprender haciendo</span>
          <h3>Explora los seis niveles</h3>
          <p>Elige un tema para conocer qué aprenderás y cómo lo practicarás en realidad mixta.</p>
        </div>
        <div className={styles.controls}>
          <button aria-label="Nivel anterior" onClick={handlePrev} type="button">
            <ChevronLeft size={20} />
          </button>
          <button aria-label="Siguiente nivel" onClick={handleNext} type="button">
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <nav aria-label="Niveles POO" className={styles.tabs}>
        {NIVELES.map((lvl, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              aria-current={isActive ? "step" : undefined}
              aria-label={`Nivel ${lvl.numero}: ${lvl.titulo}`}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              key={lvl.numero}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <small>{lvl.numero}</small>
              <span>{lvl.titulo}</span>
            </button>
          );
        })}
      </nav>

      <div aria-live="polite" className={styles.content} key={activeLevel.numero}>
        <div className={styles.copy}>
          <span className={styles.level}>Nivel {activeLevel.numero} · {activeLevel.concepto}</span>
          <h4>{activeLevel.objeto}</h4>
          <p className={styles.intro}>{activeLevel.texto}</p>
          <div className={styles.briefs}>
            <div>
              <strong>Qué harás</strong>
              <p>{activeLevel.misionVR}</p>
            </div>
            <div>
              <strong>Qué aprenderás</strong>
              <p>{activeLevel.detalles}</p>
            </div>
          </div>
        </div>
        <aside className={styles.visual}>
          <div className={styles.icon}><IconComponent aria-hidden="true" size={78} strokeWidth={1.25} /></div>
          <div className={styles.visualFooter}>
            <Gamepad2 aria-hidden="true" size={18} />
            <span>Una experiencia práctica en realidad mixta</span>
          </div>
        </aside>
      </div>
      <footer className={styles.footer}>
        <span>Tu ruta de aprendizaje</span>
        <strong>{activeIndex + 1} de {NIVELES.length}</strong>
      </footer>
    </section>
  );
}
