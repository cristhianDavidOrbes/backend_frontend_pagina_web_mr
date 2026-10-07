"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { Component, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Eye, GraduationCap, Hand, Lightbulb, ShieldCheck, Sparkles, Glasses } from "lucide-react";

import { LearningPath } from "@/components/learning-path";
import { LevelObject } from "@/components/level-object";
import { Shared } from "@/components/page-transition";
import { EASE_OUT, Reveal, Stagger, StaggerItem } from "@/components/reveal";
import type { RobotSignal } from "@/components/robot-stage";
import { PUNTAJE_MAXIMO_NIVEL } from "@/lib/ruta-mr";
import { useAuthSession } from "@/lib/use-auth-session";
import { BrandMark } from "@/components/brand-mark";

class FeatureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const RobotStage = dynamic(() => import("@/components/robot-stage").then((m) => m.RobotStage), {
  ssr: false,
  loading: () => <div className="robot-stage robot-stage-checking" />,
});

const pasos = [
  { icon: Hand, color: "action", titulo: "Toca", texto: "Manipulas objetos en tu propio espacio." },
  { icon: Eye, color: "info", titulo: "Observa", texto: "Cada acción cambia algo que puedes ver." },
  { icon: Lightbulb, color: "progress", titulo: "Entiende", texto: "Una frase corta te explica el porqué." },
] as const;

const chat = [
  { de: "robot", texto: "¡Bien! Usaste Cargar en vez de tocar la batería." },
  { de: "robot", texto: "Para reforzar: ¿por qué el límite vive dentro del robot?" },
  { de: "tu", texto: "¡Para que nadie lo rompa desde afuera!" },
] as const;

