"use client";

import { BrainCircuit, CheckCircle2, LockKeyhole, RefreshCw, Save, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/client-api";
import { useAuthSession } from "@/lib/use-auth-session";

type PoliticaTutor = {
  version: string;
  editable: boolean;
  reglas: string[];
  seccionesReporte: string[];
};

type ConfiguracionTutor = {
  id?: number;
  nivel: number;
  nombreNivel: string;
  conceptoCentral: string;
  objetivoTutor: string;
  etapas: string[];
  accionesEsperadas: string[];
  erroresObservables: string[];
  objetosClave: string[];
  dificultadesComunes: string[];
  criteriosDominio: string[];
  pistasTutor: string[];
  proximoEjercicio: string;
  promptAdicional: string;
  puntajeMaximo: number;
  tiempoObjetivoSegundos: number;
  activo: boolean;
  fechaActualizacion?: string;
};

type ListaCampo = keyof Pick<
  ConfiguracionTutor,
  | "etapas"
  | "accionesEsperadas"
  | "erroresObservables"
  | "objetosClave"
  | "dificultadesComunes"
  | "criteriosDominio"
  | "pistasTutor"
>;

const listas: Array<{ campo: ListaCampo; titulo: string; ayuda: string }> = [
  { campo: "etapas", titulo: "Etapas del nivel", ayuda: "Una etapa por línea, en el orden real de la experiencia." },
  { campo: "accionesEsperadas", titulo: "Acciones correctas", ayuda: "Acciones que demuestran avance o comprensión." },
  { campo: "erroresObservables", titulo: "Acciones incorrectas", ayuda: "Errores que el juego puede registrar sin inferirlos." },
  { campo: "objetosClave", titulo: "Objetos manipulados", ayuda: "Objetos físicos que dan contexto a las respuestas." },
  { campo: "dificultadesComunes", titulo: "Dificultades repetidas", ayuda: "Patrones que justifican una pista adaptada." },
  { campo: "criteriosDominio", titulo: "Criterios de dominio", ayuda: "Evidencias mínimas para afirmar que comprendió." },
  { campo: "pistasTutor", titulo: "Banco de pistas", ayuda: "Pistas progresivas; evita entregar la solución directamente." },
];

const inputClass = "field-input text-sm";

function segundosATiempo(segundos: number) {
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${String(resto).padStart(2, "0")}`;
}

export default function AdministradorTutorIaPage() {
  const { hydrated, token } = useAuthSession();
  const [politica, setPolitica] = useState<PoliticaTutor | null>(null);
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionTutor[]>([]);
  const [nivelActivo, setNivelActivo] = useState(1);
  const [borrador, setBorrador] = useState<ConfiguracionTutor | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setMensaje("");
    try {
      const [reglas, niveles] = await Promise.all([
        apiRequest<PoliticaTutor>("/api/configuracion-tutor/reglas-sistema", token),
        apiRequest<ConfiguracionTutor[]>("/api/configuracion-tutor/niveles", token),
      ]);
      const ordenados = [...niveles].sort((a, b) => a.nivel - b.nivel);
      setPolitica(reglas);
      setConfiguraciones(ordenados);
      const seleccionado = ordenados.find((item) => item.nivel === nivelActivo) ?? ordenados[0];
      if (seleccionado) {
        setNivelActivo(seleccionado.nivel);
        setBorrador(structuredClone(seleccionado));
      }
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo cargar la configuración del tutor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!hydrated || !token) return;
    void cargar();
    // La selección inicial se resuelve con los datos recibidos del backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, token]);

  const configuracionActiva = useMemo(
    () => configuraciones.find((item) => item.nivel === nivelActivo),
    [configuraciones, nivelActivo],
  );

  function seleccionarNivel(nivel: number) {
    const configuracion = configuraciones.find((item) => item.nivel === nivel);
    if (!configuracion) return;
    setNivelActivo(nivel);
    setBorrador(structuredClone(configuracion));
    setMensaje("");
  }

  function actualizar<K extends keyof ConfiguracionTutor>(campo: K, valor: ConfiguracionTutor[K]) {
    setBorrador((actual) => (actual ? { ...actual, [campo]: valor } : actual));
  }

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !borrador) return;
    setGuardando(true);
    setMensaje("");
    try {
      const guardado = await apiRequest<ConfiguracionTutor>(
        `/api/configuracion-tutor/niveles/${borrador.nivel}`,
        token,
        { method: "PUT", body: JSON.stringify(borrador) },
      );
      setConfiguraciones((actuales) =>
        actuales.map((item) => (item.nivel === guardado.nivel ? guardado : item)),
      );
      setBorrador(structuredClone(guardado));
      setMensaje("Configuración pedagógica guardada y disponible para el tutor IA.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || !borrador) {
    return <div className="loading-card mt-5">Cargando reglas, evidencias y parámetros del tutor…</div>;
  }

  const exito = /guardada/i.test(mensaje);

  return (
    <div className="space-y-5">
      {mensaje ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${exito ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100" : "border-amber-300/20 bg-amber-400/10 text-amber-100"}`}>
          {mensaje}
        </div>
      ) : null}

      <section className="panel-card mt-5 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div className="max-w-3xl">
            <p className="section-kicker">Tutor situado · configuración por experiencia</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">La IA entiende lo que ocurre dentro del nivel</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Define qué acciones, objetos y evidencias debe interpretar. Las reglas de seguridad y evaluación permanecen protegidas en el código.
            </p>
          </div>
          <button className="secondary-button" onClick={() => void cargar()} type="button">
            <RefreshCw size={15} /> Actualizar
          </button>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {configuraciones.map((configuracion) => (
            <button
              className={`rounded-2xl border p-3 text-left transition ${nivelActivo === configuracion.nivel ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100" : "border-white/[.08] bg-slate-950/30 text-slate-400 hover:border-white/15"}`}
              key={configuracion.nivel}
              onClick={() => seleccionarNivel(configuracion.nivel)}
              type="button"
            >
              <span className="font-mono text-xs">NIVEL {String(configuracion.nivel).padStart(2, "0")}</span>
              <strong className="mt-1 block truncate text-sm">{configuracion.nombreNivel}</strong>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <form className="panel-card p-5 sm:p-6" onSubmit={guardar}>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.07] pb-5">
            <div>
              <p className="section-kicker">Nivel {borrador.nivel}</p>
              <h2 className="mt-2 text-xl font-semibold">{borrador.nombreNivel}</h2>
              <p className="mt-2 text-xs text-slate-500">
                Objetivo de tiempo: {segundosATiempo(borrador.tiempoObjetivoSegundos)} · Puntaje máximo: {borrador.puntajeMaximo}
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 py-2 text-sm text-slate-300">
              <input checked={borrador.activo} className="accent-emerald-300" onChange={(event) => actualizar("activo", event.target.checked)} type="checkbox" />
              Tutor activo
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="field-label">Nombre del nivel<input className={inputClass} value={borrador.nombreNivel} onChange={(event) => actualizar("nombreNivel", event.target.value)} /></label>
            <label className="field-label">Concepto central<input className={inputClass} value={borrador.conceptoCentral} onChange={(event) => actualizar("conceptoCentral", event.target.value)} /></label>
            <label className="field-label md:col-span-2">Objetivo del tutor<textarea className="field-input min-h-24 py-3 text-sm" value={borrador.objetivoTutor} onChange={(event) => actualizar("objetivoTutor", event.target.value)} /></label>
            <label className="field-label">Puntaje máximo<input className={inputClass} min={1} type="number" value={borrador.puntajeMaximo} onChange={(event) => actualizar("puntajeMaximo", Number(event.target.value))} /></label>
            <label className="field-label">Tiempo objetivo (segundos)<input className={inputClass} min={1} type="number" value={borrador.tiempoObjetivoSegundos} onChange={(event) => actualizar("tiempoObjetivoSegundos", Number(event.target.value))} /></label>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {listas.map(({ campo, titulo, ayuda }) => (
              <label className="field-label" key={campo}>
                {titulo}
                <textarea
                  className="field-input min-h-36 py-3 font-mono text-xs leading-5"
                  value={borrador[campo].join("\n")}
                  onChange={(event) => actualizar(campo, event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))}
                />
                <small className="text-[11px] font-normal leading-4 text-slate-500">{ayuda}</small>
              </label>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="field-label">Próximo ejercicio sugerido<textarea className="field-input min-h-28 py-3 text-sm" value={borrador.proximoEjercicio} onChange={(event) => actualizar("proximoEjercicio", event.target.value)} /></label>
            <label className="field-label">Orientación adicional<textarea className="field-input min-h-28 py-3 text-sm" value={borrador.promptAdicional} onChange={(event) => actualizar("promptAdicional", event.target.value)} /><small className="text-[11px] font-normal leading-4 text-slate-500">Complementa el nivel; no reemplaza las reglas protegidas.</small></label>
          </div>

          <button className="primary-button mt-6" disabled={guardando} type="submit">
            <Save size={16} /> {guardando ? "Guardando…" : "Guardar configuración del tutor"}
          </button>
        </form>

        <aside className="space-y-5">
          <section className="panel-card p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><BrainCircuit size={21} /></span>
              <div><p className="section-kicker">Salida del informe</p><h2 className="mt-1 font-semibold">Cinco bloques verificables</h2></div>
            </div>
            <ol className="mt-4 space-y-2">
              {(politica?.seccionesReporte ?? []).map((seccion, indice) => (
                <li className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.025] px-3 py-2.5 text-sm text-slate-300" key={seccion}>
                  <span className="font-mono text-xs text-emerald-300">0{indice + 1}</span>{seccion.replaceAll(/([A-Z])/g, " $1").toLowerCase()}
                </li>
              ))}
            </ol>
          </section>

          <section className="panel-card p-5">
            <div className="flex items-center gap-3"><LockKeyhole className="text-amber-200" size={19} /><div><p className="section-kicker">Política {politica?.version}</p><h2 className="mt-1 font-semibold">Reglas protegidas</h2></div></div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Estas reglas viven en el código y ninguna orientación del nivel puede reemplazarlas.</p>
            <ul className="mt-4 space-y-3">
              {(politica?.reglas ?? []).map((regla) => (
                <li className="flex gap-2 text-xs leading-5 text-slate-400" key={regla}><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={14} />{regla}</li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-emerald-300/15 bg-gradient-to-br from-emerald-300/10 to-cyan-300/[.04] p-5">
            <Sparkles className="text-emerald-200" size={20} />
            <h3 className="mt-3 font-semibold text-white">Estado del nivel</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{configuracionActiva?.criteriosDominio.length ?? 0} criterios de dominio, {configuracionActiva?.pistasTutor.length ?? 0} pistas y {configuracionActiva?.erroresObservables.length ?? 0} errores observables configurados.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
