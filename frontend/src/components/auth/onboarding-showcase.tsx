"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2,
  Cpu,
  Trophy,
  Glasses,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Rocket,
  CheckCircle2,
  Zap,
} from "lucide-react";
import type { UsuarioSesion } from "@/lib/use-auth-session";

type Props = {
  onComplete: () => void;
  usuario?: UsuarioSesion | null;
};

type Slide = {
  id: string;
  icon: typeof Glasses;
  tag: string;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  gradient: string;
  glowColor: string;
  colorClass: string;
  badgeBg: string;
};

const SLIDES: Slide[] = [
  {
    id: "mr-lab",
    icon: Glasses,
    tag: "Realidad Mixta",
    title: "Laboratorio Espacial Inmersivo",
    subtitle: "Aprende algoritmos interactuando con hologramas",
    description:
      "AlgoLab conecta la web con gafas de Realidad Mixta para que visualices árboles, grafos y estructuras de datos en 3D flotando en tu espacio real.",
    features: [
      "Visualización espacial de algoritmos en 3D",
      "Sincronización instantánea con dispositivos MR",
      "Navegación por mundos virtuales de aprendizaje",
    ],
    gradient: "from-emerald-500/20 via-cyan-500/10 to-transparent",
    glowColor: "rgba(50, 230, 161, 0.35)",
    colorClass: "text-emerald-400",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  },
  {
    id: "compiler",
    icon: Code2,
    tag: "Compilador Local",
    title: "Python y Java 100% en tu Navegador",
    subtitle: "Compilación a la velocidad de tu equipo, sin instalar nada",
    description:
      "Aprende Programación Orientada a Objetos desde cero. Escribe código, pruébalo en la terminal integrada y supera los 4 módulos temáticos con 8 subniveles.",
    features: [
      "Compilador WebAssembly (Pyodide) para Python",
      "Transpilador e intérprete Java autónomo",
      "Validador inteligente de sintaxis y conceptos POO",
    ],
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    glowColor: "rgba(56, 189, 248, 0.35)",
    colorClass: "text-cyan-400",
    badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
  },
  {
    id: "ai-mentor",
    icon: Cpu,
    tag: "Inteligencia Artificial",
    title: "Mentor IA & Analítica Personalizada",
    subtitle: "Retroalimentación adaptativa para acelerar tu aprendizaje",
    description:
      "Nuestra IA analiza tus tiempos de resolución, intentos y patrones de código para ofrecerte recomendaciones exactas justo cuando las necesitas.",
    features: [
      "Reportes de rendimiento generados por IA",
      "Detección de áreas de oportunidad y consejos",
      "Pistas inteligentes con puntaje adaptativo",
    ],
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
    glowColor: "rgba(168, 85, 247, 0.35)",
    colorClass: "text-purple-400",
    badgeBg: "bg-purple-500/15 border-purple-500/30 text-purple-300",
  },
  {
    id: "gamification",
    icon: Trophy,
    tag: "Gamificación",
    title: "Gana Puntos y Escala en el Ranking",
    subtitle: "Compite sanamente con tus compañeros de la UCC",
    description:
      "Cada nivel superado en el laboratorio o en los retos de programación suma puntos directamente a tu perfil global universitario.",
    features: [
      "Ranking en vivo de estudiantes de la facultad",
      "Medallas y avatares espaciales personalizables",
      "Progreso guardado de forma segura en la nube",
    ],
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    glowColor: "rgba(251, 191, 36, 0.35)",
    colorClass: "text-amber-400",
    badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  },
];

export function OnboardingShowcase({ onComplete, usuario }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = SLIDES[currentSlide];

  // Auto advance slide every 7 seconds unless interacted
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev < SLIDES.length - 1 ? prev + 1 : prev));
    }, 7000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  const esUltimo = currentSlide === SLIDES.length - 1;

  function siguiente() {
    if (esUltimo) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  }

  function anterior() {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  }

  return (
    <div className="relative flex min-h-[580px] w-full flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-slate-950/80 p-6 md:p-10 shadow-2xl backdrop-blur-2xl">
      {/* Background orbital particles and glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 20%, ${slide.glowColor} 0%, transparent 65%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"
      />

      {/* Header with user greeting & Skip */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20">
            <Zap size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-400">
              ¡Bienvenido a AlgoLab, {usuario?.nombre?.split(" ")[0] ?? "Estudiante"}!
            </p>
            <h2 className="text-sm font-bold text-white">Descubre tu nueva plataforma de aprendizaje</h2>
          </div>
        </div>

        <button
          onClick={onComplete}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          Omitir tour
        </button>
      </div>

      {/* Slide Content with smooth transition */}
      <div className="my-auto py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12"
          >
            {/* Left Col: Main Graphic Card */}
            <div className="lg:col-span-5">
              <div
                className={`relative flex flex-col items-center justify-center rounded-3xl border border-white/15 bg-gradient-to-b ${slide.gradient} p-8 text-center shadow-inner`}
              >
                {/* Glowing ring animation */}
                <div
                  className="mb-4 grid h-24 w-24 place-items-center rounded-2xl bg-white/10 shadow-lg ring-2 ring-white/20 backdrop-blur-md"
                  style={{ boxShadow: `0 0 40px ${slide.glowColor}` }}
                >
                  <slide.icon size={44} className={slide.colorClass} />
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase ${slide.badgeBg}`}
                >
                  {slide.tag}
                </span>

                <h3 className="mt-3 text-lg font-bold text-white">{slide.title}</h3>
                <p className="mt-1 text-xs text-slate-300">{slide.subtitle}</p>
              </div>
            </div>

            {/* Right Col: Features & Explanations */}
            <div className="space-y-4 lg:col-span-7">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className={slide.colorClass} />
                <span className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                  Pilar {currentSlide + 1} de {SLIDES.length}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-slate-200">{slide.description}</p>

              <div className="space-y-2.5 pt-2">
                {slide.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs text-slate-300 transition hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <CheckCircle2 size={16} className={`${slide.colorClass} flex-shrink-0`} />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Navigation & Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
        {/* Step Dots */}
        <div className="flex items-center gap-2">
          {SLIDES.map((s, index) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(index)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "w-8 bg-gradient-to-r from-emerald-400 to-cyan-400"
                  : "w-2.5 bg-white/20 hover:bg-white/40"
              }`}
              aria-label={`Ir al pilar ${index + 1}: ${s.title}`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {currentSlide > 0 && (
            <button
              onClick={anterior}
              className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
          )}

          <button
            onClick={siguiente}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
              esUltimo
                ? "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 shadow-emerald-500/30"
                : "bg-emerald-400 hover:bg-emerald-300 shadow-emerald-500/20"
            }`}
          >
            {esUltimo ? (
              <>
                <Rocket size={16} className="animate-bounce" />
                <span>¡Comenzar mi Aventura en AlgoLab!</span>
              </>
            ) : (
              <>
                <span>Siguiente pilar</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