export default function Home() {
  const reduce = useReducedMotion();
  const { hydrated, token, usuario } = useAuthSession();
  const sesion = hydrated && token ? usuario : null;
  const [senal, setSenal] = useState<RobotSignal | null>(null);
  const senalId = useRef(0);

  const portal = sesion
    ? sesion.rol === "DOCENTE"
      ? { href: "/docente", label: "Ir a mi grupo" }
      : sesion.rol === "ADMINISTRADOR"
        ? { href: "/administrador", label: "Ir a administración" }
        : { href: "/estudiante", label: "Continuar mi ruta" }
    : null;

  function reaccionar(kind: RobotSignal["kind"]) {
    senalId.current += 1;
    setSenal({ kind, id: senalId.current });
  }

  const ctaPrincipal = portal ? (
    <Link className="btn btn-primary btn-xl" href={portal.href} transitionTypes={["nav-forward"]}>
      {portal.label} <ArrowRight className="icon-shift" size={20} />
    </Link>
  ) : (
    <Link className="btn btn-primary btn-xl" href="/registrarse" transitionTypes={["nav-forward"]}>
      Crear cuenta gratis
    </Link>
  );

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-pill glass">
          <Shared name="brand">
            <Link aria-label="AlgoLab, inicio" className="brand" href="/">
              <BrandMark />
              <span className="brand-name">AlgoLab</span>
            </Link>
          </Shared>
          <nav aria-label="Secciones" className="landing-links">
            <a href="#como">Cómo funciona</a>
            <a href="#ruta">Ruta</a>
            <a href="#tutor">Tutor</a>
          </nav>
          <div className="flex items-center gap-2">
            {portal ? (
              <Link className="btn btn-primary btn-sm" href={portal.href} transitionTypes={["nav-forward"]}>{portal.label}</Link>
            ) : (
              <>
                <Link className="btn btn-ghost btn-sm hidden sm:inline-flex" href="/iniciar-sesion" transitionTypes={["nav-forward"]}>Ingresar</Link>
                <Link className="btn btn-primary btn-sm" href="/registrarse" transitionTypes={["nav-forward"]}>Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="contenido">
        {/* Portada: mascota + mensaje + invitación */}
        <section className="hero container-x">
          <Reveal className="hero-mascot" direction="none">
            <div className="hero-stage" onPointerEnter={() => reaccionar("attention")}>
              <FeatureBoundary>
                <RobotStage presence="hero" signal={senal} />
              </FeatureBoundary>
              <div className="stage-floor" />
            </div>
            <motion.button
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="speech glass hero-speech"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.8, y: reduce ? 0 : 10 }}
              onClick={() => reaccionar("wave")}
              transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 18 }}
              type="button"
            >
              ¡Hola! Te enseño POO con objetos que puedes tocar.
            </motion.button>
          </Reveal>

          <div className="hero-copy">
            <Reveal>
              <span className="badge badge-info"><Glasses size={15} /> Realidad mixta · Meta Quest</span>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="display-1 mt-5">
                Aprende POO <span className="gradient-text">tocando las ideas.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="lead mt-5">Abres una puerta, armas un vehículo, reparas un robot. Así entiendes la programación orientada a objetos.</p>
            </Reveal>
            <Reveal className="hero-ctas" delay={0.18}>
              {ctaPrincipal}
              {!portal ? (
                <Link className="btn btn-secondary btn-xl" href="/iniciar-sesion" transitionTypes={["nav-forward"]}>
                  Ya tengo cuenta
                </Link>
              ) : null}
            </Reveal>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="section container-x" id="como">
          <Reveal className="section-head">
            <h2 className="display-2">Así de simple.</h2>
          </Reveal>
          <Stagger className="steps">
            {pasos.map((paso, i) => (
              <StaggerItem as="article" className={`step glass step-${paso.color}`} key={paso.titulo}>
                <span className="step-icon"><paso.icon size={30} strokeWidth={2.4} /></span>
                <span className="step-n">{i + 1}</span>
                <h3>{paso.titulo}</h3>
                <p>{paso.texto}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Ruta: camino de aprendizaje */}
        <section className="section container-x route-section" id="ruta">
          <Reveal className="section-head">
            <h2 className="display-2">4 niveles. <span className="gradient-text">Un objeto por idea.</span></h2>
            <p className="lead mt-4">Del plano al objeto, hasta la abstracción. Cada nivel vale {PUNTAJE_MAXIMO_NIVEL} puntos.</p>
          </Reveal>
          <LearningPath
            detalle={(nivel) => (
              <>
                <strong>{nivel.nombreObjeto}</strong>
                <p>{nivel.resumen}</p>
                {portal ? (
                  <Link className="btn btn-primary btn-sm btn-block" href={portal.href}>Ir a mi ruta</Link>
                ) : (
                  <Link className="btn btn-primary btn-sm btn-block" href="/registrarse" transitionTypes={["nav-forward"]}>Crea tu cuenta para empezar</Link>
                )}
              </>
            )}
            estado={() => "invitado"}
            meta={{ titulo: "¡Ruta completa!", logrado: false }}
          />
        </section>

        {/* Tutor */}
        <section className="section container-x tutor" id="tutor">
          <Reveal className="tutor-copy">
            <span className="badge badge-action"><Sparkles size={15} /> Tutor con IA</span>
            <h2 className="display-2 mt-4">Te dice qué lograste y qué sigue.</h2>
            <p className="lead mt-4">Lee tus intentos, tiempo y errores. Nada de respuestas genéricas.</p>
          </Reveal>
          <div className="chat glass">
            {chat.map((m, i) => (
              <motion.div
                className={`chat-row ${m.de === "tu" ? "is-me" : ""}`}
                initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.96 }}
                key={i}
                transition={{ delay: 0.15 + i * 0.45, duration: 0.45, ease: EASE_OUT }}
                viewport={{ once: true, amount: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
              >
                {m.de === "robot" ? <span className="chat-avatar"><LevelObject objeto="robot" size={40} /></span> : null}
                <p className="chat-bubble">{m.texto}</p>
              </motion.div>
            ))}
            <motion.div
              className="chat-score"
              initial={{ opacity: 0, scale: reduce ? 1 : 0.7 }}
              transition={{ delay: 1.6, type: "spring", stiffness: 300, damping: 16 }}
              viewport={{ once: true }}
              whileInView={{ opacity: 1, scale: 1 }}
            >
              <span>Nivel 3 · Encapsulamiento</span>
              <strong>86 <small>/ 100</small></strong>
            </motion.div>
          </div>
        </section>

        {/* Roles */}
        <section className="section container-x">
          <Reveal className="section-head">
            <h2 className="display-2">Para toda el aula.</h2>
          </Reveal>
          <Stagger className="roles">
            <StaggerItem as="article" className="role glass">
              <span className="role-icon role-action"><Glasses size={26} /></span>
              <h3>Estudiantes</h3>
              <p>Tu ruta, tus logros y tu siguiente paso.</p>
            </StaggerItem>
            <StaggerItem as="article" className="role glass">
              <span className="role-icon role-info"><GraduationCap size={26} /></span>
              <h3>Docentes</h3>
              <p>Quién avanza y quién necesita apoyo.</p>
            </StaggerItem>
            <StaggerItem as="article" className="role glass">
              <span className="role-icon role-progress"><ShieldCheck size={26} /></span>
              <h3>Administración</h3>
              <p>Usuarios, niveles y el tutor, en orden.</p>
            </StaggerItem>
          </Stagger>
        </section>

        {/* Invitación final */}
        <section className="section container-x">
          <Reveal className="final glass">
            <h2 className="display-2">Tu habitación, <span className="gradient-text">tu laboratorio.</span></h2>
            <p className="lead mt-4">Gratis. Tu progreso te sigue de la web a las gafas.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">{ctaPrincipal}</div>
          </Reveal>
        </section>
      </main>

      <footer className="landing-footer container-x">
        <span className="brand"><BrandMark /><span className="brand-name">AlgoLab</span></span>
        <p>Programación orientada a objetos en realidad mixta · UCC Pasto · © 2026</p>
      </footer>
    </div>
  );
}
