import Link from "next/link";

const pilares = [
  ["01", "Clases y objetos", "Comprende cómo una idea se convierte en una estructura que puedes manipular."],
  ["02", "Encapsulamiento", "Protege los datos y aprende a interactuar mediante acciones controladas."],
  ["03", "Abstracción", "Separa lo esencial de la complejidad para resolver el problema correcto."],
  ["04", "Herencia y polimorfismo", "Reutiliza comportamientos y crea soluciones flexibles."],
];

export default function Home() {
  return (
    <main className="landing-shell min-h-screen overflow-hidden text-slate-100">
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link className="flex items-center gap-3" href="/"><span className="brand-mark">A</span><span><strong className="block tracking-tight">AlgoLab</strong><small className="text-[9px] uppercase tracking-[.24em] text-emerald-300">Aprender haciendo</small></span></Link>
        <nav className="flex items-center gap-2"><Link className="ghost-button" href="/iniciar-sesion">Ingresar</Link><Link className="primary-button hidden items-center sm:inline-flex" href="/registrarse">Crear cuenta</Link></nav>
      </header>

      <section className="relative mx-auto grid min-h-[760px] w-full max-w-7xl items-center gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:pt-4">
        <div className="relative z-10">
          <div className="landing-badge"><span /> Realidad mixta + inteligencia pedagógica</div>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl lg:text-7xl">La programación orientada a objetos, <em>en tus manos.</em></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">AlgoLab transforma conceptos de POO en experiencias de realidad mixta. Practica, recibe retroalimentación especializada y observa tu evolución nivel por nivel.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link className="primary-button inline-flex items-center" href="/registrarse">Comenzar la ruta <span className="ml-3">→</span></Link><Link className="ghost-button" href="/iniciar-sesion">Continuar mi progreso</Link></div>
          <div className="mt-10 flex flex-wrap gap-8 border-t border-white/10 pt-6"><Stat value="6" label="niveles progresivos" /><Stat value="POO" label="enfoque exclusivo" /><Stat value="IA" label="reporte por nivel" /></div>
        </div>

        <div className="lab-visual" aria-label="Visualización de los conceptos de AlgoLab">
          <div className="visual-grid" /><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="visual-core"><span>class</span><strong>Objeto</strong><small>{"{ método(); }"}</small></div>
          <div className="concept-node node-a"><span>−</span><p>atributo</p></div><div className="concept-node node-b"><span>+</span><p>método</p></div><div className="concept-node node-c"><span>◇</span><p>instancia</p></div>
          <div className="visual-caption"><span className="status-dot" /><p><strong>Entorno sincronizado</strong><small>Web · Gafas · IA</small></p></div>
        </div>
      </section>

      <section className="relative border-t border-white/10 bg-[#07110f]/90 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl"><p className="section-kicker">Metodología</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><h2 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Una ruta pensada para comprender, practicar y mejorar.</h2><p className="max-w-md text-sm leading-6 text-slate-500">Cada acción en las gafas se convierte en evidencia. Tu panel web y el de tu docente muestran el resultado sin perder el contexto pedagógico.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{pilares.map(([numero, titulo, texto]) => <article className="landing-feature" key={numero}><span>{numero}</span><h3>{titulo}</h3><p>{texto}</p></article>)}</div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8"><div className="landing-cta mx-auto max-w-7xl"><div><p className="section-kicker">Tu siguiente nivel empieza aquí</p><h2 className="mt-3 text-3xl font-semibold">Crea tu perfil y llévalo también a las gafas.</h2></div><Link className="primary-button inline-flex items-center" href="/registrarse">Entrar a AlgoLab →</Link></div></section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) { return <div><strong className="font-mono text-xl text-emerald-300">{value}</strong><small className="ml-2 text-xs text-slate-500">{label}</small></div>; }
