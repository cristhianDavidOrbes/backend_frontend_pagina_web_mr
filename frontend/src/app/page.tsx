"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  Gamepad2,
  GraduationCap,
  MousePointer2,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Bot,
} from "lucide-react";
import { FloatLayer, Reveal } from "@/components/reveal";
import { SignalMarquee } from "@/components/signal-marquee";
import { useAuthSession } from "@/lib/use-auth-session";

function LandingModuleFallback({ label }: { label: string }) {
  return (
    <div className="landing-module-loader" role="status" aria-live="polite">
      <Bot size={28} aria-hidden="true" />
      <span>{label}</span>
      <i aria-hidden="true" />
    </div>
  );
}

class LandingFeatureBoundary extends Component<
  { children: ReactNode; fallbackLabel: string },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode; fallbackLabel: string }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed
      ? <LandingModuleFallback label={this.props.fallbackLabel} />
      : this.props.children;
  }
}

const RobotStage = dynamic(
  () => import("@/components/robot-stage").then((module) => module.RobotStage),
  { ssr: false, loading: () => <LandingModuleFallback label="Cargando robot 3D" /> },
);

const LevelsCarousel = dynamic(
  () => import("@/components/levels-carousel").then((module) => module.LevelsCarousel),
  { ssr: false, loading: () => <LandingModuleFallback label="Cargando misiones" /> },
);

const pasos = [
  {
    numero: "01",
    titulo: "Escanea tu espacio",
    texto: "AlgoLab reconoce tu habitación y sitúa el laboratorio en tu mesa o suelo de forma segura.",
    icon: ScanLine,
  },
  {
    numero: "02",
    titulo: "Toca la idea en 3D",
    texto: "Apunta, agarra, gira y activa objetos con física real usando tus controladores Meta Quest.",
    icon: Gamepad2,
  },
  {
    numero: "03",
    titulo: "Comprende la lógica viva",
    texto: "El diagrama UML cambia al instante con cada acción física para unir concepto y consecuencia.",
    icon: BrainCircuit,
  },
];

