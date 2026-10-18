"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  Lock,
  ChevronRight,
  ArrowRight,
  Code2,
  Trophy,
  BookOpen,
  Box,
  ShieldCheck,
  Layers3,
} from "lucide-react";
import { OOP_NIVELES, type MiniNivel } from "@/lib/oop-niveles";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";
import { LanguageIcon } from "@/components/language-icon";
import { LevelObject } from "@/components/level-object";
import { PageHead, ProgressBar, Segmented } from "@/components/ui";
import styles from "./poo-learning.module.css";

const STORAGE_KEY = "oop_progreso";

type NivelProgreso = {
  completado: boolean;
  puntos: number;
  intentos: number;
  usoPista: boolean;
};

type OopProgreso = {
  lenguaje: "python" | "java";
  niveles: Record<string, NivelProgreso>;
  puntajeTotal: number;
  puntajeGlobal?: number;
};

type ProgresoOopBackend = {
  usuarioId: number;
  puntajeOopTotal: number;
  puntajeGlobalTotal: number;
  niveles: Array<{
    id: number;
    nivel: number;
    lenguaje: string;
    completado: boolean;
    puntaje: number;
    intentos: number;
    usoPista: boolean;
  }>;
};

function claveProgreso(usuarioId?: number) {
  return `${STORAGE_KEY}:${usuarioId ?? "anonimo"}`;
}

function cargarProgresoLocal(usuarioId?: number): OopProgreso {
  if (typeof window === "undefined") {
    return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
  }
  try {
    const raw = localStorage.getItem(claveProgreso(usuarioId));
    if (raw) return JSON.parse(raw) as OopProgreso;
  } catch {
    /* ignore */
  }
  return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
}

function guardarProgresoLocal(p: OopProgreso, usuarioId?: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem(claveProgreso(usuarioId), JSON.stringify(p));
  }
}

function fusionarNivelProgreso(
  local: NivelProgreso | undefined,
  remoto: NivelProgreso,
): NivelProgreso {
  if (!local) return remoto;

  return {
    completado: local.completado || remoto.completado,
    puntos: Math.max(local.puntos, remoto.puntos),
    intentos: Math.max(local.intentos, remoto.intentos),
    usoPista: local.usoPista || remoto.usoPista,
  };
}

const MODULE_ICONS = [BookOpen, Box, ShieldCheck, Layers3];

