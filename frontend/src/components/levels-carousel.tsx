"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
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
      className="relative rounded-3xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-2xl sm:p-8"
      onMouseEnter={() => setIsAutoPlay(false)}
      onMouseLeave={() => setIsAutoPlay(true)}
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-30 blur-2xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 60% 40%, ${activeLevel.accentHex}44, transparent 70%)`,
        }}
      />

      {/* Header controls and level selector tabs */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl border text-sm font-bold font-mono"
            style={{
              borderColor: `${activeLevel.accentHex}55`,
              backgroundColor: `${activeLevel.accentHex}18`,
              color: activeLevel.accentHex,
            }}
          >
            {activeLevel.numero}
          </span>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[.18em] text-slate-400">
              Ruta Interactiva POO
            </span>
            <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {activeLevel.titulo}
            </h3>
          </div>
        </div>

        {/* Prev / Next buttons */}
        <div className="flex items-center gap-2">
          <button
            aria-label="Nivel anterior"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-emerald-200 active:scale-95"
            onClick={handlePrev}
            type="button"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            aria-label="Siguiente nivel"
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 transition hover:border-emerald-300/30 hover:bg-emerald-300/10 hover:text-emerald-200 active:scale-95"
            onClick={handleNext}
            type="button"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Quick Level Pills Tab Bar */}
      <div className="relative z-10 mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {NIVELES.map((lvl, index) => {
          const isActive = index === activeIndex;
          const LvlIcon = lvl.icon;
          return (
            <button
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition duration-200 ${
                isActive
                  ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100 shadow-[0_0_20px_rgba(46,214,161,.15)]"
                  : "border-white/5 bg-white/[.02] text-slate-400 hover:border-white/15 hover:bg-white/[.05] hover:text-slate-200"
              }`}
              key={lvl.numero}
              onClick={() => {
                setIsAutoPlay(false);
                setActiveIndex(index);
              }}
              type="button"
            >
              <LvlIcon size={14} style={{ color: isActive ? lvl.accentHex : undefined }} />
              <span>Nivel {lvl.numero}</span>
            </button>
          );
        })}
      </div>

      {/* Animated Slide Content */}
      <div className="relative z-10 mt-6 min-h-[380px]">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-center"
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            key={activeLevel.numero}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {/* Left Column: Pedagogical Details & VR Mission */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-3 py-1 text-xs text-slate-300">
                <BrainCircuit size={14} style={{ color: activeLevel.accentHex }} />
                <span>Concepto clave:</span>
                <strong className="text-white">{activeLevel.concepto}</strong>
              </div>

              <h4 className="text-2xl font-bold text-slate-100 sm:text-3xl">
                {activeLevel.objeto}
              </h4>

              <p className="text-sm leading-7 text-slate-300 sm:text-base">
                {activeLevel.texto}
              </p>

              <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Gamepad2 size={15} style={{ color: activeLevel.accentHex }} />
                  Misión en Realidad Mixta
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  {activeLevel.misionVR}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[.02] to-transparent p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Sparkles size={15} className="text-emerald-300" />
                  Impacto en Aprendizaje
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {activeLevel.detalles}
                </p>
              </div>
            </div>

            {/* Right Column: Visual Stage / Hologram representation */}
            <div className="relative flex min-h-[300px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/60 to-slate-950/80 p-6 shadow-2xl">
              {/* Scanline and Grid effect */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:24px_24px]"
              />

              <div
                className="pointer-events-none absolute h-52 w-52 rounded-full opacity-30 blur-3xl"
                style={{ backgroundColor: activeLevel.accentHex }}
              />

              {activeLevel.image ? (
                <div className="relative z-10 flex items-center justify-center p-4">
                  <Image
                    alt={`Representación del nivel ${activeLevel.titulo}`}
                    className="max-h-56 w-auto object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,.7)] transition-transform duration-500 hover:scale-105"
                    height={240}
                    src={activeLevel.image}
                    width={240}
                  />
                </div>
              ) : (
                <div className="relative z-10 grid place-items-center p-8">
                  <div
                    className="grid h-32 w-32 place-items-center rounded-3xl border shadow-[0_0_60px_rgba(0,0,0,.5)]"
                    style={{
                      borderColor: `${activeLevel.accentHex}44`,
                      backgroundColor: `${activeLevel.accentHex}12`,
                    }}
                  >
                    <IconComponent
                      size={68}
                      style={{ color: activeLevel.accentHex }}
                      strokeWidth={1.4}
                    />
                  </div>
                </div>
              )}

              {/* Status footer pill */}
              <div className="relative z-10 mt-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3.5 py-1.5 font-mono text-[11px] text-slate-300 backdrop-blur-md">
                <span
                  className="h-2 w-2 animate-pulse rounded-full"
                  style={{ backgroundColor: activeLevel.accentHex }}
                />
                <span>ESCENARIO VIRTUAL // 3D LISTO</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Dots Indicator */}
      <div className="relative z-10 mt-6 flex items-center justify-center gap-2">
        {NIVELES.map((lvl, index) => (
          <button
            aria-label={`Ir al nivel ${lvl.numero}`}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === activeIndex
                ? "w-8 bg-emerald-400 shadow-[0_0_12px_#34d399]"
                : "w-2 bg-white/20 hover:bg-white/40"
            }`}
            key={lvl.numero}
            onClick={() => {
              setIsAutoPlay(false);
              setActiveIndex(index);
            }}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
