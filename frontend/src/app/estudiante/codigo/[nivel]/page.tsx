"use client";

import { use, useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Code2,
  BookOpen,
  TerminalSquare,
  Keyboard,
  CloudCheck,
  CloudOff,
  RefreshCw,
} from "lucide-react";
import { OOP_NIVELES, type LenguajeOOP } from "@/lib/oop-niveles";
import { validarEstructuraCodigo } from "@/lib/oop-validador";
import { ejecutarCodigo, preCargaPyodide, type ResultadoEjecucion } from "@/lib/judge0";
import { CodeEditor } from "@/components/code-editor";
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

function salidaCoincide(obtenida: string, esperada: string): boolean {
  if (esperada.includes("{") && esperada.includes("}")) return true;
  const norm1 = normalizarSalida(obtenida);
  const norm2 = normalizarSalida(esperada);
  return norm1 === norm2;
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
  const [codigo, setCodigo] = useState(() => {
    if (!nivel) return "";
    const lang = normalizarLenguaje(searchParams.get("lang"));
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
        const validacion = validarEstructuraCodigo(nivelId, codigo, lenguaje);

        if (coincide && validacion.valido) {
          resolvioEnEsteIntento = true;
          const puntosGanados = mostroPista ? Math.floor(nivel.puntaje / 2) : nivel.puntaje;

          lines.push({
            type: "success",
            text: `✅ ¡Excelente! Tu código cumple la estructura y la salida. Ganaste ${puntosGanados} puntos; el avance quedó protegido en este dispositivo mientras se sincroniza.`,
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
          // El print coincide pero no usó las variables/funciones/clases requeridas
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
          // Salida no coincide
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
    setCodigo(sol);
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

  function cambiarLenguaje(lang: LenguajeOOP) {
    setLenguaje(lang);
    setTerminalLines([]);
    if (nivel) {
      setCodigo(lang === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava);
    }
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
            ← Volver al módulo OOP
          </Link>
        </div>
      </div>
    );
  }

  if (!progresoCargado || nivelBloqueado) {
    return (
      <div className="grid min-h-screen place-items-center p-8 text-center" role="status">
        <div>
          <p className="text-4xl" aria-hidden="true">🔐</p>
          <p className="mt-4 text-slate-300">
            {nivelBloqueado ? "Volviendo al último subnivel disponible…" : "Cargando tu progreso…"}
          </p>
        </div>
      </div>
    );
  }

  const prevNivel = OOP_NIVELES.find((n) => n.id === nivelId - 1);
  const nextNivel = OOP_NIVELES.find((n) => n.id === nivelId + 1);
  const ayudaHabilitada = intentos >= MAX_INTENTOS || mostroPista;
  const rutaCompleta = OOP_NIVELES.every(
    (item) => progreso.niveles[String(item.id)]?.completado,
  );
  const estaDesbloqueado = (id: number) =>
    id === OOP_NIVELES[0]?.id ||
    Boolean(progreso.niveles[String(id - 1)]?.completado);
  const codigoBaseActual =
    lenguaje === "python" ? nivel.codigoBasePython : nivel.codigoBaseJava;
  const editorModificado = codigo.trim() !== codigoBaseActual.trim();
  const ejecutoAlgunaVez = ejecucionesSesion > 0 || intentos > 0;
  const pasosMision = [
    { etiqueta: "Comprende la guía", completo: true },
    { etiqueta: "Construye la solución", completo: editorModificado || completado },
    { etiqueta: "Ejecuta tu código", completo: ejecutoAlgunaVez || completado },
    { etiqueta: "Supera la prueba", completo: completado },
  ];
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
          : styles.syncOk;

  return (
    <div className={`oop-level-page ${styles.levelShell} ${celebrando ? "oop-celebrating" : ""}`}>
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
            const desbloqueado = estaDesbloqueado(n.id);
            return (
              <button
                key={n.id}
                disabled={!desbloqueado}
                onClick={() => {
                  if (desbloqueado) {
                    router.push(`/estudiante/codigo/${n.id}?lang=${lenguaje}`);
                  }
                }}
                className={`flex h-6 items-center gap-1 rounded-md px-2 text-xs font-semibold transition ${
                  esActual
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50"
                    : esCompletado
                    ? "bg-white/10 text-emerald-400 hover:bg-white/15"
                    : desbloqueado
                      ? "bg-white/5 text-slate-400 hover:bg-white/10"
                      : "cursor-not-allowed bg-white/[.025] text-slate-600"
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
          <div className={styles.mobileViewTabs} role="tablist" aria-label="Vista del laboratorio">
            <button
              type="button"
              role="tab"
              aria-selected={mobileVista === "docs"}
              aria-controls="oop-docs-view"
              onClick={() => setMobileVista("docs")}
            >
              <BookOpen size={14} /> Guía
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileVista === "code"}
              aria-controls="oop-code-view"
              onClick={() => setMobileVista("code")}
            >
              <Code2 size={14} /> Código
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileVista === "terminal"}
              aria-controls="oop-terminal-view"
              onClick={() => setMobileVista("terminal")}
            >
              <TerminalSquare size={14} /> Terminal
            </button>
          </div>
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
            {nextNivel && (completado || progreso.niveles[String(nextNivel.id)]?.completado) && (
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

      <div
        className={`${styles.syncBanner} ${claseEstadoSync}`}
        role="status"
        aria-live="polite"
      >
        <span className={styles.syncIcon} aria-hidden="true">
          {estadoSync === "sincronizado" ? (
            <CloudCheck size={16} />
          ) : estadoSync === "sincronizando" ? (
            <RefreshCw size={16} className={styles.syncSpinner} />
          ) : (
            <CloudOff size={16} />
          )}
        </span>
        <span className={styles.syncMessage}>{mensajeSync}</span>
        {pendientesSync > 0 && (
          <span className={styles.syncCount}>{pendientesSync} pendiente{pendientesSync === 1 ? "" : "s"}</span>
        )}
        {(estadoSync === "error" || estadoSync === "pendiente") && token && (
          <button type="button" onClick={() => void procesarColaSync()}>
            Reintentar ahora
          </button>
        )}
      </div>

      {/* Main split layout */}
      <div className={`oop-split-layout ${claseVistaMovil}`}>
        {/* Left: Editor + Terminal */}
        <div className="oop-left-panel" id="oop-code-view">
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
                <span className={styles.keyboardHint}>
                  <Keyboard size={13} /> <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
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
                  className={`oop-run-btn ${editorModificado && !completado ? styles.runReady : ""}`}
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
          <div id="oop-terminal-view" className="contents">
            <CodeTerminal lines={terminalLines} tiempoMs={tiempoMs} />
          </div>
        </div>

        {/* Right: Docs + Practice */}
        <div className={`oop-right-panel ${styles.docsWithHud}`} id="oop-docs-view">
          <div className={styles.missionHud} aria-label="Progreso de la misión">
            {pasosMision.map((paso, index) => (
              <div
                key={paso.etiqueta}
                className={`${styles.missionStep} ${paso.completo ? styles.missionStepComplete : ""}`}
              >
                <span aria-hidden="true">{paso.completo ? "✓" : index + 1}</span>
                <span>{paso.etiqueta}</span>
              </div>
            ))}
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
          <div className="oop-celebration-card">
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
                  Úsalo como <b>invitado</b>, después de ver o saltar el tutorial y estando fuera de un nivel,
                  para desbloquear la ruta. En el <b>nivel 3</b>, introdúcelo durante la práctica para descubrir
                  una reacción especial del robot.
                </p>
              </div>
            ) : null}
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
