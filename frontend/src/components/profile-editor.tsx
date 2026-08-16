"use client";

import { FormEvent, useState } from "react";
import { apiRequest } from "@/lib/client-api";
import { saveAuthUser, type UsuarioSesion } from "@/lib/use-auth-session";

type Props = { usuario: UsuarioSesion; token: string; onSaved?: (usuario: UsuarioSesion) => void };
const avatars = ["orbita", "codigo", "robot", "nucleo"] as const;

export function ProfileEditor({ usuario, token, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(usuario);
  const [status, setStatus] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setStatus("Guardando…");
    try {
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
      saveAuthUser(updated); setForm(updated); setStatus("Perfil sincronizado con AlgoLab."); onSaved?.(updated);
    } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo guardar."); }
  }

  return (
    <section className="panel-card overflow-hidden">
      <button className="flex w-full items-center justify-between p-5 text-left" onClick={() => setOpen(!open)}>
        <span><span className="section-kicker">Identidad AlgoLab</span><strong className="mt-1 block text-lg">Tu perfil sincronizado</strong></span>
        <span className="text-emerald-300">{open ? "Cerrar" : "Editar"} ↗</span>
      </button>
      {open ? <form className="grid gap-4 border-t border-white/10 p-5 sm:grid-cols-2" onSubmit={submit}>
        <label className="field-label">Nombre<input className="field-input" value={form.nombre ?? ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></label>
        <label className="field-label">Alias<input className="field-input" value={form.nombreUsuario ?? ""} onChange={(e) => setForm({ ...form, nombreUsuario: e.target.value })} /></label>
        <label className="field-label">Institución<input className="field-input" value={form.institucion ?? ""} onChange={(e) => setForm({ ...form, institucion: e.target.value })} /></label>
        <label className="field-label">Programa<input className="field-input" value={form.programa ?? ""} onChange={(e) => setForm({ ...form, programa: e.target.value })} /></label>
        <label className="field-label sm:col-span-2">Presentación<textarea className="field-input min-h-24 py-3" maxLength={300} value={form.biografia ?? ""} onChange={(e) => setForm({ ...form, biografia: e.target.value })} /></label>
        <div className="sm:col-span-2"><span className="field-label">Avatar en web y juego</span><div className="mt-2 flex flex-wrap gap-2">{avatars.map((avatar) => <button className={`avatar-choice ${form.avatar === avatar ? "avatar-choice-active" : ""}`} key={avatar} onClick={() => setForm({ ...form, avatar })} type="button">{avatar}</button>)}</div></div>
        <div className="flex items-center gap-3 sm:col-span-2"><button className="primary-button" type="submit">Guardar cambios</button><span className="text-sm text-slate-400">{status}</span></div>
      </form> : null}
    </section>
  );
}
