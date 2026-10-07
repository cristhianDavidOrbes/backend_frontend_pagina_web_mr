"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Check, Pencil, Search, Trash2, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { EASE_OUT, Swap } from "@/components/reveal";
import { AnimatedNotice, Dialog, EmptyState, PageHead, Segmented, Spinner, type Tone } from "@/components/ui";
import { apiRequest } from "@/lib/client-api";
import { useAuthSession } from "@/lib/use-auth-session";

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
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  nivelActual: string;
  puntaje: string;
};

const ROLES: Record<Rol, string> = { ESTUDIANTE: "Estudiante", DOCENTE: "Docente", ADMINISTRADOR: "Administrador" };

function aFormulario(u: Usuario): UsuarioForm {
  return { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, nivelActual: String(u.nivelActual ?? 1), puntaje: String(u.puntaje ?? 0) };
}

export default function AdministradorUsuariosPage() {
  const reduce = useReducedMotion();
  const { hydrated, token, usuario: usuarioActual } = useAuthSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [rolFiltro, setRolFiltro] = useState<Rol | "TODOS">("TODOS");
  const [mensaje, setMensaje] = useState<{ texto: string; tono: Tone }>({ texto: "", tono: "info" });
  const [datosCargados, setDatosCargados] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [reintentos, setReintentos] = useState(0);

  const [form, setForm] = useState<UsuarioForm | null>(null);
  const [original, setOriginal] = useState<UsuarioForm | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<"editar" | "eliminar">("editar");
  const [errorModal, setErrorModal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (rolFiltro !== "TODOS" && u.rol !== rolFiltro) return false;
      return !texto || `${u.nombre} ${u.correo} ${u.rol}`.toLowerCase().includes(texto);
    });
  }, [busqueda, usuarios, rolFiltro]);

  useEffect(() => {
    if (!hydrated || !token) return;
    async function cargarDatos() {
      setDatosCargados(false);
      setErrorCarga(false);
      setMensaje({ texto: "", tono: "info" });
      try {
        const data = await apiRequest<Usuario[]>("/api/usuarios", token as string);
        setUsuarios(data);
      } catch (error) {
        setErrorCarga(true);
        setMensaje({ texto: error instanceof Error ? error.message : "No se pudieron cargar los usuarios.", tono: "error" });
      } finally {
        setDatosCargados(true);
      }
    }
    void cargarDatos();
  }, [hydrated, token, reintentos]);

  const ocupado = guardando || borrando;
  const esPropio = form !== null && usuarioActual?.id === form.id;
  const cambios = form !== null && JSON.stringify(form) !== JSON.stringify(original);

  function abrir(u: Usuario) {
    const datos = aFormulario(u);
    setForm(datos);
    setOriginal(datos);
    setVista("editar");
    setErrorModal("");
    setAbierto(true);
  }

  function cerrar() {
    if (ocupado) return;
    setAbierto(false);
  }

  async function guardarUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    if (esPropio && form.rol !== "ADMINISTRADOR") {
      setErrorModal("No puedes quitarte tu propio rol de administrador.");
      return;
    }
    setGuardando(true);
    setErrorModal("");
    try {
      const actualizado = await apiRequest<Usuario>(`/api/usuarios/${form.id}`, token as string, {
        method: "PUT",
        body: JSON.stringify({
          nombre: form.nombre,
          correo: form.correo,
          rol: form.rol,
          nivelActual: Number(form.nivelActual),
          puntaje: Number(form.puntaje),
        }),
      });
      setUsuarios((actuales) => actuales.map((u) => (u.id === actualizado.id ? actualizado : u)));
      setMensaje({ texto: `Se guardaron los cambios de ${actualizado.nombre}.`, tono: "success" });
      setAbierto(false);
    } catch (error) {
      setErrorModal(error instanceof Error ? `No se guardó: ${error.message}` : "No se pudo actualizar el usuario.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarUsuario() {
    if (!form) return;
    if (esPropio) {
      setErrorModal("No puedes borrar tu propia cuenta de administrador.");
      setVista("editar");
      return;
    }
    setBorrando(true);
    setErrorModal("");
    try {
      await apiRequest<null>(`/api/usuarios/${form.id}`, token as string, { method: "DELETE" });
      setUsuarios((actuales) => actuales.filter((u) => u.id !== form.id));
      setMensaje({ texto: `Se eliminó a ${original?.nombre ?? form.nombre}.`, tono: "success" });
      setAbierto(false);
    } catch (error) {
      setErrorModal(error instanceof Error ? `No se eliminó: ${error.message}` : "No se pudo eliminar el usuario.");
      setVista("editar");
    } finally {
      setBorrando(false);
    }
  }

  const cargando = hydrated && Boolean(token) && !datosCargados;
  const conteo = (rol: Rol) => usuarios.filter((u) => u.rol === rol).length;

  return (
    <div>
      <PageHead description="Busca a una persona y presiona Editar para cambiar su rol o su progreso." title="Usuarios" />
      <AnimatedNotice
        action={errorCarga ? <button className="btn btn-secondary btn-sm" onClick={() => setReintentos((n) => n + 1)} type="button">Reintentar</button> : undefined}
        className="mb-5"
        message={mensaje.texto}
        onDismiss={() => setMensaje({ texto: "", tono: "info" })}
        tone={mensaje.tono}
      />

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line/10 p-4">
          <label className="input-with-icon min-w-[220px] flex-1">
            <Search size={18} />
            <span className="sr-only">Buscar usuarios</span>
            <input className="field-input" onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o correo" value={busqueda} />
          </label>
          <Segmented
            label="Filtrar por rol"
            onChange={setRolFiltro}
            options={[
              { value: "TODOS", label: `Todos ${usuarios.length}` },
              { value: "ESTUDIANTE", label: `Estudiantes ${conteo("ESTUDIANTE")}` },
              { value: "DOCENTE", label: `Docentes ${conteo("DOCENTE")}` },
              { value: "ADMINISTRADOR", label: `Admin ${conteo("ADMINISTRADOR")}` },
            ]}
            size="sm"
            value={rolFiltro}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="table min-w-[640px]">
            <thead>
              <tr>
                <th>Persona</th>
                <th>Rol</th>
                <th>Nivel</th>
                <th>Puntaje</th>
                <th className="text-right"><span className="sr-only">Editar</span></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {usuariosFiltrados.map((u) => (
                  <motion.tr
                    animate={{ opacity: 1 }}
                    aria-selected={abierto && form?.id === u.id}
                    exit={{ opacity: 0, x: reduce ? 0 : -12 }}
                    initial={{ opacity: 0 }}
                    key={u.id}
                    transition={{ duration: 0.25, ease: EASE_OUT }}
                  >
                    <td>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="avatar-display avatar-orbita" aria-hidden="true">{u.nombre.charAt(0).toUpperCase()}</span>
                        <span className="min-w-0">
                          <strong className="block truncate font-extrabold">{u.nombre}{usuarioActual?.id === u.id ? " (tú)" : ""}</strong>
                          <small className="subtle block truncate font-semibold">{u.correo}</small>
                        </span>
                      </div>
                    </td>
                    <td><RoleBadge role={u.rol} /></td>
                    <td className="num font-bold">{u.nivelActual ?? 1}</td>
                    <td className="num font-bold text-action">{u.puntaje ?? 0}</td>
                    <td className="text-right">
                      <button aria-label={`Editar a ${u.nombre}`} className="btn btn-secondary btn-sm" onClick={() => abrir(u)} type="button">
                        <Pencil size={15} /> Editar
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {cargando ? <div className="loading-card m-4">Cargando usuarios…</div> : null}
        {!cargando && !errorCarga && !usuariosFiltrados.length ? (
          <div className="p-4"><EmptyState icon={<Users size={26} />} title="Sin coincidencias">Prueba con otro nombre o rol.</EmptyState></div>
        ) : null}
      </section>

      <Dialog busy={ocupado} onClose={cerrar} open={abierto} title={vista === "eliminar" ? "¿Eliminar usuario?" : "Editar usuario"} width={520}>
        {form ? (
          <Swap direction={vista === "eliminar" ? 1 : -1} swapKey={vista}>
            {vista === "editar" ? (
              <form className="grid gap-4" onSubmit={guardarUsuario}>
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="avatar-display avatar-orbita" aria-hidden="true">{(original?.nombre ?? form.nombre).charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate font-extrabold">{original?.nombre}</strong>
                    <small className="subtle block truncate font-semibold">{original?.correo}</small>
                  </div>
                  <span className={`save-state ${cambios ? "is-dirty" : ""}`}>{cambios ? "● Sin guardar" : "Sin cambios"}</span>
                </div>

                {errorModal ? <p className="notice notice-error" role="alert">{errorModal}</p> : null}

                <label className="field-label" htmlFor="usuario-nombre">
                  Nombre
                  <input className="field-input" data-autofocus id="usuario-nombre" onChange={(e) => setForm({ ...form, nombre: e.target.value })} required value={form.nombre} />
                </label>
                <label className="field-label" htmlFor="usuario-correo">
                  Correo
                  <input className="field-input" id="usuario-correo" onChange={(e) => setForm({ ...form, correo: e.target.value })} required type="email" value={form.correo} />
                </label>
                <label className="field-label" htmlFor="usuario-rol">
                  Rol
                  <select className="field-input" disabled={esPropio} id="usuario-rol" onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })} value={form.rol}>
                    {(Object.keys(ROLES) as Rol[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
                  </select>
                  {esPropio ? <span className="field-help">Tu propio rol está protegido.</span> : null}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="field-label" htmlFor="usuario-nivel-actual">
                    Nivel actual
                    <input className="field-input" id="usuario-nivel-actual" max="6" min="1" onChange={(e) => setForm({ ...form, nivelActual: e.target.value })} required type="number" value={form.nivelActual} />
                  </label>
                  <label className="field-label" htmlFor="usuario-puntaje">
                    Puntaje
                    <input className="field-input" id="usuario-puntaje" min="0" onChange={(e) => setForm({ ...form, puntaje: e.target.value })} required step="1" type="number" value={form.puntaje} />
                  </label>
                </div>
                <p className="field-help -mt-2">La ruta en gafas tiene 4 niveles; 5 y 6 siguen en diseño.</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {!esPropio ? (
                    <button className="btn btn-ghost text-danger" disabled={ocupado} onClick={() => { setErrorModal(""); setVista("eliminar"); }} type="button">
                      <Trash2 size={16} /> Eliminar
                    </button>
                  ) : null}
                  <span className="flex-1" />
                  <button className="btn btn-secondary" disabled={ocupado} onClick={cerrar} type="button">Cancelar</button>
                  <button className="btn btn-primary" disabled={ocupado || !cambios} type="submit">
                    {guardando ? <><Spinner /> Guardando…</> : <><Check size={18} /> Guardar</>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-4">
                <p className="muted">
                  Se eliminará la cuenta de <strong className="text-ink">{original?.nombre}</strong> ({original?.correo}) con su progreso y reportes. Esta acción no se puede deshacer.
                </p>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <button className="btn btn-secondary" data-autofocus disabled={borrando} onClick={() => setVista("editar")} type="button">
                    <ArrowLeft size={16} /> Volver
                  </button>
                  <button className="btn btn-danger-solid" disabled={borrando} onClick={() => void eliminarUsuario()} type="button">
                    {borrando ? <><Spinner /> Eliminando…</> : <><Trash2 size={16} /> Sí, eliminar</>}
                  </button>
                </div>
              </div>
            )}
          </Swap>
        ) : null}
      </Dialog>
    </div>
  );
}

function RoleBadge({ role }: { role: Rol }) {
  const tono = { ESTUDIANTE: "badge-info", DOCENTE: "badge-progress", ADMINISTRADOR: "badge-action" }[role];
  return <span className={`badge ${tono}`}>{ROLES[role]}</span>;
}
