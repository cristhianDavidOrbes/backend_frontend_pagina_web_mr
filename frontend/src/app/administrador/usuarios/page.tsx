"use client";

import { Pencil, RotateCcw, Save, Search, Trash2, UserCog } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuthSession } from "@/lib/use-auth-session";
import { apiRequest } from "@/lib/client-api";

type Rol = "ESTUDIANTE" | "DOCENTE" | "ADMINISTRADOR";

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  nivelActual: number;
  puntaje: number;
};

type UsuarioForm = {
  id: number | null;
  nombre: string;
  correo: string;
  rol: Rol;
  nivelActual: string;
  puntaje: string;
};

const inputClass = "field-input text-sm";
const buttonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const usuarioInicial: UsuarioForm = {
  id: null,
  nombre: "",
  correo: "",
  rol: "ESTUDIANTE",
  nivelActual: "1",
  puntaje: "0",
};

export default function AdministradorUsuariosPage() {
  const { hydrated, token, usuario: usuarioActual } = useAuthSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [datosCargados, setDatosCargados] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>(usuarioInicial);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return usuarios;
    }

    return usuarios.filter((usuario) =>
      `${usuario.nombre} ${usuario.correo} ${usuario.rol}`.toLowerCase().includes(texto),
    );
  }, [busqueda, usuarios]);

  useEffect(() => {
    if (!hydrated || !token) return;

    async function cargarDatos() {
      try {
        const data = await apiRequest<Usuario[]>("/api/usuarios", token as string);
        setUsuarios(data);
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "Error al cargar usuarios.");
      } finally {
        setDatosCargados(true);
      }
    }

    void cargarDatos();
  }, [hydrated, token]);

  async function guardarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensaje("");

    if (!usuarioForm.id) {
      setMensaje("Selecciona un usuario para editarlo.");
      return;
    }

    if (usuarioActual?.id === usuarioForm.id && usuarioForm.rol !== "ADMINISTRADOR") {
      setMensaje("No puedes quitarte tu propio rol de administrador.");
      return;
    }

    try {
      const usuarioActualizado = await apiRequest<Usuario>(
        `/api/usuarios/${usuarioForm.id}`,
        token as string,
        {
          method: "PUT",
          body: JSON.stringify({
            nombre: usuarioForm.nombre,
            correo: usuarioForm.correo,
            rol: usuarioForm.rol,
            nivelActual: Number(usuarioForm.nivelActual),
            puntaje: Number(usuarioForm.puntaje),
          }),
        },
      );

      setUsuarios((actuales) =>
        actuales.map((usuario) =>
          usuario.id === usuarioActualizado.id ? usuarioActualizado : usuario,
        ),
      );
      setUsuarioForm(usuarioInicial);
      setMensaje("Usuario actualizado correctamente.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo actualizar el usuario.");
    }
  }

  async function eliminarUsuario(id: number) {
    setMensaje("");

    if (usuarioActual?.id === id) {
      setMensaje("No puedes borrar tu propia cuenta de administrador.");
      return;
    }

    try {
      await apiRequest<null>(`/api/usuarios/${id}`, token as string, {
        method: "DELETE",
      });

      setUsuarios((actuales) => actuales.filter((usuario) => usuario.id !== id));
      setMensaje("Usuario eliminado correctamente.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    }
  }

  function editarUsuario(usuario: Usuario) {
    setUsuarioForm({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      nivelActual: String(usuario.nivelActual ?? 0),
      puntaje: String(usuario.puntaje ?? 0),
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

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
        <section className="panel-card min-w-0 overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Directorio sincronizado</p>
              <h2 className="mt-2 text-xl font-semibold">Usuarios de AlgoLab</h2>
              <p className="mt-1 text-sm text-slate-400">
                Cambia roles, progreso o acceso sin salir de la consola.
              </p>
            </div>
            <label className="relative w-full sm:w-72">
              <span className="sr-only">Buscar usuarios</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={16}
              />
              <input
                className="field-input mt-0 pl-10 text-sm"
                placeholder="Nombre, correo o rol"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
              />
            </label>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[.07]">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-white/[.035] text-[11px] uppercase tracking-[.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Identidad</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Nivel</th>
                  <th className="px-4 py-3 font-semibold">Puntaje</th>
                  <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => (
                  <tr
                    className="border-t border-white/[.06] transition hover:bg-emerald-300/[.035]"
                    key={usuario.id}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[.07] font-mono text-xs font-bold text-emerald-200">
                          {usuario.nombre.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate font-medium text-slate-100">
                            {usuario.nombre}
                          </strong>
                          <small className="block truncate text-slate-500">{usuario.correo}</small>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <RoleBadge role={usuario.rol} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {usuario.nivelActual ?? 0}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-200">
                      {usuario.puntaje ?? 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button
                          aria-label={`Editar a ${usuario.nombre}`}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300 transition hover:border-emerald-300/25 hover:bg-emerald-300/10 hover:text-emerald-200"
                          type="button"
                          onClick={() => editarUsuario(usuario)}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          aria-label={`Borrar a ${usuario.nombre}`}
                          className="grid h-9 w-9 place-items-center rounded-xl border border-rose-300/15 bg-rose-400/[.06] text-rose-300 transition hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-30"
                          type="button"
                          disabled={usuarioActual?.id === usuario.id}
                          onClick={() => eliminarUsuario(usuario.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {cargando ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
              Cargando telemetría de usuarios…
            </div>
          ) : null}
          {!cargando && !usuariosFiltrados.length ? (
            <div className="empty-state mt-4">
              <Search size={20} />
              <p>No hay identidades que coincidan con la búsqueda.</p>
            </div>
          ) : null}
        </section>

        <section className="panel-card p-5 sm:p-6 xl:sticky xl:top-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="section-kicker">Editor de identidad</p>
              <h2 className="mt-2 text-xl font-semibold">
                {usuarioForm.id ? "Modificar usuario" : "Selecciona un usuario"}
              </h2>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[.07] text-emerald-200">
              <UserCog size={19} />
            </span>
          </div>
          <form className="mt-5 space-y-4" onSubmit={guardarUsuario}>
            <label className="field-label" htmlFor="usuario-nombre">
              Nombre
              <input
                className={inputClass}
                id="usuario-nombre"
                value={usuarioForm.nombre}
                onChange={(event) =>
                  setUsuarioForm((actual) => ({ ...actual, nombre: event.target.value }))
                }
                required
              />
            </label>

            <label className="field-label" htmlFor="usuario-correo">
              Correo
              <input
                className={inputClass}
                id="usuario-correo"
                type="email"
                value={usuarioForm.correo}
                onChange={(event) =>
                  setUsuarioForm((actual) => ({ ...actual, correo: event.target.value }))
                }
                required
              />
            </label>

            <label className="field-label" htmlFor="usuario-rol">
              Rol
              <select
                className={inputClass}
                id="usuario-rol"
                value={usuarioForm.rol}
                disabled={usuarioActual?.id === usuarioForm.id}
                onChange={(event) =>
                  setUsuarioForm((actual) => ({
                    ...actual,
                    rol: event.target.value as Rol,
                  }))
                }
              >
                <option value="ESTUDIANTE">ESTUDIANTE</option>
                <option value="DOCENTE">DOCENTE</option>
                <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              </select>
            </label>
            {usuarioActual?.id === usuarioForm.id ? (
              <p className="rounded-xl border border-amber-300/15 bg-amber-300/[.06] px-3 py-2 text-xs leading-5 text-amber-100/80">
                Tu rango está protegido mientras administras esta sesión.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="field-label" htmlFor="usuario-nivel-actual">
                Nivel actual
                <input
                  className={inputClass}
                  id="usuario-nivel-actual"
                  max="6"
                  min="1"
                  type="number"
                  value={usuarioForm.nivelActual}
                  onChange={(event) =>
                    setUsuarioForm((actual) => ({
                      ...actual,
                      nivelActual: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="field-label" htmlFor="usuario-puntaje">
                Puntaje
                <input
                  className={inputClass}
                  id="usuario-puntaje"
                  step="1"
                  type="number"
                  value={usuarioForm.puntaje}
                  onChange={(event) =>
                    setUsuarioForm((actual) => ({ ...actual, puntaje: event.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className={`${buttonClass} bg-emerald-300 text-slate-950 hover:bg-emerald-200`}
                type="submit"
              >
                <Save size={15} /> Guardar usuario
              </button>
              <button
                className={`${buttonClass} border border-white/10 bg-white/[.035] text-slate-300 hover:bg-white/[.07]`}
                type="button"
                onClick={() => setUsuarioForm(usuarioInicial)}
              >
                <RotateCcw size={15} /> Limpiar
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

function RoleBadge({ role }: { role: Rol }) {
  const clases = {
    ESTUDIANTE: "border-cyan-300/15 bg-cyan-300/[.07] text-cyan-200",
    DOCENTE: "border-violet-300/15 bg-violet-300/[.07] text-violet-200",
    ADMINISTRADOR: "border-emerald-300/15 bg-emerald-300/[.07] text-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] ${clases[role]}`}
    >
      {role}
    </span>
  );
}
