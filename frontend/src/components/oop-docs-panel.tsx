"use client";

import type { MiniNivel, LenguajeOOP } from "@/lib/oop-niveles";
import { BookOpen, Sparkles } from "lucide-react";

type Props = {
  nivel: MiniNivel;
  lenguaje: LenguajeOOP;
  intentos: number;
  maxIntentos: number;
  completado: boolean;
  onVerPista: () => void;
  onVerSolucion: () => void;
  mostroPista: boolean;
};

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="oop-code-block overflow-x-auto">
      <code>{code}</code>
    </pre>
  );
}

function MarkdownRenderer({ text }: { text: string }) {
  // Simple markdown: **bold**, bullet lists, inline code `code`
  const lines = text.split("\n");
  return (
    <div className="oop-markdown">
      {lines.map((line, i) => {
        if (line.startsWith("- ")) {
          const content = parseInline(line.slice(2));
          return (
            <div key={i} className="oop-list-item">
              <span className="oop-bullet">▸</span>
              <span dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          );
        }
        if (line.trim() === "") return <div key={i} className="oop-spacer" />;
        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
        );
      })}
    </div>
  );
}

function parseInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code class='oop-inline-code'>$1</code>");
}

export function OopDocsPanel({
  nivel,
  lenguaje,
  intentos,
  maxIntentos,
  completado,
  onVerPista,
  onVerSolucion,
  mostroPista,
}: Props) {
  const ejemploCodigo =
    lenguaje === "python" ? nivel.docs.ejemploPython : nivel.docs.ejemploJava;
  const glosario =
    lenguaje === "python" ? nivel.docs.glosarioPython : nivel.docs.glosarioJava;
  const intentosRestantes = maxIntentos - intentos;
  const agotadoIntentos = intentos >= maxIntentos;

  return (
    <div className="oop-docs-panel flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="oop-docs-header flex-shrink-0">
        <span className="oop-docs-emoji">{nivel.emoji}</span>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-300">
              Subnivel {nivel.subnivel}
            </span>
            <p className="section-kicker">{nivel.concepto}</p>
          </div>
          <h2 className="oop-docs-title">{nivel.titulo}</h2>
        </div>
        <div className="oop-pts-badge ml-auto">
          <span>⭐</span>
          <span>{nivel.puntaje} pts</span>
        </div>
      </div>

      {/* Docs content (Scrollable vertically and horizontally) */}
      <div className="oop-docs-content flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6">
        {/* Intro */}
        <p className="oop-intro">{nivel.docs.intro}</p>

        {/* Concept */}
        <div className="oop-section">
          <h3 className="oop-section-title flex items-center gap-1.5">
            <BookOpen size={14} className="text-emerald-400" />
            📖 Concepto clave
          </h3>
          <MarkdownRenderer text={nivel.docs.concepto} />
        </div>

        {/* Example */}
        <div className="oop-section">
          <h3 className="oop-section-title">
            💻 Ejemplo en {lenguaje === "python" ? "Python 🐍" : "Java ☕"}
          </h3>
          <CodeBlock code={ejemploCodigo} />
        </div>

        {/* 🔍 Syntax Breakdown & Explanations (Desglose de sintaxis paso a paso) */}
        {glosario && glosario.length > 0 && (
          <div className="oop-section">
            <h3 className="oop-section-title flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-400" />
              🔍 ¿Qué significa cada parte del código?
            </h3>
            <div className="space-y-2">
              {glosario.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-relaxed transition hover:border-cyan-500/30 hover:bg-cyan-500/5"
                >
                  <div className="font-mono font-bold text-cyan-300">
                    {item.termino}
                  </div>
                  <p className="mt-1 text-slate-300">{item.explicacion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip */}
        <div className="oop-tip-box">
          <p>{nivel.docs.tip}</p>
        </div>

        {/* Divider */}
        <hr className="oop-divider" />

        {/* Practice */}
        <div className="oop-section">
          <h3 className="oop-section-title">🎯 Tu práctica</h3>
          <div className="oop-practica-box">
            <MarkdownRenderer text={nivel.practica.enunciado} />
          </div>
        </div>

        {/* Expected output */}
        <div className="oop-section">
          <h3 className="oop-section-title">✅ Salida esperada</h3>
          <pre className="oop-expected-output overflow-x-auto">{nivel.practica.salidaEsperada}</pre>
        </div>

        {/* Attempt counter */}
        {!completado && (
          <div className="oop-attempts">
            <div className="oop-attempts-bar">
              {Array.from({ length: maxIntentos }, (_, i) => (
                <div
                  key={i}
                  className={`oop-attempt-dot ${i < intentos ? "used" : "available"}`}
                />
              ))}
            </div>
            <p className="oop-attempts-text">
              {intentos === 0
                ? `Tienes ${maxIntentos} intentos antes de activar las opciones de ayuda`
                : agotadoIntentos
                ? "6 intentos alcanzados: Botón de ayuda disponible arriba"
                : `${intentosRestantes} intento${intentosRestantes !== 1 ? "s" : ""} restante${intentosRestantes !== 1 ? "s" : ""}`}
            </p>
          </div>
        )}

        {/* Hint/Solution buttons when attempts exhausted */}
        {agotadoIntentos && !completado && (
          <div className="oop-help-section">
            <p className="oop-help-title">¿Necesitas ayuda? Elige una opción:</p>
            <div className="oop-help-buttons">
              <button
                className="oop-hint-btn"
                onClick={onVerPista}
                disabled={mostroPista}
              >
                💡 {mostroPista ? "Pista activa (½ pts)" : "Ver pista (½ pts)"}
              </button>
              <button
                className="oop-solution-btn"
                onClick={onVerSolucion}
              >
                🏳 Mostrar solución (sin pts)
              </button>
            </div>
            {mostroPista && (
              <p className="oop-hint-note">
                Completa el nivel con la pista y ganarás {Math.floor(nivel.puntaje / 2)} pts.
              </p>
            )}
          </div>
        )}

        {/* Completed badge */}
        {completado && (
          <div className="oop-completed-badge">
            <span>🎉</span>
            <span>¡Subnivel completado con éxito!</span>
          </div>
        )}
      </div>
    </div>
  );
}
