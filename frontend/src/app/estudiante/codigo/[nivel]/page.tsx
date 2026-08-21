"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { OOP_NIVELES } from "@/lib/oop-niveles";
import type { LenguajeOOP } from "@/lib/oop-niveles";
import { ejecutarCodigo, preCargaPyodide } from "@/lib/judge0";
import type { ResultadoEjecucion } from "@/lib/judge0";
import { CodeEditor } from "@/components/code-editor";
import { CodeTerminal } from "@/components/code-terminal";
import type { TerminalLine } from "@/components/code-terminal";
import { OopDocsPanel } from "@/components/oop-docs-panel";

const STORAGE_KEY = "oop_progreso";
const MAX_INTENTOS = 6;

type NivelProgreso = {
  completado: boolean;
  puntos: number;
  intentos: number;
  usoPista: boolean;
};

type OopProgreso = {
  lenguaje: LenguajeOOP;
  niveles: Record<string, NivelProgreso>;
  puntajeTotal: number;
};

function cargarProgreso(): OopProgreso {
  if (typeof window === "undefined") return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OopProgreso;
  } catch { /* ignore */ }
  return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
}

function guardarProgreso(p: OopProgreso) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }
}

function normalizarSalida(texto: string): string {
  return texto.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function salidaCoincide(obtenida: string, esperada: string): boolean {
  // Para practicas con {} en la salida esperada (indicadores de variable), no hacer match exacto
  if (esperada.includes("{") && esperada.includes("}")) return true; // nivel 1 flexible
  const norm1 = normalizarSalida(obtenida);
  const norm2 = normalizarSalida(esperada);
  return norm1 === norm2;
}

type PageParams = { nivel: string };

export default function NivelPage({ params }: { params: Promise<PageParams> }) {
  const { nivel: nivelParam } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const nivelId = parseInt(nivelParam, 10);
  const nivel = OOP_NIVELES.find((n) => n.id === nivelId);

  const [lenguaje, setLenguaje] = useState<LenguajeOOP>(
    (searchParams.get("lang") as LenguajeOOP) ?? "python",
  );
  const [codigo, setCodigo] = useState(() => {
    if (!nivel) return "";
    const lang = (searchParams.get("lang") as LenguajeOOP) ?? "python";
    return lang === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava;
  });
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [ejecutando, setEjecutando] = useState(false);
  const [tiempoMs, setTiempoMs] = useState<number | null>(null);

  // Progreso
  const [progreso, setProgreso] = useState<OopProgreso>(() => cargarProgreso());
  const nivelProgreso: NivelProgreso = useMemo(() => {
    return progreso.niveles[String(nivelId)] ?? {
      completado: false,
      puntos: 0,
      intentos: 0,
      usoPista: false,
    };
  }, [progreso.niveles, nivelId]);

  const [intentos, setIntentos] = useState(() => nivelProgreso.intentos);
  const [completado, setCompletado] = useState(() => nivelProgreso.completado);
  const [mostroPista, setMostroPista] = useState(() => nivelProgreso.usoPista);
  const [mostroSolucion, setMostroSolucion] = useState(false);
  const [celebrando, setCelebrando] = useState(false);

  // Pre-cargar Pyodide en segundo plano al montar (solo para Python)
  useEffect(() => {
    preCargaPyodide();
  }, []);

  const ejecutar = useCallback(async () => {
    if (!nivel || ejecutando) return;
    if (intentos >= MAX_INTENTOS && !mostroPista) return; // agotado sin pista

    setEjecutando(true);
    setTerminalLines([
      { type: "info", text: `Ejecutando código ${lenguaje === "python" ? "Python" : "Java"}…` },
      { type: "pending" },
    ]);
    setTiempoMs(null);

    const nuevosIntentos = completado ? intentos : intentos + 1;
    if (!completado) setIntentos(nuevosIntentos);

    let resultado: ResultadoEjecucion;
    try {
      resultado = await ejecutarCodigo(codigo, lenguaje);
    } catch (e) {
      resultado = { salida: "", error: e instanceof Error ? e.message : "Error de red", exitoso: false };
    }

    setEjecutando(false);
    setTiempoMs(resultado.tiempoMs ?? null);

    const lines: TerminalLine[] = [];

    if (resultado.error) {
      lines.push({ type: "error", text: resultado.error });
    } else {
      lines.push({ type: "output", text: resultado.salida });

      if (!completado) {
        const coincide = salidaCoincide(resultado.salida, nivel.practica.salidaEsperada);
        if (coincide) {
          // Success!
          const puntosGanados = mostroPista
            ? Math.floor(nivel.puntaje / 2)
            : nivel.puntaje;

          lines.push({
            type: "success",
            text: `✅ ¡Correcto! Ganaste ${puntosGanados} puntos.`,
          });

          // Save progress
          const nuevoProgreso = { ...progreso };
          nuevoProgreso.niveles[String(nivelId)] = {
            completado: true,
            puntos: puntosGanados,
            intentos: nuevosIntentos,
            usoPista: mostroPista,
          };
          nuevoProgreso.puntajeTotal = Object.values(nuevoProgreso.niveles).reduce(
            (sum, n) => sum + n.puntos,
            0,
          );
          setProgreso(nuevoProgreso);
          guardarProgreso(nuevoProgreso);
          setCompletado(true);
          setCelebrando(true);
          setTimeout(() => setCelebrando(false), 3000);
        } else if (nuevosIntentos >= MAX_INTENTOS) {
          lines.push({
            type: "error",
            text: `❌ Intentos agotados. Revisa la sección de ayuda en la documentación →`,
          });
        } else {
          lines.push({
            type: "info",
            text: `Resultado esperado: "${normalizarSalida(nivel.practica.salidaEsperada)}"`,
          });
          lines.push({
            type: "info",
            text: `Intentos usados: ${nuevosIntentos}/${MAX_INTENTOS}`,
          });
        }
      }
    }

    setTerminalLines(lines);

    // Persist attempt count
    if (!completado) {
      const nuevoProgreso = { ...progreso };
      nuevoProgreso.niveles[String(nivelId)] = {
        ...nivelProgreso,
        intentos: nuevosIntentos,
        usoPista: mostroPista,
      };
      setProgreso(nuevoProgreso);
      guardarProgreso(nuevoProgreso);
    }
  }, [nivel, ejecutando, intentos, mostroPista, completado, codigo, lenguaje, progreso, nivelId, nivelProgreso]);

  function limpiarEditor() {
    if (!nivel) return;
    const base = lenguaje === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava;
    setCodigo(base);
    setTerminalLines([]);
  }

  function verPista() {
    if (!nivel) return;
    setMostroPista(true);
    const pista = lenguaje === "python" ? nivel.solucionPython : nivel.solucionJava;
    // Show first half of solution as hint
    const lines = pista.split("\n");
    const halfLines = Math.ceil(lines.length / 2);
    const fragmento = lines.slice(0, halfLines).join("\n") + "\n# ... (completa el resto)";
    setCodigo(fragmento);
    setTerminalLines([
      { type: "info", text: "💡 Pista activada: se ha cargado un fragmento de la solución. Complétala y ejecuta." },
      { type: "info", text: `⚠️ Completar con pista dará ${Math.floor(nivel.puntaje / 2)} pts (la mitad).` },
    ]);

    const nuevoProgreso = { ...progreso };
    nuevoProgreso.niveles[String(nivelId)] = { ...nivelProgreso, usoPista: true };
    setProgreso(nuevoProgreso);
    guardarProgreso(nuevoProgreso);
  }

  function verSolucion() {
    if (!nivel) return;
    setMostroSolucion(true);
    const sol = lenguaje === "python" ? nivel.solucionPython : nivel.solucionJava;
    setCodigo(sol);
    setTerminalLines([
      { type: "info", text: "🏳 Solución cargada. Puedes ejecutarla para ver el resultado, pero no recibirás puntos." },
    ]);

    // Mark as completed with 0 points
    const nuevoProgreso = { ...progreso };
    nuevoProgreso.niveles[String(nivelId)] = {
      completado: true,
      puntos: 0,
      intentos,
      usoPista: mostroPista,
    };
    setProgreso(nuevoProgreso);
    guardarProgreso(nuevoProgreso);
    setCompletado(true);
  }

  function cambiarLenguaje(lang: LenguajeOOP) {
    setLenguaje(lang);
    setTerminalLines([]);
    if (nivel) {
      setCodigo(lang === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava);
    }
  }

  if (!nivel) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <div>
          <p className="text-4xl">🤔</p>
          <p className="mt-4 text-slate-400">Nivel no encontrado.</p>
          <Link href="/estudiante/codigo" className="oop-back-link mt-6 inline-flex">
            ← Volver al módulo
          </Link>
        </div>
      </div>
    );
  }

  const prevNivel = OOP_NIVELES.find((n) => n.id === nivelId - 1);
  const nextNivel = OOP_NIVELES.find((n) => n.id === nivelId + 1);
  const agotadoIntentos = intentos >= MAX_INTENTOS && !completado;

  return (
    <div className={`oop-level-page ${celebrando ? "oop-celebrating" : ""}`}>
      {/* Top bar */}
      <nav className="oop-level-nav">
        <Link href="/estudiante/codigo" className="oop-back-link">
          <ArrowLeft size={16} />
          Módulo OOP
        </Link>

        {/* Language tabs */}
        <div className="oop-lang-tabs-mini">
          <button
            className={`oop-lang-tab-mini ${lenguaje === "python" ? "active" : ""}`}
            onClick={() => cambiarLenguaje("python")}
          >
            🐍 Python
          </button>
          <button
            className={`oop-lang-tab-mini ${lenguaje === "java" ? "active" : ""}`}
            onClick={() => cambiarLenguaje("java")}
          >
            ☕ Java
          </button>
        </div>

        {/* Level navigation */}
        <div className="oop-level-nav-arrows">
          {prevNivel ? (
            <button
              className="oop-nav-arrow"
              onClick={() => router.push(`/estudiante/codigo/${prevNivel.id}?lang=${lenguaje}`)}
            >
              <ChevronLeft size={16} />
              Nivel {prevNivel.id}
            </button>
          ) : <span />}
          <span className="oop-nav-current">
            {nivel.emoji} Nivel {nivel.id}/{OOP_NIVELES.length}
          </span>
          {nextNivel ? (
            <button
              className="oop-nav-arrow"
              onClick={() => router.push(`/estudiante/codigo/${nextNivel.id}?lang=${lenguaje}`)}
            >
              Nivel {nextNivel.id}
              <ChevronRight size={16} />
            </button>
          ) : <span />}
        </div>
      </nav>

      {/* Main split layout */}
      <div className="oop-split-layout">
        {/* Left: Editor + Terminal */}
        <div className="oop-left-panel">
          {/* Editor */}
          <div className="oop-editor-container">
            <div className="oop-editor-header">
              <div className="oop-editor-lang-badge">
                {lenguaje === "python" ? "🐍 Python" : "☕ Java"}
              </div>
              <div className="oop-editor-actions">
                <button
                  className="oop-reset-btn"
                  onClick={limpiarEditor}
                  disabled={ejecutando}
                  title="Restablecer código base"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  className="oop-run-btn"
                  onClick={ejecutar}
                  disabled={ejecutando || (agotadoIntentos && !mostroPista && !mostroSolucion)}
                  title="Ejecutar código"
                >
                  {ejecutando ? (
                    <>
                      <span className="terminal-spinner" />
                      Ejecutando…
                    </>
                  ) : (
                    <>
                      <Play size={14} fill="currentColor" />
                      Ejecutar
                    </>
                  )}
                </button>
              </div>
            </div>
            <CodeEditor
              codigo={codigo}
              onChange={setCodigo}
              lenguaje={lenguaje}
              disabled={ejecutando}
            />
          </div>

          {/* Terminal */}
          <CodeTerminal lines={terminalLines} tiempoMs={tiempoMs} />
        </div>

        {/* Right: Docs + Practice */}
        <div className="oop-right-panel">
          <OopDocsPanel
            nivel={nivel}
            lenguaje={lenguaje}
            intentos={intentos}
            maxIntentos={MAX_INTENTOS}
            completado={completado}
            onVerPista={verPista}
            onVerSolucion={verSolucion}
            mostroPista={mostroPista}
          />
        </div>
      </div>

      {/* Celebration overlay */}
      {celebrando && (
        <div className="oop-celebration">
          <div className="oop-celebration-card">
            <p className="text-5xl">🎉</p>
            <h2 className="oop-celebration-title">¡Nivel Completado!</h2>
            <p className="oop-celebration-pts">
              +{mostroPista ? Math.floor(nivel.puntaje / 2) : nivel.puntaje} puntos
            </p>
            {nextNivel && (
              <Link
                href={`/estudiante/codigo/${nextNivel.id}?lang=${lenguaje}`}
                className="oop-next-btn"
              >
                Siguiente nivel → {nextNivel.emoji} {nextNivel.titulo}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
