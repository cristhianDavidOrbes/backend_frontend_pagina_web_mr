"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuthSession } from "@/lib/use-auth-session";

type RegistroRespuesta = { exitoso?: boolean; mensaje?: string };

export default function RegistrarsePage() {
  const router = useRouter();
  const { hydrated, token: existingToken, usuario } = useAuthSession();
  const [nombre, setNombre] = useState(""); const [correo, setCorreo] = useState(""); const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false); const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (existingToken && usuario) {
      const ruta = usuario.rol === "ADMINISTRADOR" ? "/administrador" : usuario.rol === "DOCENTE" ? "/docente" : "/estudiante";
      router.replace(ruta);
    }
  }, [hydrated, existingToken, usuario, router]);

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEnviando(true); setMensaje("");
    try {
      const response = await fetch("/api/registrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre, correo, contrasena, rol: "ESTUDIANTE" }) });
      let data: RegistroRespuesta;
      try {
        data = await response.json() as RegistroRespuesta;
      } catch {
        throw new Error("El servidor respondió con un formato inesperado. Intenta de nuevo.");
      }
      if (!response.ok || data.exitoso === false) throw new Error(data.mensaje ?? "No se pudo crear la cuenta.");
      router.push("/iniciar-sesion?registro=exitoso");
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No se pudo conectar con AlgoLab."); setEnviando(false); }
  }
  return <main className="auth-shell min-h-screen"><Link className="auth-brand" href="/"><span className="brand-mark">A</span><strong>AlgoLab</strong></Link><section className="auth-layout">
    <div className="auth-story"><p className="section-kicker">Primera misión</p><h1>Crea una identidad que viajará contigo.</h1><p>Tu perfil conecta la página, el progreso pedagógico y la experiencia de realidad mixta. Después podrás personalizar alias, avatar, institución y programa.</p><div className="auth-code"><span>estudiante</span><strong>{".iniciarRuta();"}</strong><small>{"// 6 niveles · 4 pilares · 1 objetivo"}</small></div></div>
    <div className="auth-card"><p className="section-kicker">Nuevo estudiante</p><h2>Crear cuenta</h2><p className="auth-copy">Empieza con tus datos esenciales. Tu perfil podrá evolucionar después.</p><form className="mt-7 space-y-5" onSubmit={registrar}><label className="field-label">Nombre completo<input autoComplete="name" className="field-input" onChange={(event) => setNombre(event.target.value)} placeholder="Tu nombre" required value={nombre} /></label><label className="field-label">Correo electrónico<input autoComplete="email" className="field-input" onChange={(event) => setCorreo(event.target.value)} placeholder="nombre@correo.com" required type="email" value={correo} /></label><label className="field-label">Contraseña<input autoComplete="new-password" className="field-input" minLength={6} onChange={(event) => setContrasena(event.target.value)} placeholder="Mínimo 6 caracteres" required type="password" value={contrasena} /></label><button className="primary-button flex w-full items-center justify-center" disabled={enviando} type="submit">{enviando ? "Creando perfil…" : "Crear mi perfil →"}</button></form>{mensaje ? <div className="alert-error mt-4">{mensaje}</div> : null}<p className="auth-switch">¿Ya tienes una cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p></div>
  </section></main>;
}
