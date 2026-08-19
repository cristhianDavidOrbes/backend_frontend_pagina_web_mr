import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CarFront,
  Check,
  Disc3,
  DoorOpen,
  Gamepad2,
  GitFork,
  GraduationCap,
  MousePointer2,
  ScanLine,
  ShieldCheck,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { FloatLayer, Reveal } from "@/components/reveal";
import { RobotStage } from "@/components/robot-stage";

const niveles = [
  { numero: "01", titulo: "Clases y objetos", objeto: "Una puerta que responde", texto: "Mira cómo color, modelo y estado se vuelven atributos; abrir y cerrar se convierten en acciones físicas.", icon: DoorOpen, color: "cyan" },
  { numero: "02", titulo: "Construcción de objetos", objeto: "Un vehículo configurable", texto: "Crea instancias reales: elige carrocería, año, color y estado antes de conducirlas al garaje.", icon: CarFront, color: "orange" },
  { numero: "03", titulo: "Encapsulamiento", objeto: "Un robot por reparar", texto: "Protege batería y temperatura. Los métodos públicos permiten cargar, enfriar y apagar sin romper el estado interno.", image: "/algolab/encapsulamiento.png", icon: ShieldCheck, color: "emerald" },
  { numero: "04", titulo: "Abstracción", objeto: "Vinilos y libros", texto: "Decide qué información importa según el contexto: escuchar una canción, comprarla o clasificar un libro.", image: "/algolab/abstraccion.png", icon: Disc3, color: "blue" },
  { numero: "05", titulo: "Herencia", objeto: "Familias que comparten", texto: "Construye jerarquías y descubre qué comportamiento pasa de una clase padre a sus especializaciones.", image: "/algolab/herencia.png", icon: GitFork, color: "violet" },
  { numero: "06", titulo: "Polimorfismo", objeto: "Una acción, varias respuestas", texto: "Observa cómo el mismo mensaje produce comportamientos distintos según el objeto que lo recibe.", image: "/algolab/polimorfismo.png", icon: Shuffle, color: "rose" },
];

const pasos = [
  { numero: "01", titulo: "Escanea tu espacio", texto: "AlgoLab reconoce tu habitación y sitúa el laboratorio de forma segura.", icon: ScanLine },
  { numero: "02", titulo: "Toca la idea", texto: "Apunta, agarra, gira y activa objetos con tus controladores Meta Quest.", icon: Gamepad2 },
  { numero: "03", titulo: "Comprende la lógica", texto: "El diagrama cambia al mismo tiempo que el objeto para unir concepto y consecuencia.", icon: BrainCircuit },
];

const signalItems = [
  "OBJETOS FÍSICOS",
  "DIAGRAMAS VIVOS",
  "RETROALIMENTACIÓN IA",
  "PROGRESO SINCRONIZADO",
];