export default function CodigoPage() {
  const { token, usuario } = useAuthSession();
  const [progreso, setProgreso] = useState<OopProgreso>(() => cargarProgresoLocal());
  const [lenguaje, setLenguaje] = useState<"python" | "java">("python");

  // Sincronizar con el backend al montar o al obtener token
  useEffect(() => {
    if (!usuario?.id) return;

    let cancelado = false;
    const local = cargarProgresoLocal(usuario.id);
    queueMicrotask(() => {
      if (cancelado) return;
      setProgreso(local);
      setLenguaje(local.lenguaje);
    });
    if (!token) return () => { cancelado = true; };

    apiRequest<ProgresoOopBackend>("/api/oop/progreso", token)
      .then((data) => {
        if (cancelado || !data || !data.niveles) return;

        setProgreso((prev) => {
          const actualizados: Record<string, NivelProgreso> = { ...prev.niveles };
          data.niveles.forEach((n) => {
            const claveNivel = String(n.nivel);
            const remoto: NivelProgreso = {
              completado: n.completado,
              puntos: n.puntaje,
              intentos: n.intentos,
              usoPista: n.usoPista,
            };
            actualizados[claveNivel] = fusionarNivelProgreso(
              actualizados[claveNivel],
              remoto,
            );
          });

          const totalFusionado = Object.values(actualizados).reduce(
            (total, nivel) => total + nivel.puntos,
            0,
          );

          const nuevo: OopProgreso = {
            lenguaje: prev.lenguaje,
            niveles: actualizados,
            puntajeTotal: Math.max(
              prev.puntajeTotal,
              data.puntajeOopTotal ?? 0,
              totalFusionado,
            ),
            puntajeGlobal: data.puntajeGlobalTotal,
          };
          guardarProgresoLocal(nuevo, usuario.id);
          return nuevo;
        });
      })
      .catch(() => {
        // Fallback transparente a localStorage si el backend no responde
      });
    return () => { cancelado = true; };
  }, [token, usuario?.id]);

  function cambiarLenguaje(lang: "python" | "java") {
    setLenguaje(lang);
    setProgreso((prev) => {
      const nuevo = { ...prev, lenguaje: lang };
      guardarProgresoLocal(nuevo, usuario?.id);
      return nuevo;
    });
  }

  // Agrupar niveles por Módulo y Subniveles
  const modulos = useMemo(() => {
    const map = new Map<number, { nombre: string; niveles: MiniNivel[] }>();
    OOP_NIVELES.forEach((n) => {
      if (!map.has(n.moduloNumero)) {
        map.set(n.moduloNumero, { nombre: n.moduloNombre, niveles: [] });
      }
      map.get(n.moduloNumero)!.niveles.push(n);
    });
    return Array.from(map.entries()).map(([numero, data]) => ({
      numero,
      nombre: data.nombre,
      niveles: data.niveles,
    }));
  }, []);

  const puntajeOopTotal = Object.values(progreso.niveles).reduce((sum, n) => sum + n.puntos, 0);
  // usuario.puntaje ya incluye OOP; sumarlo otra vez en el fallback duplicaba
  // el total cuando el endpoint específico estaba temporalmente indisponible.
  const completados = Object.values(progreso.niveles).filter((n) => n.completado).length;
  const porcentaje = Math.round((completados / OOP_NIVELES.length) * 100);
  const siguienteNivel = OOP_NIVELES.find((nivel, index) => {
    if (progreso.niveles[String(nivel.id)]?.completado) return false;
    return index === 0 || progreso.niveles[String(OOP_NIVELES[index - 1].id)]?.completado;
  });
  const rutaCompleta = OOP_NIVELES.every(
    (nivel) => progreso.niveles[String(nivel.id)]?.completado,
  );

  return (
    <main className={styles.catalogue}>
      <PageHead
        title={<>Programar <span className="gradient-text">POO</span></>}
        description="De los objetos en tus gafas a tu propio código. Aprende, prueba y supera un reto a la vez."
        actions={<Segmented label="Lenguaje de aprendizaje" value={lenguaje} onChange={cambiarLenguaje} options={[
          { value: "python", label: "Python", icon: <LanguageIcon lenguaje="python" size={18} /> },
          { value: "java", label: "Java", icon: <LanguageIcon lenguaje="java" size={18} /> },
        ]} />}
      />
      <div className={styles.journeyLayout}>
        <div className={styles.journeyMain}>
          <section className={`glass ${styles.nextChallenge}`} aria-labelledby="mision-programar-poo">
            <div>
              <span className={`badge ${rutaCompleta ? "badge-action" : "badge-info"}`}>
                {rutaCompleta ? "¡Ruta completa!" : `Tu siguiente reto · ${siguienteNivel?.subnivel ?? "1.1"}`}
              </span>
              <h2 id="mision-programar-poo" className="title-lg">
                {rutaCompleta ? "Ya sabes construir con código" : siguienteNivel?.titulo ?? "Variables y Tipos"}
              </h2>
              <p className="muted">{rutaCompleta
                ? "Repite tus retos favoritos o prueba el otro lenguaje. Tu progreso se conserva."
                : siguienteNivel?.descripcionCorta ?? "Convierte lo aprendido en tu primera solución."}</p>
              <Link href={`/estudiante/codigo/${siguienteNivel?.id ?? OOP_NIVELES[0].id}?lang=${lenguaje}`} className="btn btn-primary">
                {rutaCompleta ? "Volver a practicar" : completados > 0 ? "Continuar reto" : "Comenzar mi primer reto"}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <div className={styles.challengeMark} aria-hidden="true"><LevelObject objeto="robot" size={120} /><span>¡Vamos a crear!</span></div>
          </section>
          <section aria-labelledby="ruta-poo" className={styles.learningRoute}>
            <div className={styles.routeHeading}><h2 className="title-md" id="ruta-poo">Tu camino en código</h2><span className="muted">8 retos · 4 módulos</span></div>
            {modulos.map((mod) => {
              const ModuleIcon = MODULE_ICONS[mod.numero - 1] ?? Code2;
              const moduleDone = mod.niveles.filter((n) => progreso.niveles[String(n.id)]?.completado).length;
              return <section className={styles.module} key={mod.numero} data-module={mod.numero} aria-labelledby={`modulo-${mod.numero}`}>
                <header className={styles.moduleHeading}>
                  <span className={styles.moduleIcon}><ModuleIcon size={22} aria-hidden="true" /></span>
                  <div><span className="subtle text-sm">Módulo {mod.numero}</span><h3 id={`modulo-${mod.numero}`}>{mod.nombre.replace(/^Módulo\s+\d+:\s*/i, "")}</h3></div>
                  <span className={styles.moduleCount}>{moduleDone}/{mod.niveles.length}<span className="sr-only"> retos completados</span></span>
                </header>
                <ol className={styles.routeList}>
                  {mod.niveles.map((nivel) => {
                    const index = OOP_NIVELES.findIndex((n) => n.id === nivel.id);
                    const saved = progreso.niveles[String(nivel.id)];
                    const done = saved?.completado ?? false;
                    const locked = index > 0 && !progreso.niveles[String(OOP_NIVELES[index - 1].id)]?.completado;
                    const current = !done && !locked;
                    return <li key={nivel.id} className={`${styles.routeItem} ${current ? styles.current : ""} ${locked ? styles.locked : ""}`}>
                      <span className={styles.routeNode} aria-hidden="true">{done ? <CheckCircle2 size={23} /> : locked ? <Lock size={19} /> : nivel.subnivel}</span>
                      <div className={styles.levelCopy}>
                        <h4>{nivel.titulo}</h4><p>{nivel.descripcionCorta}</p>
                        <span className={styles.levelStatus}>{done ? `Completado · ${saved.puntos} pts` : locked ? "Completa el reto anterior para desbloquearlo" : `Disponible · hasta ${nivel.puntaje} pts`}</span>
                      </div>
                      {!locked && <Link className="btn btn-secondary btn-sm" href={`/estudiante/codigo/${nivel.id}?lang=${lenguaje}`} aria-label={`${done ? "Repasar" : "Empezar"}: ${nivel.titulo}`}>
                        {done ? "Repasar" : "Empezar"}<ChevronRight size={16} aria-hidden="true" />
                      </Link>}
                    </li>;
                  })}
                </ol>
              </section>;
            })}
          </section>
        </div>
        <aside className={styles.journeyRail} aria-label="Tu progreso y cómo aprender">
          <section className="card card-pad">
            <div className={styles.railHeading}><h2 className="title-md">Cada reto cuenta</h2><Trophy size={22} className="text-progress" aria-hidden="true" /></div>
            <p className={styles.progressCopy}><strong>{completados} de {OOP_NIVELES.length}</strong> retos superados</p>
            <ProgressBar value={porcentaje} label="Progreso de los retos de Programar POO" />
            <p className={styles.points}><strong>{puntajeOopTotal}</strong> puntos en código</p>
            <p className="muted text-sm">{rutaCompleta ? "¡Lo lograste! Ahora experimenta con tus propias ideas." : "Un reto terminado abre el siguiente. Puedes repasar los que ya superaste."}</p>
          </section>
          <section className={`card card-pad ${styles.howTo}`}>
            <h2 className="title-md">Aprende haciendo</h2>
            <ol><li><span>1</span><div><strong>Descubre</strong><p>Lee la guía y el ejemplo completo.</p></div></li>
              <li><span>2</span><div><strong>Experimenta</strong><p>Cambia valores, escribe y ejecuta.</p></div></li>
              <li><span>3</span><div><strong>Supera tu reto</strong><p>Revisa el resultado y vuelve a probar.</p></div></li></ol>
            <p className={styles.tutorNote}>Equivocarte también es aprender. El laboratorio te explica los errores; las pistas se habilitan después de 6 intentos.</p>
          </section>
          <p className={`muted text-sm ${styles.optionalNote}`}>Esta práctica es opcional e independiente de tu ruta en las gafas.</p>
        </aside>
      </div>

      {rutaCompleta ? (
        <section className="oop-konami-reward" aria-label="Recompensa secreta de Programar POO">
          <div>
            <span className="oop-konami-crown">Trofeo de maestría POO</span>
            <h2>Desbloqueaste el secreto mejor guardado de AlgoLab</h2>
            <p>
              Esta recompensa solo aparece al completar los ocho subniveles. Memoriza la secuencia y pruébala
              dentro de las gafas.
            </p>
          </div>
          <div className="oop-konami-code" aria-label="Código Konami">
            <strong>↑ ↑ ↓ ↓ ← ← → → B A</strong>
            <small>
              Como <b>invitado</b>: después de ver o saltar el tutorial y estando fuera de cualquier nivel,
              introdúcelo para desbloquear todos los niveles. Este desbloqueo es exclusivo del modo invitado.
              En el <b>tema del nivel 3</b>, la secuencia activa la sorpresa del robot y funciona tanto como
              invitado como con una sesión iniciada.
            </small>
          </div>
        </section>
      ) : null}

    </main>
  );
}
