"use client";

import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import styles from "../auth-pages.module.css";
import { institutionalEmailError, normalizeInstitutionalEmail } from "@/lib/institutional-email";
import { necesitaCompletarPerfil } from "@/lib/profile-onboarding";
import { clearAuthSession, saveAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type RespuestaLogin = {
  exitoso?: boolean;
  mensaje?: string;
  token?: string;
  usuario?: UsuarioSesion;
};

export default function IniciarSesionPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("expirado") === "1") {
      clearAuthSession();
    }
    const correoPrevio = normalizeInstitutionalEmail(params.get("correo") ?? "");
    const timer = window.setTimeout(() => {
      if (params.get("expirado") === "1") setError("Tu sesión terminó. Inicia sesión de nuevo para continuar.");
      if (correoPrevio && !institutionalEmailError(correoPrevio)) setCorreo(correoPrevio);
      if (params.get("registro") === "exitoso") setAviso("Tu cuenta está lista. Inicia sesión para completar tu perfil.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const correoNormalizado = normalizeInstitutionalEmail(correo);
    const errorCorreo = institutionalEmailError(correoNormalizado);
    if (errorCorreo) return setError(errorCorreo);
    if (!contrasena) return setError("Escribe tu contraseña.");

    setCargando(true);
    setError("");
    setAviso("");
    try {
      const respuesta = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoNormalizado, contrasena }),
        signal: AbortSignal.timeout(90_000),
      });
      const datos = (await respuesta.json()) as RespuestaLogin;
      if (!respuesta.ok || !datos.exitoso || !datos.token || !datos.usuario) {
        throw new Error(datos.mensaje || "No pudimos iniciar sesión. Revisa tus datos.");
      }

      saveAuthSession(datos.token, datos.usuario);
      const destino = datos.usuario.rol === "ADMINISTRADOR"
        ? "/administrador"
        : datos.usuario.rol === "DOCENTE"
          ? "/docente"
          : necesitaCompletarPerfil(datos.usuario)
            ? "/estudiante/bienvenida"
            : "/estudiante";
      router.replace(destino);
    } catch (cause) {
      setError(cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")
        ? "El servidor tardó en responder. Vuelve a intentarlo en unos segundos."
        : cause instanceof Error ? cause.message : "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
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
            <span className={styles.eyebrow}>Tu espacio de aprendizaje</span>
            <h1>Vuelve a donde <em>lo dejaste.</em></h1>
            <p>Continúa los niveles de programación orientada a objetos en la web y en tus gafas, con el mismo perfil y progreso.</p>
            <div className={styles.introNote}><span>01 / 06</span> Una ruta para entender cada concepto antes de escribirlo en código.</div>
          </div>
          <section className={styles.card} aria-labelledby="titulo-acceso">
            <span className={styles.cardLabel}>ACCESO A ALGOLAB</span>
            <h2 id="titulo-acceso">Inicia sesión</h2>
            <p className={styles.cardLead}>Ingresa con el correo y la contraseña de tu cuenta.</p>
            {aviso ? <p className={styles.notice} role="status">{aviso}</p> : null}
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <form className={styles.form} onSubmit={iniciarSesion}>
              <label className={styles.field}>
                <span className={styles.cardLabel}>Correo electrónico</span>
                <input className={styles.input} type="email" autoComplete="email" value={correo} onChange={(event) => setCorreo(event.target.value)} placeholder="tu@correo.com" required />
              </label>
              <div className={styles.field}>
                <label className={styles.cardLabel} htmlFor="contrasena">Contraseña</label>
                <span className={styles.inputWrap}>
                  <input id="contrasena" className={`${styles.input} ${styles.inputWithButton}`} type={mostrarContrasena ? "text" : "password"} autoComplete="current-password" value={contrasena} onChange={(event) => setContrasena(event.target.value)} required />
                  <button className={styles.fieldAction} type="button" onClick={() => setMostrarContrasena((actual) => !actual)} aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}>
                    {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </span>
              </div>
              <button className={styles.submit} type="submit" disabled={cargando}>
                {cargando ? <><LoaderCircle className="animate-spin" size={18} /> Conectando…</> : <>Entrar a AlgoLab <ArrowRight size={17} /></>}
              </button>
            </form>
            <p className={styles.footer}>¿Es tu primera vez? <Link href="/registrarse">Crea una cuenta</Link></p>
          </section>
        </div>
      </div>
    </main>
  );
}
