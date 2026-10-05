"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import styles from "../auth-pages.module.css";
import { institutionalEmailError, normalizeInstitutionalEmail } from "@/lib/institutional-email";
import { saveAuthSession, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type RespuestaAuth = {
  exitoso?: boolean;
  mensaje?: string;
  token?: string;
  usuario?: UsuarioSesion;
};

export default function RegistrarsePage() {
  const router = useRouter();
  const { hydrated, token, usuario } = useAuthSession();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated || !token || !usuario) return;
    router.replace(usuario.rol === "ADMINISTRADOR" ? "/administrador" : usuario.rol === "DOCENTE" ? "/docente" : "/estudiante");
  }, [hydrated, token, usuario, router]);

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const correoNormalizado = normalizeInstitutionalEmail(correo);
    const errorCorreo = institutionalEmailError(correoNormalizado);
    if (errorCorreo) return setError(errorCorreo);
    if (!nombre.trim()) return setError("Escribe tu nombre.");
    if (contrasena.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");

    setEnviando(true);
    setError("");
    let cuentaCreada = false;
    try {
      const respuesta = await fetch("/api/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), correo: correoNormalizado, contrasena, rol: "ESTUDIANTE" }),
        signal: AbortSignal.timeout(90_000),
      });
      const registro = (await respuesta.json()) as RespuestaAuth;
      if (!respuesta.ok || registro.exitoso === false) {
        throw new Error(registro.mensaje || "No se pudo crear la cuenta.");
      }
      cuentaCreada = true;

      const login = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoNormalizado, contrasena }),
        signal: AbortSignal.timeout(90_000),
      });
      const sesion = (await login.json()) as RespuestaAuth;
      if (!login.ok || !sesion.exitoso || !sesion.token || !sesion.usuario) {
        router.replace(`/iniciar-sesion?correo=${encodeURIComponent(correoNormalizado)}&registro=exitoso`);
        return;
      }

      saveAuthSession(sesion.token, sesion.usuario);
      router.replace("/estudiante/bienvenida");
    } catch (cause) {
      if (cuentaCreada) {
        router.replace(`/iniciar-sesion?correo=${encodeURIComponent(correoNormalizado)}&registro=exitoso`);
        return;
      }
      setError(cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")
        ? "El servidor tardó en responder. Espera unos segundos y vuelve a intentarlo."
        : cause instanceof Error ? cause.message : "No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.topbar}>
          <Link className={styles.brand} href="/" aria-label="AlgoLab, inicio">
            <span className={styles.brandMark}>A</span><strong>AlgoLab</strong>
          </Link>
          <Link className={styles.topLink} href="/">Volver al inicio</Link>
        </header>
        <div className={styles.body}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>Empieza con una idea</span>
            <h1>Aprender POO puede ser <em>tangible.</em></h1>
            <p>Abre tu cuenta para guardar los niveles que completes. Después podrás contar quién eres y personalizar tu perfil.</p>
            <div className={styles.introNote}><span>01 / 02</span> Crea la cuenta ahora; completa tu perfil en el siguiente paso.</div>
          </div>
          <section className={styles.card} aria-labelledby="titulo-registro">
            <span className={styles.cardLabel}>NUEVA CUENTA</span>
            <h2 id="titulo-registro">Crea tu cuenta</h2>
            <p className={styles.cardLead}>Tres datos para empezar. Tu perfil se completa al entrar.</p>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <form className={styles.form} onSubmit={registrar}>
              <label className={styles.field}>
                <span className={styles.cardLabel}>Nombre completo</span>
                <input className={styles.input} autoComplete="name" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Tu nombre y apellido" required maxLength={100} />
              </label>
              <label className={styles.field}>
                <span className={styles.cardLabel}>Correo electrónico</span>
                <input className={styles.input} type="email" autoComplete="email" value={correo} onChange={(event) => setCorreo(event.target.value)} placeholder="tu@correo.com" required />
              </label>
              <div className={styles.field}>
                <label className={styles.cardLabel} htmlFor="contrasena-registro">Contraseña</label>
                <span className={styles.inputWrap}>
                  <input id="contrasena-registro" className={`${styles.input} ${styles.inputWithButton}`} type={mostrarContrasena ? "text" : "password"} autoComplete="new-password" value={contrasena} onChange={(event) => setContrasena(event.target.value)} minLength={6} required />
                  <button className={styles.fieldAction} type="button" onClick={() => setMostrarContrasena((actual) => !actual)} aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
                <span className={styles.fieldHelp}>Usa al menos 6 caracteres.</span>
              </div>
              <button className={styles.submit} type="submit" disabled={enviando}>
                {enviando ? <><LoaderCircle className="animate-spin" size={18} /> Creando cuenta…</> : <>Crear cuenta <ArrowRight size={17} /></>}
              </button>
            </form>
            <p className={styles.footer}>¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link></p>
          </section>
        </div>
      </div>
    </main>
  );
}
