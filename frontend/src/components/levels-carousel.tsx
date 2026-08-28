"use client";

import Image from "next/image";
import { useState, useEffect, useRef, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  CarFront,
  ShieldCheck,
  Disc3,
  GitFork,
  Shuffle,
  Sparkles,
  Gamepad2,
  BrainCircuit,
  type LucideIcon,
} from "lucide-react";

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
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeLevel = NIVELES[activeIndex];
  const IconComponent = activeLevel.icon;
  const routeProgress = NIVELES.length > 1
    ? (activeIndex / (NIVELES.length - 1)) * 100
    : 0;

  useEffect(() => {
    if (!isAutoPlay) return;
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % NIVELES.length);
    }, 6500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoPlay]);

  const handlePrev = () => {
    setIsAutoPlay(false);
    setActiveIndex((prev) => (prev - 1 + NIVELES.length) % NIVELES.length);
  };

  const handleNext = () => {
    setIsAutoPlay(false);
    setActiveIndex((prev) => (prev + 1) % NIVELES.length);
  };

  return (
    <div
      aria-label="Director de misiones de AlgoLab"
      aria-roledescription="carrusel"
      className="levels-carousel-shell mission-director"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
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
      style={{
        "--mission-accent": activeLevel.accentHex,
        "--mission-accent-soft": `${activeLevel.accentHex}24`,
        "--mission-progress": `${routeProgress}%`,
      } as CSSProperties}
      tabIndex={0}
    >
      <div aria-hidden="true" className="mission-director-grid" />
      <div aria-hidden="true" className="mission-director-scan" />
      <span aria-hidden="true" className="mission-corner mission-corner-nw" />
      <span aria-hidden="true" className="mission-corner mission-corner-ne" />
      <span aria-hidden="true" className="mission-corner mission-corner-sw" />
      <span aria-hidden="true" className="mission-corner mission-corner-se" />

      <header className="levels-carousel-header mission-director-header">
        <div className="mission-director-identity">
          <span
            className="levels-carousel-number"
          >
            {activeLevel.numero}
          </span>
          <div className="levels-carousel-title">
            <span>
              Director de misiones // Laboratorio POO
            </span>
            <h3 aria-live="polite">
              {activeLevel.titulo}
            </h3>
          </div>
        </div>

        <div className="levels-carousel-arrows mission-director-arrows">
          <button
            aria-label="Nivel anterior"
            onClick={handlePrev}
            type="button"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            aria-label="Siguiente nivel"
            onClick={handleNext}
            type="button"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <nav aria-label="Ruta de niveles POO" className="levels-carousel-tabs mission-route">
        <div aria-hidden="true" className="mission-route-track">
          <i />
        </div>
        {NIVELES.map((lvl, index) => {
          const isActive = index === activeIndex;
          const LvlIcon = lvl.icon;
          return (
            <button
              aria-current={isActive ? "step" : undefined}
              aria-label={`Nivel ${lvl.numero}: ${lvl.titulo}`}
              className={`mission-route-node ${isActive ? "is-active" : ""}`}
              key={lvl.numero}
              onClick={() => {
                setIsAutoPlay(false);
                setActiveIndex(index);
              }}
              style={{ "--node-accent": lvl.accentHex } as CSSProperties}
              type="button"
            >
              <span className="mission-route-node-icon">
                <LvlIcon aria-hidden="true" size={18} />
              </span>
              <span className="mission-route-node-copy">
                <small>Nivel {lvl.numero}</small>
                <strong>{lvl.titulo}</strong>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="levels-carousel-content mission-director-content">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            className="levels-carousel-slide mission-director-slide"
            exit={{ opacity: 0, x: -28, filter: "blur(7px)" }}
            initial={{ opacity: 0, x: 28, filter: "blur(7px)" }}
            key={activeLevel.numero}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <article className="levels-carousel-copy mission-dossier">
              <div className="mission-dossier-eyebrow">
                <span>Expediente {activeLevel.numero}</span>
                <i />
                <span>Objeto de aprendizaje detectado</span>
              </div>

              <div className="levels-carousel-concept mission-concept-chip">
                <BrainCircuit aria-hidden="true" size={16} />
                <span>Concepto núcleo</span>
                <strong>{activeLevel.concepto}</strong>
              </div>

              <h4 className="levels-carousel-object">
                {activeLevel.objeto}
              </h4>

              <p className="levels-carousel-summary">
                {activeLevel.texto}
              </p>

              <div className="mission-dossier-briefs">
                <section className="levels-carousel-detail mission-brief mission-brief-action">
                  <div>
                    <Gamepad2 aria-hidden="true" size={17} />
                    Acción física
                  </div>
                  <p>{activeLevel.misionVR}</p>
                </section>

                <section className="levels-carousel-detail mission-brief mission-brief-learning">
                  <div>
                    <Sparkles aria-hidden="true" size={17} />
                    Evidencia de aprendizaje
                  </div>
                  <p>{activeLevel.detalles}</p>
                </section>
              </div>

              <footer className="mission-dossier-footer">
                <span>
                  <i /> Sistema preparado
                </span>
                <div className="mission-dossier-progress" aria-hidden="true">
                  <i />
                </div>
                <strong>{activeIndex + 1} / {NIVELES.length}</strong>
              </footer>
            </article>

            <div className="levels-carousel-stage mission-holodeck">
              <div className="mission-holodeck-head">
                <span>Cámara de objeto // RM</span>
                <span>Sector {activeLevel.numero}</span>
              </div>
              <div aria-hidden="true" className="mission-holodeck-grid" />
              <div aria-hidden="true" className="mission-holodeck-orbit orbit-one" />
              <div aria-hidden="true" className="mission-holodeck-orbit orbit-two" />
              <div aria-hidden="true" className="mission-holodeck-platform" />

              {activeLevel.image ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: [0, -5, 0] }}
                  className="mission-holodeck-object mission-holodeck-image"
                  initial={{ opacity: 0, scale: 0.86 }}
                  transition={{ opacity: { duration: 0.35 }, scale: { duration: 0.4 }, y: { duration: 4.8, repeat: Infinity, ease: "easeInOut" } }}
                >
                  <Image
                    alt={`Representación del nivel ${activeLevel.titulo}`}
                    className="mission-holodeck-image-asset"
                    height={240}
                    src={activeLevel.image}
                    width={240}
                  />
                </motion.div>
              ) : (
                <motion.div
                  animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                  className="mission-holodeck-object mission-holodeck-icon"
                  initial={{ opacity: 0, rotateY: -55, scale: 0.8 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div>
                    <IconComponent
                      size={68}
                      strokeWidth={1.4}
                    />
                  </div>
                </motion.div>
              )}

              <div className="levels-carousel-status mission-holodeck-status">
                <span />
                <strong>Objeto sincronizado</strong>
                <small>3D // listo</small>
              </div>
              <span aria-hidden="true" className="mission-holodeck-coordinate coordinate-x">X 02.14</span>
              <span aria-hidden="true" className="mission-holodeck-coordinate coordinate-y">Y 01.08</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="levels-carousel-dots mission-director-footer">
        <span>Ruta conceptual POO</span>
        <span>Seis misiones conectadas</span>
        <strong>Nodo {activeLevel.numero} activo</strong>
      </footer>
    </div>
  );
}
