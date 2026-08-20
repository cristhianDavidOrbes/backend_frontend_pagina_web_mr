"use client";

import { ChangeEvent, FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AVATAR_PRESETS,
  avatarPresetSeguro,
  avatarUrlParaCliente,
  normalizarAvatar,
  type AvatarNormalizado,
  type AvatarPreset,
} from "@/lib/avatar";
import { apiRequest } from "@/lib/client-api";
import { clearAuthSession, saveAuthUser, type UsuarioSesion } from "@/lib/use-auth-session";

type Props = {
  usuario: UsuarioSesion;
  token: string;
  onSaved?: (usuario: UsuarioSesion) => void;
  defaultOpen?: boolean;
};

type BusyAction = "procesando" | "subiendo" | "eliminando" | "guardando" | null;

function crearFormularioAvatar(avatar: AvatarNormalizado) {
  const datos = new FormData();
  datos.append("archivo", avatar.archivo, avatar.archivo.name);
  return datos;
}

export function ProfileEditor({ usuario, token, onSaved, defaultOpen = false }: Props) {
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [form, setForm] = useState(usuario);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [avatarPendiente, setAvatarPendiente] = useState<AvatarNormalizado | null>(null);
  const [tieneAvatarPersonalizado, setTieneAvatarPersonalizado] = useState(Boolean(usuario.avatarUrl));
  const [eliminarAvatarAlGuardar, setEliminarAvatarAlGuardar] = useState(false);

  const [prevUsuario, setPrevUsuario] = useState(usuario);
  if (usuario !== prevUsuario) {
    setPrevUsuario(usuario);
    setForm(usuario);
    setTieneAvatarPersonalizado(Boolean(usuario.avatarUrl));
    setAvatarPendiente(null);
    setEliminarAvatarAlGuardar(false);
  }

  const preset = avatarPresetSeguro(form.avatar);
  const avatarRemotoUrl = avatarUrlParaCliente(form.avatarUrl);
  const avatarUrl = avatarPendiente?.previewUrl ?? (eliminarAvatarAlGuardar ? null : avatarRemotoUrl);
  const inicial = (form.nombre?.trim().charAt(0) || "A").toUpperCase();
  const estaOcupado = busy !== null;

  useEffect(() => {
    const previewUrl = avatarPendiente?.previewUrl;
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [avatarPendiente?.previewUrl]);

  function descartarPreview() {
    setAvatarPendiente(null);
    setStatus("");
  }

  function seleccionarPreset(avatar: AvatarPreset) {
    setAvatarPendiente(null);
    setForm((current) => ({
      ...current,
      avatar,
      avatarUrl: null,
      avatarVersion: null,
    }));
    if (tieneAvatarPersonalizado) {
      setEliminarAvatarAlGuardar(true);
      setStatus("Has seleccionado un avatar prediseñado. Haz clic en 'Guardar cambios' para aplicarlo.");
    } else {
      setStatus(`Avatar prediseñado '${avatar}' seleccionado.`);
    }
  }

  async function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) {
      return;
    }

    setBusy("procesando");
    setStatus("Preparando imagen...");
    try {
      const normalizado = await normalizarAvatar(archivo);
      setAvatarPendiente(normalizado);
      setEliminarAvatarAlGuardar(false);
      setStatus(
        `Foto lista (${normalizado.dimension}×${normalizado.dimension}px). Haz clic en 'Guardar cambios' para aplicarla.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo procesar la imagen.");
    } finally {
      setBusy(null);
    }
  }

  async function subirAvatarInmediato() {
    if (!avatarPendiente) {
      return;
    }

    setBusy("subiendo");
    setStatus("Subiendo foto de perfil al servidor...");
    try {
      const updated = await apiRequest<UsuarioSesion>("/api/avatar", token, {
        method: "PUT",
        body: crearFormularioAvatar(avatarPendiente),
      });

      const fusionado: UsuarioSesion = {
        ...updated,
        nombre: form.nombre,
        nombreUsuario: form.nombreUsuario,
        biografia: form.biografia,
        institucion: form.institucion,
        programa: form.programa,
      };

      saveAuthUser(fusionado);
      setForm(fusionado);
      setAvatarPendiente(null);
      setTieneAvatarPersonalizado(Boolean(fusionado.avatarUrl));
      setEliminarAvatarAlGuardar(false);
      setStatus("¡Foto de perfil subida y sincronizada con AlgoLab!");
      onSaved?.(fusionado);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir la foto.");
    } finally {
      setBusy(null);
    }
  }

  async function eliminarAvatarPersonalizado() {
    if (!tieneAvatarPersonalizado && !avatarPendiente) {
      return;
    }

    if (avatarPendiente) {
      descartarPreview();
    }

    if (!tieneAvatarPersonalizado) {
      return;
    }

    setBusy("eliminando");
    setStatus("Restableciendo avatar...");
    try {
      const respuesta = await apiRequest<UsuarioSesion | null>("/api/avatar", token, {
        method: "DELETE",
      });

      const updated: UsuarioSesion = respuesta ?? {
        ...form,
        avatarUrl: null,
        avatarVersion: null,
      };

      const fusionado: UsuarioSesion = {
        ...updated,
        nombre: form.nombre,
        nombreUsuario: form.nombreUsuario,
        biografia: form.biografia,
        institucion: form.institucion,
        programa: form.programa,
      };

      saveAuthUser(fusionado);
      setForm(fusionado);
      setTieneAvatarPersonalizado(false);
      setEliminarAvatarAlGuardar(false);
      setStatus("Foto eliminada. Se usará el avatar prediseñado.");
      onSaved?.(fusionado);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar la foto.");
    } finally {
      setBusy(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("guardando");
    setStatus("Guardando cambios y sincronizando...");
    try {
      let avatarRespuesta: UsuarioSesion | null = null;

      // 1. Si hay una imagen seleccionada pendiente de subir, subirla primero
      if (avatarPendiente) {
        avatarRespuesta = await apiRequest<UsuarioSesion>("/api/avatar", token, {
          method: "PUT",
          body: crearFormularioAvatar(avatarPendiente),
        });
        setAvatarPendiente(null);
      } else if (eliminarAvatarAlGuardar && tieneAvatarPersonalizado) {
        // 2. Si el usuario eligió un preset para reemplazar su foto
        avatarRespuesta = await apiRequest<UsuarioSesion | null>("/api/avatar", token, {
          method: "DELETE",
        });
      }

      // 3. Guardar datos del perfil en backend
      const perfilActualizado = await apiRequest<UsuarioSesion>("/api/perfil", token, {
        method: "PUT",
        body: JSON.stringify({
          nombre: form.nombre,
          nombreUsuario: form.nombreUsuario,
          biografia: form.biografia,
          institucion: form.institucion,
          programa: form.programa,
          avatar: form.avatar,
        }),
      });

      // 4. Fusionar la respuesta del perfil con la URL de avatar más reciente
      const perfilFinal: UsuarioSesion = {
        ...perfilActualizado,
        avatarUrl: avatarRespuesta !== null
          ? avatarRespuesta.avatarUrl
          : (eliminarAvatarAlGuardar ? null : (perfilActualizado.avatarUrl ?? form.avatarUrl)),
        avatarVersion: avatarRespuesta !== null
          ? avatarRespuesta.avatarVersion
          : (eliminarAvatarAlGuardar ? null : (perfilActualizado.avatarVersion ?? form.avatarVersion)),
      };

      saveAuthUser(perfilFinal);
      setForm(perfilFinal);
      setTieneAvatarPersonalizado(Boolean(perfilFinal.avatarUrl));
      setEliminarAvatarAlGuardar(false);
      setStatus("¡Perfil e imagen guardados exitosamente en AlgoLab!");
      onSaved?.(perfilFinal);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Error al guardar el perfil.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel-card overflow-hidden" id="perfil">
      <button
        className="flex w-full items-center justify-between p-5 text-left transition hover:bg-white/[.02]"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>
          <span className="section-kicker">Identidad AlgoLab</span>
          <strong className="mt-1 block text-lg">Tu perfil sincronizado</strong>
        </span>
        <span className="text-emerald-300 font-semibold">{open ? "Ocultar" : "Editar"} ↗</span>
      </button>

      {open ? (
        <form className="grid gap-5 border-t border-white/10 p-5 sm:grid-cols-2" onSubmit={submit}>
          <label className="field-label">
            Nombre completo
            <input
              className="field-input"
              value={form.nombre ?? ""}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              required
            />
          </label>

          <label className="field-label">
            Alias / Nombre de usuario
            <input
              className="field-input"
              value={form.nombreUsuario ?? ""}
              onChange={(event) => setForm({ ...form, nombreUsuario: event.target.value })}
              placeholder="ej: cristian_vr"
            />
          </label>

          <label className="field-label">
            Institución
            <input
              className="field-input"
              value={form.institucion ?? ""}
              onChange={(event) => setForm({ ...form, institucion: event.target.value })}
              placeholder="ej: Universidad Cooperativa"
            />
          </label>

          <label className="field-label">
            Programa académico
            <input
              className="field-input"
              value={form.programa ?? ""}
              onChange={(event) => setForm({ ...form, programa: event.target.value })}
              placeholder="ej: Ingeniería de Software"
            />
          </label>

          <label className="field-label sm:col-span-2">
            Presentación / Biografía
            <textarea
              className="field-input min-h-24 py-3"
              maxLength={300}
              value={form.biografia ?? ""}
              onChange={(event) => setForm({ ...form, biografia: event.target.value })}
              placeholder="Escribe una breve descripción de tu perfil..."
            />
          </label>

          <div className="sm:col-span-2">
            <span className="field-label">Avatar en web y gafas VR</span>
            <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 sm:flex-row sm:items-center">
              <div
                aria-label={avatarUrl ? "Vista previa del avatar" : `Avatar ${preset}`}
                className={`avatar-token avatar-${preset} shrink-0 overflow-hidden shadow-xl ring-2 ring-emerald-400/20`}
                role="img"
                style={{
                  width: "6.25rem",
                  height: "6.25rem",
                  borderRadius: "1.75rem",
                  backgroundImage: avatarUrl ? `url("${avatarUrl.replaceAll('"', "%22")}")` : undefined,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  fontSize: "2rem",
                }}
              >
                {avatarUrl ? null : inicial}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">Usa cualquier imagen o foto</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Se optimiza al centro y se sincroniza con tus gafas de realidad virtual Meta Quest.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label
                    className="cursor-pointer rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20 active:scale-95"
                    htmlFor={inputId}
                  >
                    {busy === "procesando" ? "Procesando…" : "Elegir imagen"}
                  </label>
                  <input
                    accept="image/*"
                    className="sr-only"
                    disabled={estaOcupado}
                    id={inputId}
                    onChange={seleccionarArchivo}
                    type="file"
                  />

                  {avatarPendiente ? (
                    <>
                      <button
                        className="rounded-xl bg-emerald-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-md transition hover:bg-emerald-300 disabled:opacity-50"
                        disabled={estaOcupado}
                        onClick={subirAvatarInmediato}
                        type="button"
                      >
                        {busy === "subiendo" ? "Subiendo…" : "Subir foto ahora"}
                      </button>
                      <button
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[.06] disabled:opacity-50"
                        disabled={estaOcupado}
                        onClick={descartarPreview}
                        type="button"
                      >
                        Descartar
                      </button>
                    </>
                  ) : null}

                  {tieneAvatarPersonalizado || avatarUrl ? (
                    <button
                      className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                      disabled={estaOcupado}
                      onClick={eliminarAvatarPersonalizado}
                      type="button"
                    >
                      {busy === "eliminando" ? "Quitando…" : "Quitar foto"}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">O elige un avatar de AlgoLab</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {AVATAR_PRESETS.map((avatar) => (
                  <button
                    className={`avatar-choice ${!avatarUrl && form.avatar === avatar ? "avatar-choice-active" : ""}`}
                    disabled={estaOcupado}
                    key={avatar}
                    onClick={() => seleccionarPreset(avatar)}
                    type="button"
                  >
                    {avatar}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 sm:col-span-2">
            <button
              className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
              disabled={estaOcupado}
              type="submit"
            >
              {busy === "guardando" ? "Guardando…" : "Guardar cambios"}
            </button>
            {status ? (
              <div className="flex flex-wrap items-center gap-2">
                <span aria-live="polite" className={`text-xs rounded-lg px-3 py-1.5 border ${status.includes("expirado") || status.includes("Error") ? "bg-rose-950/50 border-rose-500/30 text-rose-200" : "bg-emerald-950/40 border-emerald-400/20 text-emerald-300"}`}>
                  {status}
                </span>
                {status.includes("expirado") || status.includes("sesión") ? (
                  <button
                    className="rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-300"
                    onClick={() => {
                      clearAuthSession();
                      router.push("/iniciar-sesion");
                    }}
                    type="button"
                  >
                    Ir a Iniciar Sesión ↗
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}
