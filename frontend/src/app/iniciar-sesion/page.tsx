"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import styles from "../auth-pages.module.css";
import { AuthLayout } from "@/components/auth-layout";
import type { RobotSignal } from "@/components/robot-stage";
import { AnimatedNotice, Spinner } from "@/components/ui";
import { institutionalEmailError, normalizeInstitutionalEmail } from "@/lib/institutional-email";
import { necesitaCompletarPerfil } from "@/lib/profile-onboarding";
import { clearAuthSession, saveAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type RespuestaLogin = {
  exitoso?: boolean;
  mensaje?: string;
  token?: string;
  usuario?: UsuarioSesion;
};

type Errores = { correo?: string; contrasena?: string };

export default function IniciarSesionPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [senal, setSenal] = useState<RobotSignal | null>({ kind: "wave", id: 1 });
  const senalId = useRef(1);

  function reaccionar(kind: RobotSignal["kind"]) {
    senalId.current += 1;
    setSenal({ kind, id: senalId.current });
  }

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
    const nuevos: Errores = {
      correo: institutionalEmailError(correoNormalizado) || undefined,
      contrasena: contrasena ? undefined : "Escribe tu contraseña.",
    };
    setErrores(nuevos);
    if (nuevos.correo || nuevos.contrasena) {
      reaccionar("attention");
      return;
    }

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
      reaccionar("celebrate");
      const destino = datos.usuario.rol === "ADMINISTRADOR"
        ? "/administrador"
        : datos.usuario.rol === "DOCENTE"
          ? "/docente"
          : necesitaCompletarPerfil(datos.usuario)
            ? "/estudiante/bienvenida"
            : "/estudiante";
      router.replace(destino);
    } catch (cause) {
      reaccionar("attention");
      setError(cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")
        ? "El servidor tardó en responder. Vuelve a intentarlo en unos segundos."
        : cause instanceof Error ? cause.message : "No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <AuthLayout
      footer={<>¿Primera vez? <Link className="link" href="/registrarse" transitionTypes={["nav-forward"]}>Crea tu cuenta</Link></>}
      intro="Continúa tu ruta donde la dejaste."
      signal={senal}
      title={<>¡Hola <em>de nuevo!</em></>}
    >
      <div className="mt-6 grid gap-3 empty:hidden">
        <AnimatedNotice message={aviso} tone="success" />
        <AnimatedNotice message={error} tone="error" />
      </div>
      <form className={styles.form} noValidate onSubmit={iniciarSesion}>
        <div className="field">
          <label className="field-label" htmlFor="correo">Correo electrónico</label>
          <input
            aria-describedby={errores.correo ? "correo-error" : undefined}
            aria-invalid={Boolean(errores.correo)}
            autoComplete="email"
            className="field-input"
            id="correo"
            inputMode="email"
            onChange={(event) => {
              setCorreo(event.target.value);
              if (errores.correo) setErrores((e) => ({ ...e, correo: undefined }));
            }}
            placeholder="tu@campusucc.edu.co"
            type="email"
            value={correo}
          />
          {errores.correo ? <p className="field-error" id="correo-error">{errores.correo}</p> : null}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="contrasena">Contraseña</label>
          <div className={styles.passwordWrap}>
            <input
              aria-describedby={errores.contrasena ? "contrasena-error" : undefined}
              aria-invalid={Boolean(errores.contrasena)}
              autoComplete="current-password"
              className="field-input"
              id="contrasena"
              onChange={(event) => {
                setContrasena(event.target.value);
                if (errores.contrasena) setErrores((e) => ({ ...e, contrasena: undefined }));
              }}
              type={mostrarContrasena ? "text" : "password"}
              value={contrasena}
            />
            <button
              aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={mostrarContrasena}
              className={`btn btn-ghost btn-icon btn-sm ${styles.reveal}`}
              onClick={() => setMostrarContrasena((actual) => !actual)}
              type="button"
            >
              {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errores.contrasena ? <p className="field-error" id="contrasena-error">{errores.contrasena}</p> : null}
        </div>
        <button className="btn btn-primary btn-lg btn-block mt-1" disabled={cargando} type="submit">
          {cargando ? <><Spinner size={18} /> Conectando…</> : <>Entrar <ArrowRight className="icon-shift" size={18} /></>}
        </button>
      </form>
    </AuthLayout>
  );
}
