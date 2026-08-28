"use client";

import { use, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  RotateCcw,
  HelpCircle,
  Lightbulb,
  CheckCheck,
  X,
  Code2,
  BookOpen,
  TerminalSquare,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { OOP_NIVELES, type LenguajeOOP } from "@/lib/oop-niveles";
import { validarEstructuraCodigo } from "@/lib/oop-validador";
import {
  ejecutarCodigo,
  obtenerLineaError,
  preCargaPyodide,
  type ResultadoEjecucion,
} from "@/lib/judge0";
import { CodeEditor, type ModoEditor } from "@/components/code-editor";
import { CodeTerminal, type TerminalLine } from "@/components/code-terminal";
import { OopDocsPanel } from "@/components/oop-docs-panel";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";
import {
  asegurarRecuperacionLocal,
  encolarCambioSync,
  type OopNivelSync,
  type OopSyncItem,
  type OopSyncPayload,
} from "@/lib/oop-sync-queue";
import styles from "../programar-poo.module.css";

const STORAGE_KEY = "oop_progreso";
const SYNC_QUEUE_KEY = "oop_progreso_sync";
const STORAGE_MODO_KEY = "oop_editor_modo";
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

function claveProgreso(usuarioId?: number) {
  return `${STORAGE_KEY}:${usuarioId ?? "anonimo"}`;
}

function claveBorradorCodigo(usuarioId: number | undefined, nivelId: number, lang: LenguajeOOP) {
  return `oop_draft:${usuarioId ?? "anonimo"}:${nivelId}:${lang}`;
}

function cargarBorrador(usuarioId: number | undefined, nivelId: number, lang: LenguajeOOP, codigoBase: string): string {
  if (typeof window === "undefined") return codigoBase;
  try {
    const guardado = localStorage.getItem(claveBorradorCodigo(usuarioId, nivelId, lang));
    if (guardado !== null && guardado.length > 0) return guardado;
  } catch {
    /* ignore */
  }
  return codigoBase;
}

function guardarBorrador(usuarioId: number | undefined, nivelId: number, lang: LenguajeOOP, cod: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(claveBorradorCodigo(usuarioId, nivelId, lang), cod);
  } catch {
    /* ignore */
  }
}

function cargarModoEditor(): ModoEditor {
  if (typeof window === "undefined") return "normal";
  try {
    const m = localStorage.getItem(STORAGE_MODO_KEY);
    if (m === "dificil" || m === "normal") return m;
  } catch {
    /* ignore */
  }
  return "normal";
}

function guardarModoEditor(modo: ModoEditor) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_MODO_KEY, modo);
  } catch {
    /* ignore */
  }
}

function cargarProgresoLocal(usuarioId?: number): OopProgreso {
  if (typeof window === "undefined") return { lenguaje: "python", niveles: {}, puntajeTotal: 0 };
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

function claveColaSync(usuarioId: number) {
  return `${SYNC_QUEUE_KEY}:${usuarioId}`;
}

function cargarColaSync(usuarioId: number): OopSyncItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(claveColaSync(usuarioId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is OopSyncItem => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<OopSyncItem>;
      return Boolean(candidate.id && candidate.payload && Number.isFinite(candidate.payload.nivel));
    });
  } catch {
    return [];
  }
}

