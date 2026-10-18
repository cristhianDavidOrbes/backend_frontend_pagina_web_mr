"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, CheckCircle2, Code2, Copy, Lightbulb, Target, Trophy } from "lucide-react";
import Link from "next/link";
import type { MiniNivel, LenguajeOOP } from "@/lib/oop-niveles";
import { LanguageIcon } from "@/components/language-icon";
import { LevelObject } from "@/components/level-object";
import styles from "@/app/estudiante/codigo/poo-learning.module.css";

type Props = {
  nivel: MiniNivel;
  lenguaje: LenguajeOOP;
  intentos: number;
  maxIntentos: number;
  completado: boolean;
  onVerPista: () => void;
  onVerSolucion: () => void;
  mostroPista: boolean;
  nextNivelId?: number;
  nextNivelSubnivel?: string;
};

// React text preserves <, > and single-* emphasis without injecting course HTML.
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function CourseText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      const first = index;
      do {
        items.push(<li key={index}>{inline(lines[index].trim().slice(2))}</li>);
        index++;
      } while (index < lines.length && lines[index].trim().startsWith("- "));
      index--;
      blocks.push(<ul key={first}>{items}</ul>);
    } else { blocks.push(<p key={index}>{inline(line)}</p>); }
  }
  return <div className={styles.prose}>{blocks}</div>;
}

function Example({ code, lenguaje }: { code: string; lenguaje: LenguajeOOP }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(code); setStatus("copied"); }
    catch { setStatus("error"); }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), 3000);
  }
  return <div className={styles.codeExample}>
    <div className={styles.codeBar}>
      <span><LanguageIcon lenguaje={lenguaje} size={16} />{lenguaje === "python" ? "ejemplo.py" : "Main.java"}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copy()} aria-label="Copiar ejemplo completo">
        {status === "copied" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
        {status === "copied" ? "Copiado" : "Copiar"}
      </button>
    </div>
    <pre className={styles.codeBlock} tabIndex={0} aria-label="Ejemplo de código completo"><code>{code.split(/(#[^\n]*|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:public|private|protected|class|static|void|String|int|double|float|boolean|return|def|self|print|True|False|true|false|new|extends|super|implements|abstract)\b|\b\d+(?:\.\d+)?\b)/g).map((token, index) => {
      const tone = /^(#|\/\/)/.test(token) ? styles.syntaxComment : /^["']/.test(token) ? styles.syntaxString : /^\d/.test(token) ? styles.syntaxNumber : /^(public|private|protected|class|static|void|String|int|double|float|boolean|return|def|self|print|True|False|true|false|new|extends|super|implements|abstract)$/.test(token) ? styles.syntaxKeyword : undefined;
      return <span className={tone} key={index}>{token}</span>;
    })}</code></pre>
    <span className="sr-only" role="status">{status === "copied" ? "Ejemplo copiado" : status === "error" ? "No se pudo copiar. Selecciona el código y cópialo manualmente." : ""}</span>
    {status === "error" && <p className="notice notice-warning">No se pudo copiar. Selecciona el código y cópialo manualmente.</p>}
  </div>;
}

export function OopDocsPanel({ nivel, lenguaje, intentos, maxIntentos, completado, onVerPista, onVerSolucion, mostroPista, nextNivelId, nextNivelSubnivel }: Props) {
  const code = lenguaje === "python" ? nivel.docs.ejemploPython : nivel.docs.ejemploJava;
  const glossary = lenguaje === "python" ? nivel.docs.glosarioPython : nivel.docs.glosarioJava;
  const exhausted = intentos >= maxIntentos;
  return <article className={styles.guide} aria-label={`Guía continua: ${nivel.titulo}`}>
    <header className={styles.guideHeader}>
      <span className={styles.guideRobot} aria-hidden="true"><LevelObject objeto="robot" size={64} /></span>
      <div><h2>{nivel.titulo}</h2><p>Reto {nivel.subnivel} · {nivel.concepto}</p></div>
      <span className={styles.guidePoints}><Trophy size={16} aria-hidden="true" />Hasta {nivel.puntaje} pts</span>
    </header>
    <div className={styles.guideContent} tabIndex={0} aria-label="Contenido de la guía">
      <p>{nivel.docs.intro}</p>
      <section className={styles.guideSection}><h3><BookOpen size={20} aria-hidden="true" />Entiende la idea</h3><CourseText text={nivel.docs.concepto} /></section>
      <section className={styles.guideSection}><h3><Code2 size={20} aria-hidden="true" />Mira el ejemplo completo</h3><Example key={`${nivel.id}:${lenguaje}`} code={code} lenguaje={lenguaje} /></section>
      {glossary.length > 0 && <section className={styles.guideSection}>
        <h3>Cómo funciona ese código</h3>
        <dl className={styles.glossary}>{glossary.map((item, index) => <div key={index}><dt>{item.termino}</dt><dd>{item.explicacion}</dd></div>)}</dl>
      </section>}
      <div className={styles.tip}><Lightbulb size={20} aria-hidden="true" /><p>{nivel.docs.tip}</p></div>
      <section className={`${styles.guideSection} ${styles.practice}`}>
        <h3><Target size={20} aria-hidden="true" />Ahora te toca a ti</h3>
        <div className={styles.practiceCompanion}><span aria-hidden="true"><LevelObject objeto="robot" size={52} /></span><p><strong>Tu idea, tu código.</strong> Prueba, cambia y descubre qué puedes construir.</p></div>
        <p>Resuelve este reto en el editor y pulsa «Ejecutar» para comprobarlo. Al superarlo, abres el siguiente.</p>
        <CourseText text={nivel.practica.enunciado} />
        <p className={styles.outputLabel}>Resultado de referencia</p>
        <pre className={styles.expectedOutput}>{nivel.practica.salidaEsperada}</pre>
        <p className="muted text-sm">Puedes cambiar valores y nombres mientras cumplas los conceptos pedidos.</p>
      </section>
      {!completado && <section className={styles.help} aria-label="Intentos y ayuda">
        <h3>Prueba, aprende y vuelve a intentar</h3>
        <div className={styles.attempts} aria-hidden="true">{Array.from({ length: maxIntentos }, (_, index) => <i key={index} data-used={index < intentos} />)}</div>
        <p>{exhausted ? "Ya puedes elegir cómo recibir ayuda." : `${intentos} de ${maxIntentos} intentos usados. La ayuda se habilita después de ${maxIntentos} intentos.`}</p>
        {exhausted && <>
          <div className={styles.helpActions}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onVerPista} disabled={mostroPista}><Lightbulb size={18} aria-hidden="true" />{mostroPista ? "Pista activa" : "Ver pista · mitad de puntos"}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onVerSolucion}>Ver solución · sin puntos</button>
          </div>
          {mostroPista && <p className="muted text-sm mt-3">Con la pista puedes completar el reto y ganar {Math.floor(nivel.puntaje / 2)} puntos.</p>}
        </>}
      </section>}
      {completado && <section className={styles.success} role="status">
        <h3><CheckCircle2 size={22} aria-hidden="true" />¡Reto superado!</h3>
        <p>{nextNivelId ? "Un paso más en tu camino. Tu siguiente reto ya está disponible." : "¡Terminaste los ocho retos! Puedes volver a practicar o explorar el otro lenguaje."}</p>
        <Link href={nextNivelId ? `/estudiante/codigo/${nextNivelId}?lang=${lenguaje}` : "/estudiante/codigo"} className="btn btn-primary btn-sm">
          {nextNivelId ? `Continuar al reto ${nextNivelSubnivel}` : "Ver mi camino completo"}<ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>}
    </div>
  </article>;
}
