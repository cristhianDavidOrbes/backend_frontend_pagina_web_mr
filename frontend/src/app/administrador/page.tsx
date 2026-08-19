"use client";

import Link from "next/link";
import {
  Activity,
  BookOpen,
  GraduationCap,
  Layers3,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ProfileEditor } from "@/components/profile-editor";
import { saveAuthUser, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type Rol = "ESTUDIANTE" | "DOCENTE" | "ADMINISTRADOR";

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  nivelActual: number;
  puntaje: number;
};

type Nivel = {
  id: number;
  nombre: string;
  descripcion: string;
  nivel: number;
  objetivo?: string;
  activo?: boolean;
};

type UsuarioForm = {
  id: number | null;
  nombre: string;
  correo: string;
  rol: Rol;
  nivelActual: string;
  puntaje: string;
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

const usuarioInicial: UsuarioForm = {
  id: null,
  nombre: "",
  correo: "",
  rol: "ESTUDIANTE",
  nivelActual: "1",
  puntaje: "0",
};

const nivelInicial: NivelForm = {
  id: null,
  nombre: "",
  descripcion: "",
  nivel: "1",
  objetivo: "",
  activo: true,
};

export default function AdministradorPage() {
  const { hydrated, token, usuario: usuarioActual } = useAuthSession();
  const [perfilActual, setPerfilActual] = useState<UsuarioSesion | null>(usuarioActual);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [niveles, setNiveles] = useState<Nivel[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [datosCargados, setDatosCargados] = useState(false);
  const [usuarioForm, setUsuarioForm] = useState<UsuarioForm>(usuarioInicial);
  const [nivelForm, setNivelForm] = useState<NivelForm>(nivelInicial);

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
    if (!hydrated || !token) {
      return;
    }

    async function cargarDatosIniciales() {
      try {
        const [usuariosRespuesta, nivelesRespuesta] = await Promise.all([
          fetch("/api/usuarios", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("/api/niveles", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const usuariosDatos = await usuariosRespuesta.json();
        const nivelesDatos = await nivelesRespuesta.json();

        if (!usuariosRespuesta.ok) {
          throw new Error(usuariosDatos.mensaje ?? "No se pudieron cargar los usuarios.");
        }

        if (!nivelesRespuesta.ok) {
          throw new Error(nivelesDatos.mensaje ?? "No se pudieron cargar los niveles.");
        }

        setUsuarios(usuariosDatos as Usuario[]);
        setNiveles(nivelesDatos as Nivel[]);
      } catch (error) {
        setMensaje(error instanceof Error ? error.message : "Error al cargar datos.");
      } finally {
        setDatosCargados(true);
      }
    }

    void cargarDatosIniciales();
  }, [hydrated, token]);

  async function api<T>(path: string, options: RequestInit = {}) {
    const respuesta = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const texto = await respuesta.text();
    const datos = texto ? JSON.parse(texto) : null;

    if (!respuesta.ok) {
      throw new Error(datos?.mensaje ?? "La operacion no se pudo completar.");
    }

    return datos as T;
  }

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
      const usuarioActualizado = await api<Usuario>(`/api/usuarios/${usuarioForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          nombre: usuarioForm.nombre,
          correo: usuarioForm.correo,
          rol: usuarioForm.rol,
          nivelActual: Number(usuarioForm.nivelActual),
          puntaje: Number(usuarioForm.puntaje),
        }),
      });

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
      await api<null>(`/api/usuarios/${id}`, {
        method: "DELETE",
      });

      setUsuarios((actuales) => actuales.filter((usuario) => usuario.id !== id));
      setMensaje("Usuario eliminado correctamente.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    }
  }

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
        const nivelActualizado = await api<Nivel>(`/api/niveles/${nivelForm.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setNiveles((actuales) =>
          actuales.map((nivel) => (nivel.id === nivelActualizado.id ? nivelActualizado : nivel)),
        );
        setMensaje("Nivel actualizado correctamente.");
      } else {
        const nivelCreado = await api<Nivel>("/api/niveles", {
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
      await api<null>(`/api/niveles/${id}`, {
        method: "DELETE",
      });

      setNiveles((actuales) => actuales.filter((nivel) => nivel.id !== id));
      setMensaje("Nivel eliminado correctamente.");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo eliminar el nivel.");
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

  const perfilActivo = perfilActual ?? usuarioActual;
  const accesoDenegado = perfilActivo && perfilActivo.rol !== "ADMINISTRADOR";
  const mensajeVisible =
    mensaje || (hydrated && !token ? "Inicia sesión como administrador para entrar." : "");
  const cargando = hydrated && Boolean(token) && !datosCargados;
  const estudiantes = usuarios.filter((usuario) => usuario.rol === "ESTUDIANTE").length;
  const docentes = usuarios.filter((usuario) => usuario.rol === "DOCENTE").length;
  const administradores = usuarios.filter((usuario) => usuario.rol === "ADMINISTRADOR").length;
  const nivelesActivos = niveles.filter((nivel) => nivel.activo !== false).length;
  const mensajeExito = /correctamente/i.test(mensajeVisible);

  if (!perfilActivo) {
    return (
      <main className="app-surface grid min-h-screen place-items-center p-6">
        <div className="loading-card">
          {hydrated && !token
            ? "Inicia sesión como administrador para entrar al núcleo de control."
            : "Sincronizando permisos y telemetría…"}
        </div>
      </main>
    );
  }

  return (
    <AppShell eyebrow="Núcleo administrativo" title="Centro de mando" usuario={perfilActivo}>
      {mensajeVisible ? (
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
          {mensajeVisible}
        </div>
      ) : null}

      {accesoDenegado ? (
        <section className="panel-card grid min-h-72 place-items-center overflow-hidden p-8 text-center">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="relative max-w-lg">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-200">
              <ShieldCheck size={30} />
            </span>
            <p className="section-kicker mt-5">Permiso insuficiente</p>
            <h2 className="mt-2 text-2xl font-semibold">Este núcleo está reservado al equipo administrador.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Cambia a una cuenta con privilegios administrativos para gestionar usuarios y niveles.
            </p>
            <Link
              className={`${buttonClass} mt-5 bg-emerald-300 text-slate-950 hover:bg-emerald-200`}
              href="/iniciar-sesion"
            >
              <UserCog size={16} /> Cambiar usuario
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="hero-dashboard lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[.18em] text-emerald-300">
                <Activity className="animate-pulse" size={15} /> Sistema operativo
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-semibold leading-tight sm:text-3xl">
                Controla la ruta pedagógica que vive dentro de las gafas.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Administra identidades, roles, puntajes y experiencias de programación orientada a
                objetos desde una consola conectada en tiempo real con AlgoLab.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  className={`${buttonClass} bg-emerald-300 text-slate-950 shadow-[0_12px_34px_rgba(52,211,153,.18)] hover:-translate-y-0.5 hover:bg-emerald-200`}
                  href="#usuarios"
                >
                  <Users size={16} /> Gestionar usuarios
                </a>
                <Link
                  className={`${buttonClass} border border-white/10 bg-white/[.04] text-slate-200 hover:border-emerald-300/25 hover:bg-emerald-300/10`}
                  href="/iniciar-sesion"
                >
                  <UserCog size={16} /> Cambiar usuario
                </Link>
              </div>
            </div>

            <div className="relative z-10 hidden min-h-48 place-items-center lg:grid">
              <div className="absolute h-40 w-40 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-emerald-300/25" />
              <div className="absolute h-28 w-28 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-cyan-300/20" />
              <div className="grid h-20 w-20 place-items-center rounded-3xl border border-emerald-300/30 bg-emerald-300/10 shadow-[0_0_60px_rgba(52,211,153,.16)]">
                <ShieldCheck className="text-emerald-200" size={34} />
              </div>
              <span className="absolute bottom-1 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 font-mono text-[10px] uppercase tracking-[.16em] text-slate-400">
                permisos verificados
              </span>
            </div>
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={<GraduationCap size={18} />}
              label="Estudiantes"
              note="Explorando la ruta POO"
              value={estudiantes}
            />
            <MetricTile
              icon={<Users size={18} />}
              label="Docentes"
              note="Acompañamiento activo"
              value={docentes}
            />
            <MetricTile
              icon={<BookOpen size={18} />}
              label="Niveles activos"
              note={`${niveles.length} experiencias configuradas`}
              value={nivelesActivos}
            />
            <MetricTile
              icon={<ShieldCheck size={18} />}
              label="Administradores"
              note={`${usuarios.length} identidades sincronizadas`}
              value={administradores}
            />
          </section>

          <div
            className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]"
            id="usuarios"
          >
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

          {token ? (
            <div className="mt-5">
              <ProfileEditor
                token={token}
                usuario={perfilActivo}
                onSaved={(perfil) => {
                  setPerfilActual(perfil);
                  saveAuthUser(perfil);
                }}
              />
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function MetricTile({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="metric-card group transition duration-300 hover:-translate-y-0.5 hover:border-emerald-300/20">
      <span className="flex items-center justify-between gap-3">
        {label}
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-300/[.08] text-emerald-200 transition group-hover:bg-emerald-300/[.14]">
          {icon}
        </span>
      </span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
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