function guardarColaSync(usuarioId: number, cola: OopSyncItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(claveColaSync(usuarioId), JSON.stringify(cola));
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

function normalizarLenguaje(value: string | null): LenguajeOOP {
  return value === "java" ? "java" : "python";
}

function normalizarSalida(texto: string): string {
  return texto.trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function salidaCoincide(
  obtenida: string,
  esperada: string,
  lenguaje: LenguajeOOP,
  nivelId?: number,
): boolean {
  if (esperada.includes("{") && esperada.includes("}")) return true;
  const norm1 = normalizarSalida(obtenida);
  const esperadaPorLenguaje = lenguaje === "java"
    ? esperada.replace(/\bPython\b/g, "Java")
    : esperada;
  const norm2 = normalizarSalida(esperadaPorLenguaje);

  // 1. Coincidencia exacta o coincidencia insensible a espacios múltiples y mayúsculas
  if (norm1 === norm2) return true;
  if (norm1.toLowerCase().replace(/\s+/g, " ") === norm2.toLowerCase().replace(/\s+/g, " ")) return true;

  if (!norm1) return false;

  // 2. Validación pedagógica flexible por nivel
  switch (nivelId) {
    case 1: {
      // Nivel 1: Variables y Tipos. Valida que haya impreso algo significativo con longitud mínima.
      return norm1.length >= 4;
    }
    case 2: {
      // Nivel 2: Funciones (Cálculo del área 6 * 4 = 24).
      return /\b24\b/.test(norm1);
    }
    case 3: {
      // Nivel 3: Clases y Objetos (Gato).
      return /(michi|gato|naranja|cat|orange|soy)/i.test(norm1);
    }
    case 4: {
      // Nivel 4: Encapsulamiento (Nota inválida y nota 90).
      return /(inv[aá]lida|error|90)/i.test(norm1);
    }
    case 5: {
      // Nivel 5: Herencia (Vehículo / Moto / Yamaha / caballito).
      return /(yamaha|arrancando|caballito|moto|veh[ií]culo)/i.test(norm1);
    }
    case 6: {
      // Nivel 6: Abstracción (Perímetro del cuadrado: 20).
      return /\b20\b/i.test(norm1) || /per[ií]metro/i.test(norm1);
    }
    case 7: {
      // Nivel 7: Polimorfismo (Instrumentos: Guitarra / Piano).
      return /(guitarra|piano|tach[aá]n|plonk|sonido|instrumento)/i.test(norm1);
    }
    case 8: {
      // Nivel 8: Desafío Final (Publicación / Libro / Revista).
      return /(libro|revista|principito|tech|publicaci[oó]n)/i.test(norm1);
    }
    default:
      return norm1.length > 0;
  }
}

type PageParams = { nivel: string };
type MobileVista = "docs" | "code" | "terminal";
type EstadoSync = "sincronizado" | "sincronizando" | "pendiente" | "error";

export default function NivelPage({ params }: { params: Promise<PageParams> }) {
  const { hydrated, token, usuario } = useAuthSession();
  const { nivel: nivelParam } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();

  const nivelId = parseInt(nivelParam, 10);
  const nivel = OOP_NIVELES.find((n) => n.id === nivelId);

  const [lenguaje, setLenguaje] = useState<LenguajeOOP>(() =>
    normalizarLenguaje(searchParams.get("lang")),
  );

  // ─── CODIGOS INDEPENDIENTES POR LENGUAJE (Python & Java no se borran al cambiar) ───
  const [codigos, setCodigos] = useState<Record<LenguajeOOP, string>>(() => {
    const pyBase = nivel?.codigoBasePython ?? "";
    const jvBase = nivel?.codigoBaseJava ?? "";
    return {
      python: cargarBorrador(usuario?.id, nivelId, "python", pyBase),
      java: cargarBorrador(usuario?.id, nivelId, "java", jvBase),
    };
  });

  const codigo = codigos[lenguaje];

  function handleCodigoChange(nuevoTexto: string) {
    setLineaError(null);
    setCodigos((prev) => {
      const next = { ...prev, [lenguaje]: nuevoTexto };
      guardarBorrador(usuario?.id, nivelId, lenguaje, nuevoTexto);
      return next;
    });
  }

  // ─── MODO EDITOR (Normal vs Difícil) ───
  const [modoEditor, setModoEditor] = useState<ModoEditor>(() => cargarModoEditor());

  function handleModoChange(nuevoModo: ModoEditor) {
    setModoEditor(nuevoModo);
    guardarModoEditor(nuevoModo);
  }

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [ejecutando, setEjecutando] = useState(false);
  const [tiempoMs, setTiempoMs] = useState<number | null>(null);
  const [lineaError, setLineaError] = useState<number | null>(null);

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
  const [mobileVista, setMobileVista] = useState<MobileVista>("docs");
  const [ejecucionesSesion, setEjecucionesSesion] = useState(0);
  const [progresoCargado, setProgresoCargado] = useState(false);
  const [estadoSync, setEstadoSync] = useState<EstadoSync>("sincronizado");
  const [mensajeSync, setMensajeSync] = useState("Progreso sincronizado con tu perfil");
  const [pendientesSync, setPendientesSync] = useState(0);
  const procesandoSyncRef = useRef(false);

  const procesarColaSync = useCallback(async () => {
    const usuarioId = usuario?.id;
    if (!usuarioId) return false;

    let cola = cargarColaSync(usuarioId);
    setPendientesSync(cola.length);
    if (cola.length === 0) {
      setEstadoSync("sincronizado");
      setMensajeSync("Progreso sincronizado con tu perfil");
      return true;
    }

    if (!token) {
      setEstadoSync("pendiente");
      setMensajeSync(`${cola.length} cambio${cola.length === 1 ? "" : "s"} protegido${cola.length === 1 ? "" : "s"} en este dispositivo`);
      return false;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setEstadoSync("pendiente");
      setMensajeSync("Sin conexión: tu avance está protegido y se enviará al volver");
      return false;
    }

    if (procesandoSyncRef.current) return false;
    procesandoSyncRef.current = true;
    setEstadoSync("sincronizando");
    setMensajeSync(`Sincronizando ${cola.length} cambio${cola.length === 1 ? "" : "s"}…`);

    try {
      while (true) {
        cola = cargarColaSync(usuarioId);
        if (cola.length === 0) break;
        const actual = cola[0];
        try {
          await apiRequest("/api/oop/progreso", token, {
            method: "POST",
            body: JSON.stringify(actual.payload),
          });
          cola = cargarColaSync(usuarioId).filter((item) => item.id !== actual.id);
          guardarColaSync(usuarioId, cola);
          setPendientesSync(cola.length);
        } catch (error) {
          const detalle = error instanceof Error ? error.message : "No fue posible guardar el progreso";
          cola = cargarColaSync(usuarioId).map((item) =>
            item.id === actual.id
              ? {
                  ...item,
                  intentosSync: item.intentosSync + 1,
                  ultimoError: detalle,
                }
              : item,
          );
          guardarColaSync(usuarioId, cola);
          setPendientesSync(cola.length);
          setEstadoSync("error");
          setMensajeSync(`No se pudo sincronizar: ${detalle}`);
          return false;
        }
      }

      setEstadoSync("sincronizado");
      setMensajeSync("Progreso sincronizado con tu perfil");
      return true;
    } finally {
      procesandoSyncRef.current = false;
    }
  }, [token, usuario?.id]);

  const encolarSincronizacion = useCallback(
    (payload: OopSyncPayload) => {
      const usuarioId = usuario?.id;
      if (!usuarioId) return;
      const cola = encolarCambioSync(cargarColaSync(usuarioId), payload);
      guardarColaSync(usuarioId, cola);
      setPendientesSync(cola.length);
      setEstadoSync("pendiente");
      setMensajeSync("Avance protegido localmente; preparando sincronización…");
      void procesarColaSync();
    },
    [procesarColaSync, usuario?.id],
  );

  // Pre-cargar Pyodide en segundo plano al montar
  useEffect(() => {
    preCargaPyodide();
  }, []);

  // Sincronizar desde backend al cargar
  useEffect(() => {
    if (!hydrated) return;

    if (!usuario?.id) {
      queueMicrotask(() => setProgresoCargado(true));
      return;
    }

    let cancelado = false;
    const local = cargarProgresoLocal(usuario.id);
    const localNivel = local.niveles[String(nivelId)];
    const prepararRecuperacion = (remotos: Record<string, OopNivelSync>) => {
      const cola = asegurarRecuperacionLocal(
        cargarColaSync(usuario.id),
        local.niveles,
        remotos,
        local.lenguaje,
      );
      guardarColaSync(usuario.id, cola);
      setPendientesSync(cola.length);
      if (cola.length > 0) {
        setEstadoSync("pendiente");
        setMensajeSync(`${cola.length} cambio${cola.length === 1 ? "" : "s"} listo${cola.length === 1 ? "" : "s"} para sincronizar`);
        void procesarColaSync();
      }
    };
    queueMicrotask(() => {
      if (cancelado) return;
      setProgreso(local);
      if (localNivel) {
        setIntentos(localNivel.intentos);
        setCompletado(localNivel.completado);
        setMostroPista(localNivel.usoPista);
      }
      const colaGuardada = cargarColaSync(usuario.id);
      setPendientesSync(colaGuardada.length);
      if (colaGuardada.length > 0) {
        setEstadoSync("pendiente");
        setMensajeSync(`${colaGuardada.length} cambio${colaGuardada.length === 1 ? "" : "s"} pendiente${colaGuardada.length === 1 ? "" : "s"}`);
      }
      if (!token) {
        prepararRecuperacion({});
        setProgresoCargado(true);
      }
    });
    if (!token) return () => { cancelado = true; };
    apiRequest<ProgresoOopBackend>("/api/oop/progreso", token)
      .then((data) => {
        if (cancelado || !data || !data.niveles) return;
        const remotosPorClave: Record<string, OopNivelSync> = {};
        data.niveles.forEach((n) => {
          remotosPorClave[String(n.nivel)] = {
            completado: n.completado,
            puntos: n.puntaje,
            intentos: n.intentos,
            usoPista: n.usoPista,
          };
        });
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
            (total, nivelActual) => total + nivelActual.puntos,
            0,
          );
          const nuevo = {
            ...prev,
            niveles: actualizados,
            puntajeTotal: Math.max(prev.puntajeTotal, data.puntajeOopTotal, totalFusionado),
          };
          guardarProgresoLocal(nuevo, usuario.id);
          return nuevo;
        });

        const np = data.niveles.find((n) => n.nivel === nivelId);
        if (np) {
          const fusionado = fusionarNivelProgreso(localNivel, {
            completado: np.completado,
            puntos: np.puntaje,
            intentos: np.intentos,
            usoPista: np.usoPista,
          });
          setIntentos(fusionado.intentos);
          setCompletado(fusionado.completado);
          setMostroPista(fusionado.usoPista);
        }
        prepararRecuperacion(remotosPorClave);
      })
      .catch((error) => {
        if (cancelado) return;
        const detalle = error instanceof Error ? error.message : "No se pudo consultar el progreso remoto";
        prepararRecuperacion({});
        if (cargarColaSync(usuario.id).length === 0) {
          setEstadoSync("error");
          setMensajeSync(`No se pudo verificar la nube: ${detalle}`);
        }
      })
      .finally(() => {
        if (!cancelado) setProgresoCargado(true);
      });
    return () => { cancelado = true; };
  }, [hydrated, token, usuario?.id, nivelId, procesarColaSync]);

  useEffect(() => {
    if (!hydrated || !usuario?.id) return;
    const reintentarAlConectar = () => void procesarColaSync();
    window.addEventListener("online", reintentarAlConectar);
    return () => window.removeEventListener("online", reintentarAlConectar);
  }, [hydrated, procesarColaSync, usuario?.id]);

  const indiceNivel = OOP_NIVELES.findIndex((item) => item.id === nivelId);
  const nivelBloqueado =
    indiceNivel > 0 &&
    !progreso.niveles[String(OOP_NIVELES[indiceNivel - 1].id)]?.completado;

  useEffect(() => {
    if (!progresoCargado || !nivelBloqueado) return;
    router.replace("/estudiante/codigo");
  }, [nivelBloqueado, progresoCargado, router]);

  useEffect(() => {
    if (!modalAyudaAbierto) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalAyudaAbierto(false);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [modalAyudaAbierto]);

  // Guardar primero en una cola local durable y enviarla al backend en orden.
  const sincronizarProgresoBackend = useCallback(
    (completadoEstado: boolean, puntosGanados: number, intentosTotales: number, usoPistaEstado: boolean) => {
      encolarSincronizacion({
        nivel: nivelId,
        lenguaje,
        completado: completadoEstado,
        puntaje: puntosGanados,
        intentos: intentosTotales,
        usoPista: usoPistaEstado,
      });
    },
    [encolarSincronizacion, nivelId, lenguaje],
  );

  const ejecutar = useCallback(async () => {
    if (!nivel || ejecutando) return;

    setEjecutando(true);
    setLineaError(null);
    setEjecucionesSesion((total) => total + 1);
    setMobileVista("terminal");
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
    let resolvioEnEsteIntento = false;

    if (resultado.error) {
      setLineaError(obtenerLineaError(resultado.error, lenguaje));
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
        const coincide = salidaCoincide(
          resultado.salida,
          nivel.practica.salidaEsperada,
          lenguaje,
          nivelId,
        );
        const validacion = validarEstructuraCodigo(nivelId, codigo, lenguaje);

        if (coincide && validacion.valido) {
          resolvioEnEsteIntento = true;
          const puntosGanados = mostroPista ? Math.floor(nivel.puntaje / 2) : nivel.puntaje;

          lines.push({
            type: "success",
            text: `✅ ¡Excelente! Tu código cumple la estructura y la salida. Ganaste ${puntosGanados} puntos. Avance guardado y sincronizado.`,
          });

          // Actualizar estado local y backend
          const nuevoProgreso: OopProgreso = {
            ...progreso,
            niveles: {
              ...progreso.niveles,
              [String(nivelId)]: {
                completado: true,
                puntos: puntosGanados,
                intentos: nuevosIntentos,
                usoPista: mostroPista,
              },
            },
          };
          nuevoProgreso.puntajeTotal = Object.values(nuevoProgreso.niveles).reduce(
            (sum, n) => sum + n.puntos,
            0,
          );
          setProgreso(nuevoProgreso);
          guardarProgresoLocal(nuevoProgreso, usuario?.id);
          setCompletado(true);
          setCelebrando(true);
          setTimeout(() => setCelebrando(false), 3500);

          sincronizarProgresoBackend(true, puntosGanados, nuevosIntentos, mostroPista);
        } else if (coincide && !validacion.valido) {
          lines.push({
            type: "error",
            text:
              validacion.mensaje ??
              "⚠️ Tu salida es correcta, pero no estás utilizando los conceptos requeridos de este nivel.",
          });
          lines.push({
            type: "info",
            text: `Intento ${nuevosIntentos} de ${MAX_INTENTOS}`,
          });

          if (nuevosIntentos >= MAX_INTENTOS && !mostroPista) {
            setModalAyudaAbierto(true);
          }
        } else {
          if (!validacion.valido && validacion.mensaje) {
            lines.push({
              type: "error",
              text: validacion.mensaje,
            });
          }
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
    if (!completado && !resolvioEnEsteIntento) {
      const nuevoProgreso: OopProgreso = {
        ...progreso,
        niveles: {
          ...progreso.niveles,
          [String(nivelId)]: {
            ...nivelProgreso,
            intentos: nuevosIntentos,
            usoPista: mostroPista,
          },
        },
      };
      setProgreso(nuevoProgreso);
      guardarProgresoLocal(nuevoProgreso, usuario?.id);
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
    usuario?.id,
  ]);

  useEffect(() => {
    const ejecutarConAtajo = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!modalAyudaAbierto) void ejecutar();
      }
    };

    window.addEventListener("keydown", ejecutarConAtajo);
    return () => window.removeEventListener("keydown", ejecutarConAtajo);
  }, [ejecutar, modalAyudaAbierto]);

  function limpiarEditor() {
    if (!nivel) return;
    const base = lenguaje === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava;
    setCodigos((prev) => {
      const next = { ...prev, [lenguaje]: base };
      guardarBorrador(usuario?.id, nivelId, lenguaje, base);
      return next;
    });
    setTerminalLines([]);
  }

  function aplicarPista() {
    if (!nivel) return;
    setMostroPista(true);
    setModalAyudaAbierto(false);

    const pista = lenguaje === "python" ? nivel.pistaPython : nivel.pistaJava;
    setCodigos((prev) => {
      const next = { ...prev, [lenguaje]: pista };
      guardarBorrador(usuario?.id, nivelId, lenguaje, pista);
      return next;
    });
    setTerminalLines([
      { type: "info", text: "💡 Pista aplicada: se ha cargado un fragmento estructurado en el editor." },
      { type: "info", text: `⚠️ Al completar este subnivel con pista ganarás ${Math.floor(nivel.puntaje / 2)} pts (la mitad).` },
    ]);

    const nuevoProgreso: OopProgreso = {
      ...progreso,
      niveles: {
        ...progreso.niveles,
        [String(nivelId)]: { ...nivelProgreso, usoPista: true },
      },
    };
    setProgreso(nuevoProgreso);
    guardarProgresoLocal(nuevoProgreso, usuario?.id);
    sincronizarProgresoBackend(completado, completado ? nivelProgreso.puntos : 0, intentos, true);
  }

  function aplicarSolucionCompleta() {
    if (!nivel) return;
    setModalAyudaAbierto(false);

    const sol = lenguaje === "python" ? nivel.solucionPython : nivel.solucionJava;
    setCodigos((prev) => {
      const next = { ...prev, [lenguaje]: sol };
      guardarBorrador(usuario?.id, nivelId, lenguaje, sol);
      return next;
    });
    setTerminalLines([
      { type: "info", text: "🏳 Solución completa cargada en el editor. Puedes probarla y avanzar." },
      { type: "info", text: "ℹ️ Este subnivel queda completado con 0 puntos otorgados." },
    ]);

    const nuevoProgreso: OopProgreso = {
      ...progreso,
      niveles: {
        ...progreso.niveles,
        [String(nivelId)]: {
          completado: true,
          puntos: 0,
          intentos,
          usoPista: mostroPista,
        },
      },
    };
    nuevoProgreso.puntajeTotal = Object.values(nuevoProgreso.niveles).reduce(
      (sum, item) => sum + item.puntos,
      0,
    );
    setProgreso(nuevoProgreso);
    guardarProgresoLocal(nuevoProgreso, usuario?.id);
    setCompletado(true);
    setCelebrando(true);
    window.setTimeout(() => setCelebrando(false), 5000);
    sincronizarProgresoBackend(true, 0, intentos, mostroPista);
  }

  // ─── CAMBIAR LENGUAJE (Preserva el código del lenguaje previo intacto) ───
  function cambiarLenguaje(lang: LenguajeOOP) {
    setLenguaje(lang);
    setTerminalLines([]);
    setProgreso((prev) => {
      const nuevo = { ...prev, lenguaje: lang };
      guardarProgresoLocal(nuevo, usuario?.id);
      return nuevo;
    });
    router.replace(`/estudiante/codigo/${nivelId}?lang=${lang}`, { scroll: false });
  }

  if (!nivel) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center">
        <div>
          <p className="text-4xl">🤔</p>
          <p className="mt-4 text-slate-400">Subnivel no encontrado.</p>
          <Link href="/estudiante/codigo" className="oop-back-link mt-6 inline-flex">
            ← Volver al módulo POO
          </Link>
        </div>
      </div>
    );
  }

  if (!progresoCargado || nivelBloqueado) {
    return (
      <div className={styles.levelLoading} role="status" aria-live="polite">
        <div className={styles.levelLoadingCard}>
          <RefreshCw size={26} aria-hidden="true" />
          <strong>{nivelBloqueado ? "Preparando tu ruta" : "Cargando laboratorio"}</strong>
          <p>{nivelBloqueado ? "Abriendo el último reto disponible…" : "Recuperando tu progreso y el editor…"}</p>
          <span aria-hidden="true"><i /></span>
        </div>
      </div>
    );
  }

  const nextNivel = OOP_NIVELES.find((n) => n.id === nivelId + 1);
  const ayudaHabilitada = intentos >= MAX_INTENTOS || mostroPista;
  const rutaCompleta = OOP_NIVELES.every(
    (item) => progreso.niveles[String(item.id)]?.completado,
  );
  const codigoBaseActual =
    lenguaje === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava;
  const ejemploDocumentacionEditor =
    lenguaje === "python" ? nivel.docs.ejemploPython : nivel.docs.ejemploJava;
  const glosarioDocumentacionEditor =
    lenguaje === "python" ? nivel.docs.glosarioPython : nivel.docs.glosarioJava;
  const fuenteDocumentacionEditor = [
    ejemploDocumentacionEditor,
    ...glosarioDocumentacionEditor.map((item) => item.termino),
  ].join("\n");
  const editorModificado = codigo.trim() !== codigoBaseActual.trim();
  const claseVistaMovil =
    mobileVista === "code"
      ? styles.mobileCode
      : mobileVista === "terminal"
        ? styles.mobileTerminal
        : styles.mobileDocs;
  const claseEstadoSync =
    estadoSync === "error"
      ? styles.syncError
      : estadoSync === "pendiente"
        ? styles.syncPending
        : estadoSync === "sincronizando"
          ? styles.syncWorking
          : "";

  return (
    <div className={`oop-level-page ${styles.levelShell} ${celebrando ? "oop-celebrating" : ""}`}>
      {/* Navegación compacta: contexto, lenguaje y dificultad. */}
      <nav className="oop-level-nav">
        <div className={styles.levelNavRow}>
          <div className={styles.levelIdentity}>
            <Link href="/estudiante/codigo" className="oop-back-link flex-shrink-0" title="Volver al catálogo POO">
              <ArrowLeft size={15} />
              <span className="font-semibold text-xs text-slate-300">Retos</span>
            </Link>
            <span className="text-xs text-slate-600">|</span>
            <span className="text-emerald-400 font-mono text-xs font-extrabold">{nivel.subnivel}</span>
            <strong className="text-xs text-slate-300 font-semibold truncate max-w-[210px]">{nivel.titulo}</strong>
          </div>

          <div className={styles.levelControls}>
            <div className="oop-lang-tabs-mini">
              <button
                className={`oop-lang-tab-mini ${lenguaje === "python" ? "active" : ""}`}
                onClick={() => cambiarLenguaje("python")}
                title="Programar en Python"
              >
                🐍 Python
              </button>
              <button
                className={`oop-lang-tab-mini ${lenguaje === "java" ? "active" : ""}`}
                onClick={() => cambiarLenguaje("java")}
                title="Programar en Java"
              >
                ☕ Java
              </button>
            </div>

            <div
              className="flex items-center p-0.5 rounded-lg border border-white/[0.08] bg-white/[0.03]"
              role="group"
              aria-label="Modo del editor de código"
            >
              <button
                type="button"
                onClick={() => handleModoChange("normal")}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md text-[11px] font-bold transition ${
                  modoEditor === "normal"
                    ? "bg-emerald-500/20 text-emerald-300 shadow-sm border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Modo Normal: el editor cierra símbolos y sugiere funciones"
              >
                <span>⚡</span>
                <span className="hidden md:inline">Normal</span>
              </button>
              <button
                type="button"
                onClick={() => handleModoChange("dificil")}
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-md text-[11px] font-bold transition ${
                  modoEditor === "dificil"
                    ? "bg-purple-500/25 text-purple-300 shadow-sm border border-purple-500/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Modo Difícil: Escritura manual completa"
              >
                <span>🧠</span>
                <span className="hidden md:inline">Difícil</span>
              </button>
            </div>

            {completado && nextNivel && (
              <Link
                href={`/estudiante/codigo/${nextNivel.id}?lang=${lenguaje}`}
                className="flex items-center gap-1.5 h-7 sm:h-8 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 animate-pulse"
                title={`Pasar al siguiente subnivel: ${nextNivel.titulo}`}
              >
                <span>Siguiente Nivel</span>
                <ArrowRight size={13} />
              </Link>
            )}

            <button
              onClick={ejecutar}
              disabled={ejecutando}
              className="flex sm:hidden items-center justify-center h-7 px-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
              title="Ejecutar código"
            >
              {ejecutando ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Play size={12} fill="currentColor" />
              )}
            </button>
          </div>
        </div>

        <div className={styles.levelMobileRow}>
          <div className={`${styles.mobileViewTabs} flex-1`} role="tablist" aria-label="Vista del laboratorio">
            <button
              type="button"
              role="tab"
              aria-selected={mobileVista === "docs"}
              aria-controls="oop-docs-view"
              onClick={() => setMobileVista("docs")}
            >
              <BookOpen size={13} /> Guía
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileVista === "code"}
              aria-controls="oop-code-view"
              onClick={() => setMobileVista("code")}
            >
              <Code2 size={13} /> Editor
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileVista === "terminal"}
              aria-controls="oop-terminal-view"
              onClick={() => setMobileVista("terminal")}
            >
              <TerminalSquare size={13} /> Terminal
            </button>
          </div>

          {ayudaHabilitada && !completado && (
            <button
              onClick={() => setModalAyudaAbierto(true)}
              className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-1 text-[11px] font-bold text-amber-300 ring-1 ring-amber-500/40"
            >
              <Lightbulb size={12} className="animate-pulse" />
              <span>Ayuda</span>
            </button>
          )}
        </div>
      </nav>

      {estadoSync !== "sincronizado" ? (
        <div className={`${styles.syncBanner} ${claseEstadoSync}`} role="status" aria-live="polite">
          <span className={styles.syncIcon} aria-hidden="true">
            {estadoSync === "sincronizando" ? (
              <RefreshCw size={14} className={styles.syncSpinner} />
            ) : (
              <CloudOff size={14} />
            )}
          </span>
          <span className={styles.syncMessage}>{mensajeSync}</span>
          {pendientesSync > 0 && (
            <span className={styles.syncCount}>{pendientesSync} pendiente{pendientesSync === 1 ? "" : "s"}</span>
          )}
          {(estadoSync === "error" || estadoSync === "pendiente") && token && (
            <button type="button" onClick={() => void procesarColaSync()}>Reintentar</button>
          )}
        </div>
      ) : null}

      {/* Main split layout */}
      <div className={`oop-split-layout ${claseVistaMovil}`}>
        {/* Left: Editor + Terminal */}
        <div className="oop-left-panel" id="oop-code-view">
          {/* Editor Header & Container */}
          <div className="oop-editor-container">
            <div className="oop-editor-header flex items-center justify-between px-3 py-2 border-b border-white/[0.07] bg-black/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[11px] text-slate-400">
                  Intentos: {intentos}/{MAX_INTENTOS}
                </span>
                {modoEditor === "normal" ? (
                  <span className="hidden sm:inline text-[10px] text-emerald-300/70">Sugerencias con Tab</span>
                ) : null}
              </div>

              <div className="oop-editor-actions flex items-center gap-2">
                {completado && nextNivel && (
                  <Link
                    href={`/estudiante/codigo/${nextNivel.id}?lang=${lenguaje}`}
                    className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-sm shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                    title={`Pasar al siguiente subnivel (${nextNivel.subnivel})`}
                  >
                    <span>Siguiente Nivel</span>
                    <ArrowRight size={12} />
                  </Link>
                )}
                <button
                  className="oop-reset-btn"
                  onClick={limpiarEditor}
                  disabled={ejecutando}
                  title={`Restablecer código base de ${lenguaje === "python" ? "Python" : "Java"}`}
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline text-xs ml-1">Restablecer</span>
                </button>
                <button
                  className={`oop-run-btn ${editorModificado && !completado ? styles.runReady : ""}`}
                  onClick={ejecutar}
                  disabled={ejecutando}
                  title="Ejecutar código localmente (Ctrl+Enter)"
                >
                  {ejecutando ? (
                    <>
                      <span className="terminal-spinner" />
                      <span>Ejecutando…</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" />
                      <span>Ejecutar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <CodeEditor
              codigo={codigo}
              onChange={handleCodigoChange}
              lenguaje={lenguaje}
              disabled={ejecutando}
              modo={modoEditor}
              onModoChange={handleModoChange}
              lineaError={lineaError}
              fuenteDocumentacion={fuenteDocumentacionEditor}
            />
          </div>

          {/* Terminal */}
          <div id="oop-terminal-view" className="contents">
            <CodeTerminal lines={terminalLines} tiempoMs={tiempoMs} />
          </div>
        </div>

        {/* Right: Docs + Practice */}
        <div className={`oop-right-panel ${styles.docsWithHud}`} id="oop-docs-view">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.07] bg-black/40">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Documentación</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-300 font-mono font-bold">Subnivel {nivel.subnivel}</span>
            </div>
          </div>
          <div className={styles.docsBody}>
            <OopDocsPanel
              nivel={nivel}
              lenguaje={lenguaje}
              intentos={intentos}
              maxIntentos={MAX_INTENTOS}
              completado={completado}
              onVerPista={() => setModalAyudaAbierto(true)}
              onVerSolucion={() => setModalAyudaAbierto(true)}
              mostroPista={mostroPista}
              nextNivelId={nextNivel?.id}
              nextNivelSubnivel={nextNivel?.subnivel}
            />
          </div>
        </div>
      </div>

      {/* ─── MODAL DE OPCIONES DE AYUDA (6 INTENTOS) ─── */}
      {modalAyudaAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-ayuda"
            aria-describedby="descripcion-modal-ayuda"
            className="relative w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900 p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setModalAyudaAbierto(false)}
              aria-label="Cerrar opciones de ayuda"
              autoFocus
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-300">
                <HelpCircle size={24} />
              </div>
              <div>
                <h3 id="titulo-modal-ayuda" className="text-lg font-bold text-white">
                  Opciones de Ayuda (6 Intentos)
                </h3>
                <p id="descripcion-modal-ayuda" className="text-xs text-slate-300">
                  Has alcanzado {intentos} intentos. Elige cómo deseas continuar:
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Opción 1: Pista */}
              <button
                type="button"
                onClick={aplicarPista}
                className="group w-full rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-left transition hover:border-amber-400 hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span className="flex items-start justify-between">
                  <span className="flex items-center gap-2 font-bold text-amber-300">
                    <Lightbulb size={18} />
                    <span>Opción 1: Obtener Pista (Fragmento de código)</span>
                  </span>
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                    +{Math.floor(nivel.puntaje / 2)} pts
                  </span>
                </span>
                <span className="mt-2 block text-xs text-slate-300">
                  Carga en el editor la estructura base guiada con comentarios para que completes lo que falta.
                  Recibirás la <strong>mitad de los puntos ({Math.floor(nivel.puntaje / 2)} pts)</strong> al completarlo.
                </span>
              </button>

              {/* Opción 2: Completar código */}
              <button
                type="button"
                onClick={aplicarSolucionCompleta}
                className="group w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <span className="flex items-start justify-between">
                  <span className="flex items-center gap-2 font-bold text-slate-200">
                    <CheckCheck size={18} />
                    <span>Opción 2: Completar Código (Solución completa)</span>
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-slate-400">
                    0 pts
                  </span>
                </span>
                <span className="mt-2 block text-xs text-slate-300">
                  Inserta la solución final funcional en el editor y marca el subnivel como superado para desbloquear el
                  siguiente. <strong>No otorgará puntos adicionales</strong>.
                </span>
              </button>
            </div>

            {/* Footer con opción de seguir intentando */}
            <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
              <p className="text-[11px] text-slate-400">
                El botón de ayuda seguirá disponible arriba si cambias de opinión.
              </p>
              <button
                type="button"
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
          <div className="oop-celebration-card relative">
            <button
              type="button"
              onClick={() => setCelebrando(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Cerrar ventana"
            >
              <X size={18} />
            </button>
            <p className="text-5xl">🎉</p>
            <h2 className="oop-celebration-title">¡Subnivel Superado!</h2>
            <p className="oop-celebration-pts">
              +{mostroPista ? Math.floor(nivel.puntaje / 2) : nivel.puntaje} puntos asegurados
            </p>
            <p className="text-xs text-slate-300">
              {estadoSync === "sincronizado"
                ? "Sincronizados con tu perfil global de AlgoLab"
                : "Guardados localmente; se enviarán a tu perfil al recuperar conexión"}
            </p>
            {!nextNivel && rutaCompleta ? (
              <div className="oop-konami-reward oop-konami-reward-compact">
                <span className="oop-konami-crown">🏆 RECOMPENSA SECRETA</span>
                <strong>↑ ↑ ↓ ↓ ← ← → → B A</strong>
                <p>
                  Como <b>invitado</b>, úsalo después de ver o saltar el tutorial y estando fuera de cualquier
                  nivel para desbloquear todos los niveles; ese desbloqueo es exclusivo del modo invitado. En
                  el <b>tema del nivel 3</b>, la secuencia activa la sorpresa del robot y funciona tanto como
                  invitado como con una sesión iniciada.
                </p>
              </div>
            ) : null}
            {nextNivel ? (
              <Link
                href={`/estudiante/codigo/${nextNivel.id}?lang=${lenguaje}`}
                className="oop-next-btn flex items-center justify-center gap-2"
              >
                <span>Siguiente: Subnivel {nextNivel.subnivel}</span>
                <ArrowRight size={16} />
              </Link>
            ) : (
              <Link
                href="/estudiante/codigo"
                className="oop-next-btn flex items-center justify-center gap-2"
              >
                <span>🏆 Ver Todos los Niveles</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
