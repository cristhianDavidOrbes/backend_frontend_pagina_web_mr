"use client";

import { ChangeEvent, FormEvent, useEffect, useId, useState } from "react";

import {
  AVATAR_PRESETS,
  avatarPresetSeguro,
  normalizarAvatar,
  type AvatarNormalizado,
  type AvatarPreset,
} from "@/lib/avatar";
import { apiRequest } from "@/lib/client-api";
import { saveAuthUser, type UsuarioSesion } from "@/lib/use-auth-session";
import { useSecureAvatarUrl } from "@/lib/use-secure-avatar";

type Props = {
  usuario: UsuarioSesion;
  token: string;
  onSaved?: (usuario: UsuarioSesion) => void;
  defaultOpen?: boolean;
};

type BusyAction = "procesando" | "subiendo" | "eliminando" | "guardando" | null;

function fusionarAvatarEnBorrador(borrador: UsuarioSesion, actualizado: UsuarioSesion): UsuarioSesion {
  return {
    ...actualizado,
    nombre: borrador.nombre,
    nombreUsuario: borrador.nombreUsuario,
    biografia: borrador.biografia,
    institucion: borrador.institucion,
    programa: borrador.programa,
  };
}

export function ProfileEditor({ usuario, token, onSaved, defaultOpen = false }: Props) {
  const inputId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const [form, setForm] = useState(usuario);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<BusyAction>(null);
  const [avatarPendiente, setAvatarPendiente] = useState<AvatarNormalizado | null>(null);
  const [tieneAvatarPersonalizado, setTieneAvatarPersonalizado] = useState(Boolean(usuario.avatarUrl));
  const [eliminarAvatarAlGuardar, setEliminarAvatarAlGuardar] = useState(false);

  const preset = avatarPresetSeguro(form.avatar);
  const avatarRemotoUrl = useSecureAvatarUrl(form.avatarUrl, token);
  const avatarUrl = avatarPendiente?.previewUrl ?? avatarRemotoUrl;
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
    setEliminarAvatarAlGuardar(tieneAvatarPersonalizado);
    setStatus(
      tieneAvatarPersonalizado
        ? "Guarda los cambios para reemplazar la foto por este avatar."
        : "Avatar prediseñado seleccionado.",
    );
  }

  async function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) {
      return;
    }

    setBusy("procesando");
    setStatus("Preparando una vista previa cuadrada…");
    try {
      const normalizado = await normalizarAvatar(archivo);
      setAvatarPendiente(normalizado);
      setEliminarAvatarAlGuardar(false);
      setStatus(
        `Vista previa lista (${normalizado.dimension} × ${normalizado.dimension} px). Confirma para subirla.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo procesar la imagen.");
    } finally {
      setBusy(null);
    }
  }

  async function subirAvatar() {
    if (!avatarPendiente) {
      return;
    }

    setBusy("subiendo");
    setStatus("Subiendo tu avatar…");
    try {
      const datos = new FormData();
      datos.append("archivo", avatarPendiente.archivo, avatarPendiente.archivo.name);
      const updated = await apiRequest<UsuarioSesion>("/api/avatar", token, {
        method: "PUT",
        body: datos,
      });
      saveAuthUser(updated);
      setForm((current) => fusionarAvatarEnBorrador(current, updated));
      setAvatarPendiente(null);
      setTieneAvatarPersonalizado(Boolean(updated.avatarUrl));
      setEliminarAvatarAlGuardar(false);
      setStatus("Avatar personalizado sincronizado con AlgoLab.");
      onSaved?.(updated);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir el avatar.");
    } finally {
      setBusy(null);
    }
  }

  async function eliminarAvatarPersonalizado() {
    if (!tieneAvatarPersonalizado) {
      descartarPreview();
      return;
    }

    setBusy("eliminando");
    setStatus("Restableciendo el avatar…");
    try {
      const respuesta = await apiRequest<UsuarioSesion | null>("/api/avatar", token, {
        method: "DELETE",
      });
      const updated: UsuarioSesion = respuesta ?? {
        ...form,
        avatarUrl: null,
        avatarVersion: null,
      };
      saveAuthUser(updated);
      setForm((current) => fusionarAvatarEnBorrador(current, updated));
      setAvatarPendiente(null);
      setTieneAvatarPersonalizado(false);
      setEliminarAvatarAlGuardar(false);
      setStatus("Foto eliminada. Volviste a tu avatar prediseñado.");
      onSaved?.(updated);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo restablecer el avatar.");
    } finally {
      setBusy(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("guardando");
    setStatus("Guardando…");
    try {
      if (eliminarAvatarAlGuardar && tieneAvatarPersonalizado) {
        await apiRequest<UsuarioSesion | null>("/api/avatar", token, { method: "DELETE" });
      }

      const updated = await apiRequest<UsuarioSesion>("/api/perfil", token, {
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

      let perfilActualizado = updated;
      if (eliminarAvatarAlGuardar && tieneAvatarPersonalizado) {
        perfilActualizado = { ...updated, avatarUrl: null, avatarVersion: null };
      }
      saveAuthUser(perfilActualizado);
      setForm(perfilActualizado);
      setTieneAvatarPersonalizado(Boolean(perfilActualizado.avatarUrl));
      setEliminarAvatarAlGuardar(false);
      setStatus("Perfil sincronizado con AlgoLab.");
      onSaved?.(perfilActualizado);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel-card overflow-hidden" id="perfil">
      <button
        className="flex w-full items-center justify-between p-5 text-left"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>
          <span className="section-kicker">Identidad AlgoLab</span>
          <strong className="mt-1 block text-lg">Tu perfil sincronizado</strong>
        </span>
        <span className="text-emerald-300">{open ? "Cerrar" : "Editar"} ↗</span>
      </button>

      {open ? (
        <form className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-2" onSubmit={submit}>
          <label className="field-label">
            Nombre
            <input
              className="field-input"
              value={form.nombre ?? ""}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              required
            />
          </label>
          <label className="field-label">
            Alias
            <input
              className="field-input"
              value={form.nombreUsuario ?? ""}
              onChange={(event) => setForm({ ...form, nombreUsuario: event.target.value })}
            />
          </label>
          <label className="field-label">
            Institución
            <input
              className="field-input"
              value={form.institucion ?? ""}
              onChange={(event) => setForm({ ...form, institucion: event.target.value })}
            />
          </label>
          <label className="field-label">
            Programa
            <input
              className="field-input"
              value={form.programa ?? ""}
              onChange={(event) => setForm({ ...form, programa: event.target.value })}
            />
          </label>
          <label className="field-label sm:col-span-2">
            Presentación
            <textarea
              className="field-input min-h-24 py-3"
              maxLength={300}
              value={form.biografia ?? ""}
              onChange={(event) => setForm({ ...form, biografia: event.target.value })}
            />
          </label>

          <div className="sm:col-span-2">
            <span className="field-label">Avatar en web y juego</span>
            <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/35 p-4 sm:flex-row sm:items-center">
              <div
                aria-label={avatarUrl ? "Vista previa del avatar personalizado" : `Avatar ${preset}`}
                className={`avatar-token avatar-${preset} shrink-0 overflow-hidden`}
                role="img"
                style={{
                  width: "6rem",
                  height: "6rem",
                  borderRadius: "1.75rem",
                  backgroundImage: avatarUrl ? `url("${avatarUrl.replaceAll('"', "%22")}")` : undefined,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                  fontSize: "1.75rem",
                }}
              >
                {avatarUrl ? null : inicial}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">Usa cualquier imagen que te represente</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Se recorta al centro y se normaliza automáticamente a un cuadrado de máximo 512 px.
                  Archivo original: hasta 12 MB.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <label
                    className="cursor-pointer rounded-xl border border-emerald-400/35 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
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
                        className="rounded-xl bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 disabled:opacity-50"
                        disabled={estaOcupado}
                        onClick={subirAvatar}
                        type="button"
                      >
                        {busy === "subiendo" ? "Subiendo…" : "Usar esta imagen"}
                      </button>
                      <button
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 disabled:opacity-50"
                        disabled={estaOcupado}
                        onClick={descartarPreview}
                        type="button"
                      >
                        Descartar
                      </button>
                    </>
                  ) : null}
                  {tieneAvatarPersonalizado ? (
                    <button
                      className="rounded-xl border border-rose-400/25 px-3 py-2 text-xs text-rose-200 disabled:opacity-50"
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

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              className="primary-button disabled:cursor-not-allowed disabled:opacity-50"
              disabled={estaOcupado}
              type="submit"
            >
              {busy === "guardando" ? "Guardando…" : "Guardar cambios"}
            </button>
            <span aria-live="polite" className="text-sm text-slate-400">
              {status}
            </span>
          </div>
        </form>
      ) : null}
    </section>
  );
}