export default function Home() {
  return (
    <main className="landing-shell min-h-screen overflow-hidden text-slate-100">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />

      <header className="landing-nav">
        <Link className="brand-lockup" href="/" aria-label="AlgoLab, inicio">
          <span className="brand-mark">A</span>
          <span><strong>AlgoLab</strong><small>Laboratorio de realidad mixta</small></span>
        </Link>
        <nav aria-label="Navegación principal">
          <a className="nav-anchor" href="#experiencia">Experiencia</a>
          <a className="nav-anchor" href="#niveles">Niveles</a>
          <a className="nav-anchor" href="#roles">Comunidad</a>
        </nav>
        <div className="landing-actions">
          <Link className="ghost-button" href="/iniciar-sesion">Ingresar</Link>
          <Link className="primary-button hidden items-center sm:inline-flex" href="/registrarse">Crear cuenta <ArrowRight size={16} /></Link>
        </div>
      </header>

      <section className="landing-hero">
        <Reveal className="hero-copy" direction="left">
          <div className="landing-badge"><span /> Realidad mixta + mentor IA</div>
          <h1>Aprende POO <em>tocando las ideas.</em></h1>
          <p>Puertas para entender clases. Vehículos para construir objetos. Un robot para proteger su estado. AlgoLab convierte la programación orientada a objetos en un laboratorio que aparece en tu espacio real.</p>
          <div className="hero-actions">
            <Link className="primary-button hero-primary" href="/registrarse">Entrar al laboratorio <ArrowRight size={18} /></Link>
            <a className="play-link" href="#experiencia"><span><MousePointer2 size={16} /></span> Ver cómo funciona</a>
          </div>
          <div className="hero-proof">
            <div><strong>6</strong><span>misiones progresivas</span></div>
            <div><strong>3D</strong><span>objetos manipulables</span></div>
            <div><strong>IA</strong><span>reporte al finalizar</span></div>
          </div>
        </Reveal>

        <Reveal className="hero-lab" delay={0.14} direction="right">
          <div className="stage-status"><span className="status-dot" /> TALLER // NIVEL 03</div>
          <div className="stage-diagram">
            <small>CLASE</small><strong>Robot</strong>
            <span>− batería</span><span>− temperatura</span>
            <div style={{borderTop:'1px solid rgba(187,196,204,.35)',margin:'.35rem 0'}} />
            <span>+ cargar()</span><span>+ enfriar()</span>
          </div>
          <div className="controller-ray" />
          <RobotStage />
          <div className="stage-platform"><i /><i /><i /></div>
          <FloatLayer className="stage-callout" delay={0.4}><span>+ método público</span><strong>ENFRIAR()</strong></FloatLayer>
          <div className="stage-hint"><MousePointer2 size={15} /> Arrastra para inspeccionar el robot</div>
        </Reveal>
      </section>

      <div className="signal-strip" aria-hidden="true">
        <div className="signal-track">
          {["original", "duplicate"].map((group) => (
            <div className="signal-group" key={group}>
              {signalItems.map((item, index) => (
                <span key={item}>
                  {item}
                  {index < signalItems.length - 1 ? <i /> : null}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <section className="experience-section" id="experiencia">
        <Reveal className="section-heading">
          <p className="section-kicker">No memorizas: experimentas</p>
          <h2>Lo abstracto toma forma delante de ti.</h2>
          <p>Cada concepto se representa con una situación física. Lo que haces con tus manos cambia el objeto, el diagrama y la evidencia de aprendizaje al mismo tiempo.</p>
        </Reveal>
        <div className="experience-steps">
          {pasos.map((paso, index) => (
            <Reveal className="experience-step" delay={index * 0.08} key={paso.numero}>
              <div className="step-icon"><paso.icon size={24} /></div>
              <span>{paso.numero}</span><h3>{paso.titulo}</h3><p>{paso.texto}</p>
              {index < pasos.length - 1 ? <ArrowRight className="step-arrow" size={20} /> : null}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="levels-section" id="niveles">
        <Reveal className="section-heading section-heading-inline">
          <div><p className="section-kicker">Ruta de aprendizaje</p><h2>Seis niveles. Un mundo que evoluciona.</h2></div>
          <p>La dificultad crece de forma visible: primero reconoces estructuras, después proteges estados, seleccionas lo esencial y finalmente diseñas comportamientos flexibles.</p>
        </Reveal>
        <div className="level-expedition">
          {niveles.map((nivel, index) => (
            <Reveal className={`expedition-card expedition-${nivel.color}`} delay={(index % 3) * 0.07} key={nivel.numero}>
              <div className="expedition-top"><span>NIVEL {nivel.numero}</span><small>{nivel.objeto}</small></div>
              <div className="artifact-window">
                <div className="artifact-grid" />
                {nivel.image ? <Image alt="" className="artifact-project-image" height={210} src={nivel.image} width={210} /> : <nivel.icon className="artifact-icon" size={92} strokeWidth={1.2} />}
                <div className="artifact-scan" />
              </div>
              <div className="expedition-copy"><h3>{nivel.titulo}</h3><p>{nivel.texto}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="workshop-story">
        <Reveal className="workshop-visual" direction="left">
          <div className="workshop-screen"><span>MODO SEGURO // ROBOT APAGADO</span><strong>ENERGÍA 24% &nbsp; · &nbsp; 85°C</strong><small>Usa métodos públicos para reparar el estado interno.</small></div>
          <Image alt="Icono del robot averiado usado dentro de AlgoLab" className="broken-robot-icon" height={310} src="/algolab/robot-averiado.png" width={310} />
          <div className="tool-pill tool-battery">− batería</div><div className="tool-pill tool-cool">+ enfriar()</div>
        </Reveal>
        <Reveal className="workshop-copy" direction="right">
          <p className="section-kicker">Así se siente aprender</p>
          <h2>Repara un robot. Entiende encapsulamiento.</h2>
          <p>El robot expone acciones seguras, pero protege batería, temperatura y estado. Si intentas modificar directamente un atributo privado, el sistema reacciona. Si usas <strong>cargar()</strong>, <strong>enfriar()</strong> y <strong>apagar()</strong>, ves por qué una clase controla su información.</p>
          <ul><li><Check size={16} /> Objetos con física y respuesta inmediata</li><li><Check size={16} /> Diagramas UML que señalan cada decisión</li><li><Check size={16} /> Puntuación, tiempo y consecuencias visibles</li></ul>
        </Reveal>
      </section>

      <section className="ai-section">
        <Reveal className="ai-copy" direction="left">
          <div className="ai-orb"><BrainCircuit size={28} /><i /></div>
          <p className="section-kicker">Mentor especializado en POO</p>
          <h2>No entrega respuestas genéricas. Lee lo que hiciste.</h2>
          <p>Al terminar cada nivel, la IA analiza precisión, errores, intentos, tiempo y decisiones. El estudiante recibe un siguiente paso concreto; el docente, evidencia para acompañarlo.</p>
          <div className="ai-tags"><span>Solo POO</span><span>Por nivel</span><span>Accionable</span></div>
        </Reveal>
        <Reveal className="report-preview" direction="right">
          <div className="report-head"><span>REPORTE // NIVEL 03</span><strong>86%</strong></div>
          <h3>Comprendiste la protección del estado</h3>
          <p>Elegiste métodos públicos para regular la temperatura y cargar la batería sin reemplazar los componentes privados.</p>
          <div className="report-row positive"><span>FORTALEZA</span><p>Relacionas acciones físicas con responsabilidades de la clase.</p></div>
          <div className="report-row growth"><span>SIGUIENTE PASO</span><p>Explica con tus palabras por qué la validación debe vivir dentro del objeto.</p></div>
          <small><Sparkles size={13} /> Generado a partir de la sesión en las gafas</small>
        </Reveal>
      </section>

      <section className="roles-section" id="roles">
        <Reveal className="section-heading"><p className="section-kicker">Una sola experiencia, tres perspectivas</p><h2>Cada persona ve lo que necesita para avanzar.</h2></Reveal>
        <div className="role-grid">
          <Reveal className="role-card role-student"><Gamepad2 size={26} /><span>ESTUDIANTE</span><h3>Una ruta que se siente como una misión.</h3><p>Niveles, objetos desbloqueables, puntaje, ranking, avatar propio y recomendaciones claras.</p><Link href="/registrarse">Crear mi perfil <ArrowRight size={15} /></Link></Reveal>
          <Reveal className="role-card role-teacher" delay={0.08}><GraduationCap size={26} /><span>DOCENTE</span><h3>La evidencia detrás de cada interacción.</h3><p>Dominio por nivel, errores frecuentes, evolución del grupo y reportes individuales con contexto.</p><Link href="/iniciar-sesion">Abrir observatorio <ArrowRight size={15} /></Link></Reveal>
          <Reveal className="role-card role-admin" delay={0.16}><ShieldCheck size={26} /><span>ADMINISTRACIÓN</span><h3>Control del ecosistema sin perder identidad.</h3><p>Usuarios, roles, niveles y contenido desde una cabina coherente con el laboratorio.</p><Link href="/iniciar-sesion">Gestionar plataforma <ArrowRight size={15} /></Link></Reveal>
        </div>
      </section>

      <section className="final-cta">
        <Reveal className="final-cta-inner">
          <div><p className="section-kicker">La próxima idea está esperando</p><h2>Tu habitación puede convertirse en un laboratorio de programación.</h2><p>Crea una cuenta, personaliza tu identidad y continúa la experiencia dentro y fuera de las gafas.</p></div>
          <Link className="primary-button hero-primary" href="/registrarse">Comenzar ahora <ArrowRight size={18} /></Link>
        </Reveal>
      </section>

      <footer className="landing-footer"><div className="brand-lockup"><span className="brand-mark">A</span><span><strong>AlgoLab</strong><small>Ideas que puedes tocar</small></span></div><p>Programación orientada a objetos · Realidad mixta · Inteligencia pedagógica</p><span>© 2026</span></footer>
    </main>
  );
}
