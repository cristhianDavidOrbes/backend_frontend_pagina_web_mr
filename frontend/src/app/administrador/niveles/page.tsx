"use client";

import { Layers3, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";

type Nivel = {
  id: number;
  nombre: string;
  descripcion: string;
  nivel: number;
  objetivo?: string;
  activo?: boolean;
};

type NivelForm = {
  id: number | null;
  nombre: string;
  descripcion: string;
  nivel: string;
  objetivo: string;
  activo: boolean;
};

const inputClass = "field-input text-sm";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const nivelInicial: NivelForm = {
  id: null,
  nombre: "",
  descripcion: "",
  nivel: "1",
  objetivo: "",
  activo: true,
};

export default function AdministradorNivelesPage() {
  const { hydrated, token } = useAuthSession();
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [mensaje, setMensaje] = useState("");
  const [datosCargados, setDatosCargados] = useState(false);
  const [nivelForm, setNivelForm] = useState<NivelForm>(nivelInicial);

  useEffect(() => {
    if (!hydrated || !token) return;

    async function cargarDatos() {
      try {
        const data = await apiRequest<Nivel[]>("/api/niveles", token as string);
        setNiveles(data);
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "Error al cargar niveles.");
      } finally {
        setDatosCargados(true);
      }
    }

    void cargarDatos();
  }, [hydrated, token]);

  async function guardarNivel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje("");

    const payload = {
      nombre: nivelForm.nombre,
      descripcion: nivelForm.descripcion,
      nivel: Number(nivelForm.nivel),
      objetivo: nivelForm.objetivo || null,
      activo: nivelForm.activo,
    };

    try {
      if (nivelForm.id) {
        const nivelActualizado = await apiRequest<Nivel>(
          `/api/niveles/${nivelForm.id}`,
          token as string,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          },
        );

        setNiveles((actuales) =>
          actuales.map((nivel) => (nivel.id === nivelActualizado.id ? nivelActualizado : nivel)),
        );
        setMensaje("Nivel actualizado correctamente.");
      } else {
        const nivelCreado = await apiRequest<Nivel>("/api/niveles", token as string, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setNiveles((actuales) => [...actuales, nivelCreado]);
        setMensaje("Nivel creado correctamente.");
      }

      setNivelForm(nivelInicial);
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo guardar el nivel.");
    }
  }

  async function eliminarNivel(id: number) {
    setMensaje("");

    try {
      await apiRequest<null>(`/api/niveles/${id}`, token as string, {
        method: "DELETE",
      });

      setNiveles((actuales) => actuales.filter((nivel) => nivel.id !== id));
      setMensaje("Nivel eliminado correctamente.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo eliminar el nivel.");
    }
  }

  function editarNivel(nivel: Nivel) {
    setNivelForm({
      id: nivel.id,
      nombre: nivel.nombre,
      descripcion: nivel.descripcion,
      nivel: String(nivel.nivel),
      objetivo: nivel.objetivo ?? "",
      activo: nivel.activo ?? true,
    });
  }

  const mensajeExito = /correctamente/i.test(mensaje);
  const cargando = hydrated && Boolean(token) && !datosCargados;

  return (
    <>
      {mensaje ? (
        <div
          aria-live="polite"
          className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
            mensajeExito
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-400/10 text-amber-100"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              mensajeExito ? "bg-emerald-300" : "bg-amber-300"
            }`}
          />
          {mensaje}
        </div>
      ) : null}

      <section className="panel-card mt-5 overflow-hidden p-5 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="lg:border-r lg:border-white/[.07] lg:pr-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="section-kicker">Constructor pedagógico</p>
                <h2 className="mt-2 text-xl font-semibold">
                  {nivelForm.id ? "Editar experiencia" : "Crear experiencia"}
                </h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/[.07] text-cyan-200">
                {nivelForm.id ? <Pencil size={18} /> : <Plus size={18} />}
              </span>
            </div>

            <form className="mt-5 space-y-4" onSubmit={guardarNivel}>
              <label className="field-label" htmlFor="nivel-nombre">
                Nombre
                <input
                  className={inputClass}
                  id="nivel-nombre"
                  value={nivelForm.nombre}
                  onChange={(event) =>
                    setNivelForm((actual) => ({ ...actual, nombre: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="field-label" htmlFor="nivel-descripcion">
                Descripción
                <textarea
                  className="field-input min-h-28 py-3 text-sm"
                  id="nivel-descripcion"
                  value={nivelForm.descripcion}
                  onChange={(event) =>
                    setNivelForm((actual) => ({
                      ...actual,
                      descripcion: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-[110px_1fr] lg:grid-cols-1 xl:grid-cols-[110px_1fr]">
                <label className="field-label" htmlFor="nivel-numero">
                  Nivel
                  <input
                    className={inputClass}
                    id="nivel-numero"
                    min="1"
                    type="number"
                    value={nivelForm.nivel}
                    onChange={(event) =>
                      setNivelForm((actual) => ({ ...actual, nivel: event.target.value }))
                    }
                    required
                  />
                </label>

                <label className="field-label" htmlFor="nivel-objetivo">
                  Objetivo
                  <input
                    className={inputClass}
                    id="nivel-objetivo"
                    value={nivelForm.objetivo}
                    onChange={(event) =>
                      setNivelForm((actual) => ({ ...actual, objetivo: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[.08] bg-slate-950/35 px-3 py-3 text-sm text-slate-300">
                <span>
                  <strong className="block text-slate-100">Experiencia activa</strong>
                  <small className="mt-0.5 block text-slate-500">Visible para web y gafas</small>
                </span>
                <input
                  checked={nivelForm.activo}
                  className="h-4 w-4 accent-emerald-300"
                  onChange={(event) =>
                    setNivelForm((actual) => ({ ...actual, activo: event.target.checked }))
                  }
                  type="checkbox"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  className={`${buttonClass} bg-emerald-300 text-slate-950 hover:bg-emerald-200`}
                  type="submit"
                >
                  <Save size={15} /> Guardar nivel
                </button>
                <button
                  className={`${buttonClass} border border-white/10 bg-white/[.035] text-slate-300 hover:bg-white/[.07]`}
                  type="button"
                  onClick={() => setNivelForm(nivelInicial)}
                >
                  <RotateCcw size={15} /> Limpiar
                </button>
              </div>
            </form>
          </div>

          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Mapa de experiencias</p>
                <h2 className="mt-2 text-xl font-semibold">Niveles publicados</h2>
              </div>
              <span className="count-badge">{niveles.length}</span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {niveles.map((nivel) => (
                <article
                  className="group relative overflow-hidden rounded-2xl border border-white/[.08] bg-slate-950/35 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20 hover:bg-emerald-300/[.035]"
                  key={nivel.id}
                >
                  <div className="absolute -right-5 -top-7 font-mono text-8xl font-black text-white/[.025]">
                    {nivel.nivel}
                  </div>
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[.07] font-mono text-sm font-bold text-emerald-200">
                        {String(nivel.nivel).padStart(2, "0")}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] ${
                          nivel.activo !== false
                            ? "border-emerald-300/20 bg-emerald-300/[.08] text-emerald-200"
                            : "border-slate-300/10 bg-white/[.03] text-slate-500"
                        }`}
                      >
                        {nivel.activo !== false ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold text-slate-100">{nivel.nombre}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                      {nivel.descripcion}
                    </p>
                    {nivel.objetivo ? (
                      <p className="mt-3 border-l border-cyan-300/25 pl-3 text-xs leading-5 text-cyan-100/70">
                        {nivel.objetivo}
                      </p>
                    ) : null}
                    <div className="mt-4 flex gap-2 border-t border-white/[.06] pt-3">
                      <button
                        className={`${buttonClass} flex-1 border border-white/10 bg-white/[.035] text-slate-300 hover:border-emerald-300/20 hover:text-emerald-200`}
                        type="button"
                        onClick={() => editarNivel(nivel)}
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        aria-label={`Borrar ${nivel.nombre}`}
                        className="grid h-10 w-10 place-items-center rounded-xl border border-rose-300/15 bg-rose-400/[.06] text-rose-300 transition hover:bg-rose-400/15"
                        type="button"
                        onClick={() => eliminarNivel(nivel.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!niveles.length && !cargando ? (
              <div className="empty-state mt-5">
                <Layers3 size={22} />
                <p>Crea el primer nivel para publicarlo en la experiencia.</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
