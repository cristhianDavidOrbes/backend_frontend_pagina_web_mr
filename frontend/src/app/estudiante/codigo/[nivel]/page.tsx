"use client";

import { use, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  CheckCheck,
  X,
  Layers,
} from "lucide-react";
import { OOP_NIVELES, type LenguajeOOP } from "@/lib/oop-niveles";
import { ejecutarCodigo, preCargaPyodide, type ResultadoEjecucion } from "@/lib/judge0";
import { CodeEditor } from "@/components/code-editor";
import { CodeTerminal, type TerminalLine } from "@/components/code-terminal";
import { OopDocsPanel } from "@/components/oop-docs-panel";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";

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

function cargarProgresoLocal(): OopProgreso {
  if (typeof window === "undefined") return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OopProgreso;
  } catch {
    /* ignore */
  }
  return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
}

function guardarProgresoLocal(p: OopProgreso) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }
}

function normalizarSalida(texto: string): string {
  return texto.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function salidaCoincide(obtenida: string, esperada: string): boolean {
  if (esperada.includes("{") && esperada.includes("}")) return true;
  const norm1 = normalizarSalida(obtenida);
  const norm2 = normalizarSalida(esperada);
  return norm1 === norm2;
}

type PageParams = { nivel: string };

export default function NivelPage({ params }: { params: Promise<PageParams> }) {
  const { token } = useAuthSession();
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
  const [progreso, setProgreso] = useState<OopProgreso>(() => cargarProgresoLocal());
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
  const [modalAyudaAbierto, setModalAyudaAbierto] = useState(false);
  const [celebrando, setCelebrando] = useState(false);

  // Pre-cargar Pyodide en segundo plano al montar
  useEffect(() => {
    preCargaPyodide();
  }, []);

  // Sincronizar desde backend al cargar
  useEffect(() => {
    if (!token) return;
    apiRequest<ProgresoOopBackend>("/api/oop/progreso", token)
      .then((data) => {
        if (!data || !data.niveles) return;
        setProgreso((prev) => {
          const actualizados: Record<string, NivelProgreso> = { ...prev.niveles };
          data.niveles.forEach((n) => {
            actualizados[String(n.nivel)] = {
              completado: n.completado,
              puntos: n.puntaje,
              intentos: n.intentos,
              usoPista: n.usoPista,
            };
          });
          const nuevo = { ...prev, niveles: actualizados, puntajeTotal: data.puntajeOopTotal };
          guardarProgresoLocal(nuevo);
          return nuevo;
        });

        const np = data.niveles.find((n) => n.nivel === nivelId);
        if (np) {
          setIntentos(np.intentos);
          setCompletado(np.completado);
          setMostroPista(np.usoPista);
        }
      })
      .catch(() => {});
  }, [token, nivelId]);

  // Guardar en backend
  const sincronizarProgresoBackend = useCallback(
    async (completadoEstado: boolean, puntosGanados: number, intentosTotales: number, usoPistaEstado: boolean) => {
      if (!token) return;
      try {
        await apiRequest("/api/oop/progreso", token, {
          method: "POST",
          body: JSON.stringify({
            nivel: nivelId,
            lenguaje,
            completado: completadoEstado,
            puntaje: puntosGanados,
            intentos: intentosTotales,
            usoPista: usoPistaEstado,
          }),
        });
      } catch (err) {
        console.error("Error al guardar progreso OOP en el servidor:", err);
      }
    },
    [token, nivelId, lenguaje],
  );

  const ejecutar = useCallback(async () => {
    if (!nivel || ejecutando) return;

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
      if (!completado) {
        lines.push({
          type: "info",
          text: `Intento ${nuevosIntentos} de ${MAX_INTENTOS}`,
        });
        if (nuevosIntentos >= MAX_INTENTOS && !mostroPista) {
          setModalAyudaAbierto(true);
        }
      }
    } else {
      lines.push({ type: "output", text: resultado.salida });

      if (!completado) {
        const coincide = salidaCoincide(resultado.salida, nivel.practica.salidaEsperada);
        if (coincide) {
          const puntosGanados = mostroPista ? Math.floor(nivel.puntaje / 2) : nivel.puntaje;

          lines.push({
            type: "success",
            text: `✅ ¡Correcto! Ganaste ${puntosGanados} puntos para tu perfil global.`,
          });

          // Actualizar estado local y backend
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
          guardarProgresoLocal(nuevoProgreso);
          setCompletado(true);
          setCelebrando(true);
          setTimeout(() => setCelebrando(false), 3500);

          sincronizarProgresoBackend(true, puntosGanados, nuevosIntentos, mostroPista);
        } else {
          lines.push({
            type: "info",
            text: `Resultado esperado: "${normalizarSalida(nivel.practica.salidaEsperada)}"`,
          });
          lines.push({
            type: "info",
            text: `Intento ${nuevosIntentos} de ${MAX_INTENTOS}`,
          });

          if (nuevosIntentos >= MAX_INTENTOS && !mostroPista) {
            setModalAyudaAbierto(true);
          }
        }
      }
    }

    setTerminalLines(lines);

    // Persistir intentos si aún no está completado
    if (!completado) {
      const nuevoProgreso = { ...progreso };
      nuevoProgreso.niveles[String(nivelId)] = {
        ...nivelProgreso,
        intentos: nuevosIntentos,
        usoPista: mostroPista,
      };
      setProgreso(nuevoProgreso);
      guardarProgresoLocal(nuevoProgreso);
      sincronizarProgresoBackend(false, 0, nuevosIntentos, mostroPista);
    }
  }, [
    nivel,
    ejecutando,
    intentos,
    mostroPista,
    completado,
    codigo,
    lenguaje,
    progreso,
    nivelId,
    nivelProgreso,
    sincronizarProgresoBackend,
  ]);

  function limpiarEditor() {
    if (!nivel) return;
    const base = lenguaje === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava;
    setCodigo(base);
    setTerminalLines([]);
  }

  function aplicarPista() {
    if (!nivel) return;
    setMostroPista(true);
    setModalAyudaAbierto(false);

    const pista = lenguaje === "python" ? nivel.pistaPython : nivel.pistaJava;
    setCodigo(pista);
    setTerminalLines([
      { type: "info", text: "💡 Pista aplicada: se ha cargado un fragmento estructurado en el editor." },
      { type: "info", text: `⚠️ Al completar este subnivel con pista ganarás ${Math.floor(nivel.puntaje / 2)} pts (la mitad).` },
    ]);

    const nuevoProgreso = { ...progreso };
    nuevoProgreso.niveles[String(nivelId)] = { ...nivelProgreso, usoPista: true };
    setProgreso(nuevoProgreso);
    guardarProgresoLocal(nuevoProgreso);
    sincronizarProgresoBackend(completado, completado ? nivelProgreso.puntos : 0, intentos, true);
  }

  function aplicarSolucionCompleta() {
    if (!nivel) return;
    setModalAyudaAbierto(false);

    const sol = lenguaje === "python" ? nivel.solucionPython : nivel.solucionJava;
    setCodigo(sol);
    setTerminalLines([
      { type: "info", text: "🏳 Solución completa cargada en el editor. Puedes probarla y avanzar." },
      { type: "info", text: "ℹ️ Este subnivel queda completado con 0 puntos otorgados." },
    ]);

    const nuevoProgreso = { ...progreso };
    nuevoProgreso.niveles[String(nivelId)] = {
      completado: true,
      puntos: 0,
      intentos,
      usoPista: mostroPista,
    };
    setProgreso(nuevoProgreso);
    guardarProgresoLocal(nuevoProgreso);
    setCompletado(true);
    sincronizarProgresoBackend(true, 0, intentos, mostroPista);
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
          <p className="mt-4 text-slate-400">Subnivel no encontrado.</p>
          <Link href="/estudiante/codigo" className="oop-back-link mt-6 inline-flex">
            ← Volver al módulo OOP
          </Link>
        </div>
      </div>
    );
  }

  const prevNivel = OOP_NIVELES.find((n) => n.id === nivelId - 1);
  const nextNivel = OOP_NIVELES.find((n) => n.id === nivelId + 1);
  const ayudaHabilitada = intentos >= MAX_INTENTOS || mostroPista;

  return (
    <div className={`oop-level-page ${celebrando ? "oop-celebrating" : ""}`}>
      {/* Top bar */}
      <nav className="oop-level-nav">
        <div className="flex items-center gap-3">
          <Link href="/estudiante/codigo" className="oop-back-link">
            <ArrowLeft size={16} />
            Módulo OOP
          </Link>
          <span className="hidden text-xs text-slate-500 md:inline">|</span>
          <div className="hidden items-center gap-1.5 text-xs text-slate-300 md:flex">
            <Layers size={13} className="text-emerald-400" />
            <span className="font-semibold text-emerald-300">{nivel.moduloNombre}</span>
            <span>›</span>
            <span>Subnivel {nivel.subnivel}</span>
          </div>
        </div>

        {/* Sublevel stepper indicators */}
        <div className="hidden items-center gap-1 lg:flex">
          {OOP_NIVELES.map((n) => {
            const esActual = n.id === nivelId;
            const esCompletado = progreso.niveles[String(n.id)]?.completado;
            return (
              <button
                key={n.id}
                onClick={() => router.push(`/estudiante/codigo/${n.id}?lang=${lenguaje}`)}
                className={`flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold transition ${
                  esActual
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50"
                    : esCompletado
                    ? "bg-white/10 text-emerald-400 hover:bg-white/15"
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
                title={`${n.titulo} (Subnivel ${n.subnivel})`}
              >
                <span>{n.subnivel}</span>
                {esCompletado && <span className="text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>

        {/* Center: Language toggle */}
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

        {/* Right: Help button (available after 6 attempts) + Level arrows */}
        <div className="flex items-center gap-2">
          {ayudaHabilitada && !completado && (
            <button
              onClick={() => setModalAyudaAbierto(true)}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-500/40 transition hover:bg-amber-500/30"
              title="Opciones de ayuda desbloqueadas tras 6 intentos"
            >
              <Lightbulb size={14} className="animate-pulse" />
              <span>{mostroPista ? "Pista activa (½ pts)" : "🆘 Opciones de Ayuda"}</span>
            </button>
          )}

          <div className="oop-level-nav-arrows">
            {prevNivel && (
              <button
                className="oop-nav-arrow"
                onClick={() => router.push(`/estudiante/codigo/${prevNivel.id}?lang=${lenguaje}`)}
                title={`Subnivel anterior: ${prevNivel.subnivel}`}
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <span className="oop-nav-current font-mono text-xs font-bold text-slate-200">
              {nivel.subnivel} / 4.2
            </span>
            {nextNivel && (
              <button
                className="oop-nav-arrow"
                onClick={() => router.push(`/estudiante/codigo/${nextNivel.id}?lang=${lenguaje}`)}
                title={`Siguiente subnivel: ${nextNivel.subnivel}`}
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main split layout */}
      <div className="oop-split-layout">
        {/* Left: Editor + Terminal */}
        <div className="oop-left-panel">
          {/* Editor Header & Container */}
          <div className="oop-editor-container">
            <div className="oop-editor-header">
              <div className="flex items-center gap-2">
                <div className="oop-editor-lang-badge">
                  {lenguaje === "python" ? "🐍 Python (Limpio)" : "☕ Java (Main)"}
                </div>
                <span className="text-xs text-slate-400">
                  {intentos > 0 ? `Intentos: ${intentos}/${MAX_INTENTOS}` : "Código limpio para practicar"}
                </span>
              </div>
              <div className="oop-editor-actions">
                <button
                  className="oop-reset-btn"
                  onClick={limpiarEditor}
                  disabled={ejecutando}
                  title="Restablecer plantilla inicial"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  className="oop-run-btn"
                  onClick={ejecutar}
                  disabled={ejecutando}
                  title="Ejecutar código localmente"
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
            onVerPista={() => setModalAyudaAbierto(true)}
            onVerSolucion={() => setModalAyudaAbierto(true)}
            mostroPista={mostroPista}
          />
        </div>
      </div>

      {/* ─── MODAL DE OPCIONES DE AYUDA (6 INTENTOS) ─── */}
      {modalAyudaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setModalAyudaAbierto(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-300">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Opciones de Ayuda (6 Intentos)</h3>
                <p className="text-xs text-slate-300">
                  Has alcanzado {intentos} intentos. Elige cómo deseas continuar:
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Opción 1: Pista */}
              <div
                onClick={aplicarPista}
                className="group cursor-pointer rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 transition hover:border-amber-400 hover:bg-amber-500/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Lightbulb size={18} />
                    <span>Opción 1: Obtener Pista (Fragmento de código)</span>
                  </div>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                    +{Math.floor(nivel.puntaje / 2)} pts
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  Carga en el editor la estructura base guiada con comentarios para que completes lo que falta.
                  Recibirás la <strong>mitad de los puntos ({Math.floor(nivel.puntaje / 2)} pts)</strong> al completarlo.
                </p>
              </div>

              {/* Opción 2: Completar código */}
              <div
                onClick={aplicarSolucionCompleta}
                className="group cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-200">
                    <CheckCheck size={18} />
                    <span>Opción 2: Completar Código (Solución completa)</span>
                  </div>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-400">
                    0 pts
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  Inserta la solución final funcional en el editor y marca el subnivel como superado para desbloquear el
                  siguiente. <strong>No otorgará puntos adicionales</strong>.
                </p>
              </div>
            </div>

            {/* Footer con opción de seguir intentando */}
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <p className="text-[11px] text-slate-400">
                El botón de ayuda seguirá disponible arriba si cambias de opinión.
              </p>
              <button
                onClick={() => setModalAyudaAbierto(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15"
              >
                Seguir intentando solo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration overlay */}
      {celebrando && (
        <div className="oop-celebration">
          <div className="oop-celebration-card">
            <p className="text-5xl">🎉</p>
            <h2 className="oop-celebration-title">¡Subnivel Superado!</h2>
            <p className="oop-celebration-pts">
              +{mostroPista ? Math.floor(nivel.puntaje / 2) : nivel.puntaje} puntos guardados
            </p>
            <p className="text-xs text-slate-300">Sumados a tu puntaje global en AlgoLab</p>
            {nextNivel && (
              <Link
                href={`/estudiante/codigo/${nextNivel.id}?lang=${lenguaje}`}
                className="oop-next-btn"
              >
                Siguiente: Subnivel {nextNivel.subnivel} →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