export default function Home() {
  const { hydrated, token, usuario } = useAuthSession();
  const sessionUser = token ? usuario : null;
  const portalHref = sessionUser
    ? sessionUser.rol === "DOCENTE"
      ? "/docente"
      : sessionUser.rol === "ADMINISTRADOR"
        ? "/administrador"
        : "/estudiante"
    : "/iniciar-sesion";
  const portalLabel = sessionUser
    ? sessionUser.rol === "DOCENTE"
      ? "Volver al observatorio"
      : sessionUser.rol === "ADMINISTRADOR"
        ? "Volver al centro de control"
        : "Volver a mi ruta"
    : "Ingresar";
  const compactPortalLabel = sessionUser
    ? sessionUser.rol === "DOCENTE"
      ? "Observatorio"
      : sessionUser.rol === "ADMINISTRADOR"
        ? "Control"
        : "Mi ruta"
    : "Ingresar";

  return (
    <main className="landing-shell min-h-screen overflow-x-clip text-slate-100">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />

      {/* Top Navbar */}
      <header className="landing-nav-bar">
        <div className="landing-nav">
          <Link className="brand-lockup" href="/" aria-label="AlgoLab, inicio">
            <span className="brand-mark">A</span>
            <span className="brand-copy">
              <strong>AlgoLab</strong>
              <small>Laboratorio de realidad mixta</small>
            </span>
          </Link>
          <nav aria-label="Navegación principal">
            <a className="nav-anchor" href="#experiencia">Experiencia</a>
            <a className="nav-anchor" href="#niveles">Niveles</a>
            <a className="nav-anchor" href="#taller">Taller</a>
            <a className="nav-anchor" href="#roles">Comunidad</a>
          </nav>
          <div className="landing-actions">
            {hydrated && sessionUser ? (
              <div className="landing-user-cluster" aria-label={`Sesión iniciada como ${sessionUser.nombre}`}>
                <span className="landing-session-chip">
                  <i aria-hidden="true" />
                  <span>Sesión activa</span>
                  <strong>{sessionUser.nombre.split(" ")[0]}</strong>
                </span>
                <Link className="primary-button inline-flex items-center" href={portalHref}>
                  {compactPortalLabel} <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <>
                <Link className="ghost-button" href="/iniciar-sesion">Ingresar</Link>
                <Link className="primary-button hidden items-center sm:inline-flex" href="/registrarse">
                  Crear cuenta <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <Reveal className="hero-copy" direction="left">
          <div className="landing-badge">
            <span /> Realidad mixta + mentor IA
          </div>
          <h1>
            Aprende POO <em>tocando las ideas.</em>
          </h1>
          <p>
            Puertas para entender clases. Vehículos para construir objetos. Un robot para proteger su estado interno. AlgoLab convierte la programación orientada a objetos en un laboratorio interactivo que aparece en tu espacio real.
          </p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" href={sessionUser ? portalHref : "/registrarse"}>
              {sessionUser ? portalLabel : "Entrar al laboratorio"} <ArrowRight size={18} />
            </Link>
            <a className="play-link" href="#niveles">
              <span><MousePointer2 size={16} /></span> Ver misiones interactivas
            </a>
          </div>
          <div className="hero-proof">
            <div><strong>6</strong><span>misiones progresivas</span></div>
            <div><strong>3D</strong><span>objetos manipulables</span></div>
            <div><strong>IA</strong><span>mentor pedagógico</span></div>
          </div>
        </Reveal>

        <Reveal className="hero-lab" delay={0.14} direction="right">
          <div className="stage-status"><span className="status-dot" /> TALLER // NIVEL 03</div>
          <div className="stage-diagram">
            <small>CLASE</small>
            <strong>Robot</strong>
            <span>− batería</span>
            <span>− temperatura</span>
            <div style={{ borderTop: "1px solid rgba(187,196,204,.35)", margin: ".35rem 0" }} />
            <span>+ cargar()</span>
            <span>+ enfriar()</span>
          </div>
          <div className="controller-ray" />
          <LandingFeatureBoundary fallbackLabel="Vista ligera del robot disponible">
            <RobotStage />
          </LandingFeatureBoundary>
          <div className="stage-platform"><i /><i /><i /></div>
          <FloatLayer className="stage-callout" delay={0.4}>
            <span>+ método público</span>
            <strong>ENFRIAR()</strong>
          </FloatLayer>
          <div className="stage-hint">
            <MousePointer2 size={15} /> Arrastra para inspeccionar el robot
          </div>
        </Reveal>
      </section>

      {/* Seamless Infinite Marquee Strip */}
      <SignalMarquee />

      {/* Experience Section */}
      <section className="experience-section" id="experiencia">
        <Reveal className="section-heading">
          <p className="section-kicker">No memorizas: experimentas</p>
          <h2>Lo abstracto toma forma delante de ti.</h2>
          <p>
            Cada concepto se representa con una situación física tangible. Lo que haces con tus manos cambia el objeto 3D, el diagrama UML y la evidencia pedagógica al mismo tiempo.
          </p>
        </Reveal>
        <div className="experience-steps">
          {pasos.map((paso, index) => (
            <Reveal className="experience-step" delay={index * 0.08} key={paso.numero}>
              <div className="step-icon"><paso.icon size={24} /></div>
              <span>PASO {paso.numero}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
              {index < pasos.length - 1 ? <ArrowRight className="step-arrow" size={20} /> : null}
            </Reveal>
          ))}
        </div>
      </section>

      {/* Interactive Levels Showcase / Carousel Section */}
      <section className="levels-section" id="niveles">
        <Reveal className="section-heading mb-8">
          <p className="section-kicker">Ruta de aprendizaje interactiva</p>
          <h2>Seis niveles. Un mundo que evoluciona.</h2>
          <p>
            Explora cada una de las misiones diseñadas para llevarte desde la comprensión de clases hasta el polimorfismo dinámico.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <LandingFeatureBoundary fallbackLabel="Las misiones no pudieron cargarse ahora">
            <LevelsCarousel />
          </LandingFeatureBoundary>
        </Reveal>
      </section>

      {/* Physical action to visible learning journey */}
      <section className="workshop-story workshop-story-copy-only" id="taller">
        <Reveal className="workshop-copy" direction="right">
          <p className="section-kicker">Aprendizaje que puedes tocar</p>
          <h2>Cada acción física revela una idea de POO.</h2>
          <p>
            En AlgoLab no memorizas una definición aislada: manipulas un objeto, observas cómo cambia su clase y recibes una explicación en el momento. Así conectas <strong>lo que haces</strong>, <strong>la lógica POO</strong> y <strong>el resultado</strong> en una sola experiencia.
          </p>
          <ul>
            <li>
              <Check size={18} />
              <span>Objetos con física reactiva y respuesta inmediata</span>
            </li>
            <li>
              <Check size={18} />
              <span>Diagramas UML en tiempo real que señalan cada decisión</span>
            </li>
            <li>
              <Check size={18} />
              <span>Puntuación, tiempo y telemetría sincronizada con la web</span>
            </li>
          </ul>
        </Reveal>
      </section>

      {/* AI Pedagogical Mentor Section */}
      <section className="ai-section">
        <Reveal className="ai-copy" direction="left">
          <div className="ai-orb">
            <BrainCircuit size={32} />
            <i />
          </div>
          <p className="section-kicker">Mentor especializado en POO</p>
          <h2>No entrega respuestas genéricas. Lee lo que hiciste.</h2>
          <p>
            Al finalizar cada nivel en las gafas, la inteligencia artificial analiza precisión, errores específicos, intentos y tiempo invertido. El estudiante recibe un diagnóstico formativo y el docente obtiene evidencia clara para guiarlo.
          </p>
          <div className="ai-tags">
            <span>Enfocado 100% en POO</span>
            <span>Evaluación por Nivel</span>
            <span>Accionable y Pedagógico</span>
          </div>
        </Reveal>

        <Reveal className="report-preview" direction="right">
          <div className="report-head">
            <span>REPORTE IA // NIVEL 03</span>
            <strong>86%</strong>
          </div>
          <h3>Comprendiste la protección del estado</h3>
          <p>
            Elegiste métodos públicos para regular la temperatura y cargar la batería sin alterar directamente las propiedades privadas del robot.
          </p>
          <div className="report-row positive">
            <span>FORTALEZA</span>
            <p>Relacionas acciones físicas con las responsabilidades bien delimitadas de la clase.</p>
          </div>
          <div className="report-row growth">
            <span>SIGUIENTE PASO</span>
            <p>Explica por qué la validación de rango debe vivir dentro del setter o método interno.</p>
          </div>
          <small>
            <Sparkles size={14} className="text-emerald-300" />
            Generado automáticamente al finalizar la práctica en las gafas VR
          </small>
        </Reveal>
      </section>

      {/* Roles & Perspectives Section */}
      <section className="roles-section" id="roles">
        <Reveal className="section-heading">
          <p className="section-kicker">Una sola experiencia, tres perspectivas</p>
          <h2>Cada usuario ve lo que necesita para avanzar.</h2>
        </Reveal>
        <div className="role-grid">
          <Reveal className="role-card role-student">
            <Gamepad2 size={28} />
            <span>ESTUDIANTE</span>
            <h3>Una ruta que se siente como una misión interactiva.</h3>
            <p>Niveles progresivos, objetos desbloqueables, ranking, avatar personalizado y diagnósticos de IA.</p>
            <Link href={sessionUser ? portalHref : "/registrarse"}>
              {sessionUser ? portalLabel : "Crear mi perfil"} <ArrowRight size={15} />
            </Link>
          </Reveal>

          <Reveal className="role-card role-teacher" delay={0.08}>
            <GraduationCap size={28} />
            <span>DOCENTE</span>
            <h3>La evidencia detrás de cada interacción en las gafas.</h3>
            <p>Dominio por nivel del grupo, alertas tempranas de estudiantes con dificultades y reportes detallados.</p>
            <Link href={sessionUser ? portalHref : "/iniciar-sesion"}>
              {sessionUser ? portalLabel : "Abrir observatorio"} <ArrowRight size={15} />
            </Link>
          </Reveal>

          <Reveal className="role-card role-admin" delay={0.16}>
            <ShieldCheck size={28} />
            <span>ADMINISTRACIÓN</span>
            <h3>Control del ecosistema y gestión de contenidos.</h3>
            <p>Gestión completa de usuarios, asignación de roles y constructor de niveles y experiencias pedagógicas.</p>
            <Link href={sessionUser ? portalHref : "/iniciar-sesion"}>
              {sessionUser ? portalLabel : "Gestionar plataforma"} <ArrowRight size={15} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="final-cta">
        <Reveal className="final-cta-inner">
          <div>
            <p className="section-kicker">La próxima idea está esperando</p>
            <h2>Tu espacio físico puede convertirse en un laboratorio de programación.</h2>
            <p>
              Crea tu cuenta, personaliza tu avatar y continúa aprendiendo dentro y fuera de las gafas de realidad mixta.
            </p>
          </div>
          <Link className="primary-button hero-primary" href={sessionUser ? portalHref : "/registrarse"}>
            {sessionUser ? portalLabel : "Comenzar ahora"} <ArrowRight size={18} />
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="brand-lockup">
          <span className="brand-mark">A</span>
          <span className="brand-copy">
            <strong>AlgoLab</strong>
            <small>Ideas que puedes tocar</small>
          </span>
        </div>
        <p>Programación orientada a objetos · Realidad mixta Meta Quest · Inteligencia pedagógica</p>
        <span>© 2026 AlgoLab</span>
      </footer>
    </main>
  );
}
