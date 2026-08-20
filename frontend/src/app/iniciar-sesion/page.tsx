"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { saveAuthToken, saveAuthUser, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type LoginRespuesta = { exitoso?: boolean; mensaje?: string; token?: string; usuario?: UsuarioSesion };

export default function IniciarSesionPage() {
  const router = useRouter();
  const { hydrated, token: existingToken, usuario } = useAuthSession();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (existingToken && usuario) {
      const ruta = usuario.rol === "ADMINISTRADOR" ? "/administrador" : usuario.rol === "DOCENTE" ? "/docente" : "/estudiante";
      router.replace(ruta);
    }
  }, [hydrated, existingToken, usuario, router]);

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setEnviando(true); setMensaje("");
    try {
      const response = await fetch("/api/iniciar-sesion", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ correo, contrasena }) });
      let data: LoginRespuesta;
      try {
        data = await response.json() as LoginRespuesta;
      } catch {
        throw new Error("El servidor respondió con un formato inesperado. Intenta de nuevo.");
      }
      if (!response.ok || !data.token || !data.usuario) throw new Error(data.mensaje ?? "No se pudo iniciar sesión.");
      saveAuthToken(data.token); saveAuthUser(data.usuario);
      const ruta = data.usuario.rol === "ADMINISTRADOR" ? "/administrador" : data.usuario.rol === "DOCENTE" ? "/docente" : "/estudiante";
      router.replace(ruta);
    } catch (error) { setMensaje(error instanceof Error ? error.message : "No se pudo conectar con AlgoLab."); setEnviando(false); }
  }

  return <main className="auth-shell min-h-screen"><Link className="auth-brand" href="/"><span className="brand-mark">A</span><strong>AlgoLab</strong></Link><section className="auth-layout">
    <div className="auth-story"><p className="section-kicker">Continúa tu ruta</p><h1>Tu progreso sigue donde lo dejaste.</h1><p>Consulta tus niveles, descubre el análisis del mentor IA y mantén tu perfil sincronizado con la experiencia de las gafas.</p><div className="auth-code"><span>progreso</span><strong>{".continuar();"}</strong><small>{"// evidencia + retroalimentación"}</small></div></div>
    <div className="auth-card"><p className="section-kicker">Acceso seguro</p><h2>Iniciar sesión</h2><p className="auth-copy">Usa las mismas credenciales de AlgoLab para entrar a tu espacio.</p><form className="mt-7 space-y-5" onSubmit={iniciarSesion}><label className="field-label">Correo electrónico<input autoComplete="email" className="field-input" onChange={(event) => setCorreo(event.target.value)} placeholder="nombre@correo.com" required type="email" value={correo} /></label><label className="field-label">Contraseña<input autoComplete="current-password" className="field-input" minLength={6} onChange={(event) => setContrasena(event.target.value)} placeholder="••••••••" required type="password" value={contrasena} /></label><button className="primary-button flex w-full items-center justify-center" disabled={enviando} type="submit">{enviando ? "Verificando…" : "Entrar a mi panel →"}</button></form>{mensaje ? <div className="alert-error mt-4">{mensaje}</div> : null}<p className="auth-switch">¿Aún no tienes cuenta? <Link href="/registrarse">Crea tu perfil</Link></p></div>
  </section></main>;
}
