"use client";

import { ChangeEvent, FormEvent, useEffect, useId, useState } from "react";
import { Camera, Check, ImageOff, Trash2, Upload } from "lucide-react";

import { AnimatedNotice, Spinner, type Tone } from "@/components/ui";
import { useRouter } from "next/navigation";

import {
  AVATAR_PRESETS,
  avatarPresetSeguro,
  normalizarAvatar,
  type AvatarNormalizado,
  type AvatarPreset,
} from "@/lib/avatar";
import { apiRequest } from "@/lib/client-api";
import { clearAuthSession, saveAuthUser, type UsuarioSesion } from "@/lib/use-auth-session";
import { useSecureAvatarUrl } from "@/lib/use-secure-avatar";

type Props = {
  usuario: UsuarioSesion;
  token: string;
  onSaved?: (usuario: UsuarioSesion) => void;
  /** Se conserva por compatibilidad: el editor siempre está visible. */
  defaultOpen?: boolean;
};

type BusyAction = "procesando" | "subiendo" | "eliminando" | "guardando" | null;

function crearFormularioAvatar(avatar: AvatarNormalizado) {
  const datos = new FormData();
  datos.append("archivo", avatar.archivo, avatar.archivo.name);
  return datos;
}

export function ProfileEditor({ usuario, token, onSaved }: Props) {
  const router = useRouter();
  const inputId = useId();
  const [form, setForm] = useState(usuario);
  const [status, setStatusText] = useState("");
  const [tone, setTone] = useState<Tone>("info");
  function setStatus(text: string, nextTone: Tone = "info") {
    setStatusText(text);
    setTone(nextTone);
  }
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
  const avatarRemotoUrl = useSecureAvatarUrl(form.avatarUrl);
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
      setStatus("Elegiste un avatar de AlgoLab. Guarda los cambios para reemplazar tu foto.", "warning");
    } else {
      setStatus("Avatar seleccionado. Guarda los cambios para aplicarlo.");
    }
  }

  async function seleccionarArchivo(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) {
      return;
    }

    setBusy("procesando");
    setStatus("Preparando la imagen…");
    try {
      const normalizado = await normalizarAvatar(archivo);
      setAvatarPendiente(normalizado);
      setEliminarAvatarAlGuardar(false);
      setStatus("Foto lista. Súbela ahora o guarda los cambios para aplicarla.", "warning");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo procesar la imagen.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function subirAvatarInmediato() {
    if (!avatarPendiente) {
      return;
    }

    setBusy("subiendo");
    setStatus("Subiendo la foto…");
    try {
      const updated = await apiRequest<UsuarioSesion>("/api/avatar", token, {
        method: "PUT",
        body: crearFormularioAvatar(avatarPendiente),
      });

      // La respuesta del backend es la única fuente de verdad para el perfil
      // sincronizado. Conservamos en el formulario los textos todavía no
      // guardados, pero nunca los publicamos en la sesión local como si ya
      // existieran en el servidor.
      saveAuthUser(updated);
      setForm((current) => ({
        ...current,
        avatar: updated.avatar,
        avatarUrl: updated.avatarUrl,
        avatarVersion: updated.avatarVersion,
      }));
      setAvatarPendiente(null);
      setTieneAvatarPersonalizado(Boolean(updated.avatarUrl));
      setEliminarAvatarAlGuardar(false);
      setStatus("Foto de perfil guardada. Ya se ve en la web y en las gafas.", "success");
      onSaved?.(updated);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo subir la foto.", "error");
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
    setStatus("Quitando la foto…");
    try {
      const respuesta = await apiRequest<UsuarioSesion | null>("/api/avatar", token, {
        method: "DELETE",
      });

      const updated: UsuarioSesion = respuesta ?? {
        ...usuario,
        avatarUrl: null,
        avatarVersion: null,
      };

      saveAuthUser(updated);
      setForm((current) => ({
        ...current,
        avatar: updated.avatar,
        avatarUrl: null,
        avatarVersion: null,
      }));
      setTieneAvatarPersonalizado(false);
      setEliminarAvatarAlGuardar(false);
      setStatus("Foto eliminada. Se usará el avatar de AlgoLab que elegiste.", "success");
      onSaved?.(updated);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar la foto.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy("guardando");
    setStatus("Guardando cambios…");
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
      setStatus("Cambios guardados.", "success");
      onSaved?.(perfilFinal);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar el perfil.", "error");
    } finally {
      setBusy(null);
    }
  }

  const sesionVencida = tone === "error" && /sesi[oó]n|expirad/i.test(status);

  return (
    <section className="profile" id="perfil">
      <div className="card card-pad profile-avatar">
        <div
          aria-label={avatarUrl ? "Vista previa de tu foto" : `Avatar ${preset}`}
          className={`avatar-token avatar-${preset} profile-avatar-img`}
          role="img"
          style={{ backgroundImage: avatarUrl ? `url("${avatarUrl.replaceAll('"', "%22")}")` : undefined }}
        >
          {avatarUrl ? null : inicial}
        </div>
        <h2 className="title-md mt-4">{form.nombre || "Tu nombre"}</h2>
        <p className="subtle text-sm">{form.nombreUsuario ? `@${form.nombreUsuario}` : "Sin alias"}</p>

        <div className="mt-5 grid w-full gap-2">
          <label className={`btn btn-secondary ${estaOcupado ? "pointer-events-none opacity-50" : ""}`} htmlFor={inputId}>
            {busy === "procesando" ? <Spinner /> : <Camera size={17} />} {busy === "procesando" ? "Procesando…" : "Elegir una foto"}
          </label>
          <input accept="image/*" className="sr-only" disabled={estaOcupado} id={inputId} onChange={seleccionarArchivo} type="file" />
          {avatarPendiente ? (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button className="btn btn-primary" disabled={estaOcupado} onClick={subirAvatarInmediato} type="button">
                {busy === "subiendo" ? <Spinner /> : <Upload size={16} />} {busy === "subiendo" ? "Subiendo…" : "Subir ahora"}
              </button>
              <button aria-label="Descartar la foto elegida" className="btn btn-ghost btn-icon" disabled={estaOcupado} onClick={descartarPreview} type="button">
                <ImageOff size={17} />
              </button>
            </div>
          ) : null}
          {tieneAvatarPersonalizado || avatarUrl ? (
            <button className="btn btn-ghost text-danger" disabled={estaOcupado} onClick={eliminarAvatarPersonalizado} type="button">
              {busy === "eliminando" ? <Spinner /> : <Trash2 size={16} />} {busy === "eliminando" ? "Quitando…" : "Quitar foto"}
            </button>
          ) : null}
        </div>
        <p className="field-help mt-3 text-center">Se recorta al centro y se sincroniza con tus gafas.</p>

        <div className="mt-5 w-full">
          <p className="field-label">O usa un avatar de AlgoLab</p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Avatares de AlgoLab">
            {AVATAR_PRESETS.map((avatar) => (
              <button
                aria-checked={!avatarUrl && form.avatar === avatar}
                className={`avatar-choice ${!avatarUrl && form.avatar === avatar ? "avatar-choice-active" : ""}`}
                disabled={estaOcupado}
                key={avatar}
                onClick={() => seleccionarPreset(avatar)}
                role="radio"
                type="button"
              >
                <i className={`avatar-${avatar}`} />
                {avatar}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form className="card card-pad profile-form" onSubmit={submit}>
        <h2 className="title-md">Tus datos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field-label">
            Nombre completo
            <input className="field-input" onChange={(event) => setForm({ ...form, nombre: event.target.value })} required value={form.nombre ?? ""} />
          </label>
          <label className="field-label">
            Alias público
            <input className="field-input" onChange={(event) => setForm({ ...form, nombreUsuario: event.target.value })} placeholder="ej: cristian_vr" value={form.nombreUsuario ?? ""} />
          </label>
          <label className="field-label">
            Institución
            <input className="field-input" onChange={(event) => setForm({ ...form, institucion: event.target.value })} placeholder="ej: Universidad Cooperativa" value={form.institucion ?? ""} />
          </label>
          <label className="field-label">
            Programa académico
            <input className="field-input" onChange={(event) => setForm({ ...form, programa: event.target.value })} placeholder="ej: Ingeniería de Software" value={form.programa ?? ""} />
          </label>
          <label className="field-label sm:col-span-2">
            Presentación
            <textarea className="field-input" maxLength={300} onChange={(event) => setForm({ ...form, biografia: event.target.value })} placeholder="Escribe una breve descripción…" value={form.biografia ?? ""} />
            <span className="field-help">{(form.biografia ?? "").length}/300</span>
          </label>
        </div>

        <AnimatedNotice
          action={sesionVencida ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                clearAuthSession();
                router.push("/iniciar-sesion");
              }}
              type="button"
            >
              Iniciar sesión
            </button>
          ) : undefined}
          message={busy === "guardando" ? "" : status}
          tone={tone}
        />

        <div className="flex flex-wrap items-center gap-3 border-t border-line/10 pt-4">
          <button className="btn btn-primary" disabled={estaOcupado} type="submit">
            {busy === "guardando" ? <><Spinner /> Guardando…</> : <><Check size={17} /> Guardar cambios</>}
          </button>
        </div>
      </form>
    </section>
  );
}
