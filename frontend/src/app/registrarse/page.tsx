"use client";

import { ArrowRight, Check, Circle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import styles from "../auth-pages.module.css";
import { AuthLayout } from "@/components/auth-layout";
import type { RobotSignal } from "@/components/robot-stage";
import { AnimatedNotice, Spinner } from "@/components/ui";
import { institutionalEmailError, normalizeInstitutionalEmail } from "@/lib/institutional-email";
import { necesitaCompletarPerfil } from "@/lib/profile-onboarding";
import { saveAuthSession, useAuthSession, type UsuarioSesion } from "@/lib/use-auth-session";

type RespuestaAuth = {
  exitoso?: boolean;
  mensaje?: string;
  token?: string;
  usuario?: UsuarioSesion;
};

type Errores = { nombre?: string; correo?: string; contrasena?: string };

export default function RegistrarsePage() {
  const router = useRouter();
  const { hydrated, token, usuario } = useAuthSession();
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [enviando, setEnviando] = useState(false);
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
    if (!hydrated || !token || !usuario) return;
    // Al crear la cuenta la sesión se guarda y este efecto también se dispara:
    // un estudiante nuevo debe ir a la bienvenida, no saltarse el perfil.
    router.replace(
      usuario.rol === "ADMINISTRADOR"
        ? "/administrador"
        : usuario.rol === "DOCENTE"
          ? "/docente"
          : necesitaCompletarPerfil(usuario)
            ? "/estudiante/bienvenida"
            : "/estudiante",
    );
  }, [hydrated, token, usuario, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("datos") !== "eliminados") return;
    const timer = window.setTimeout(() => setAviso("Tu cuenta y tus datos se eliminaron. Puedes crear una cuenta nueva cuando quieras."), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const largoOk = contrasena.length >= 6;

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const correoNormalizado = normalizeInstitutionalEmail(correo);
    const nuevos: Errores = {
      nombre: nombre.trim() ? undefined : "Escribe tu nombre.",
      correo: institutionalEmailError(correoNormalizado) || undefined,
      contrasena: largoOk ? undefined : "La contraseña debe tener al menos 6 caracteres.",
    };
    setErrores(nuevos);
    if (nuevos.nombre || nuevos.correo || nuevos.contrasena) {
      reaccionar("attention");
      return;
    }

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
      reaccionar("celebrate");

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
      reaccionar("attention");
      setError(cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError")
        ? "El servidor tardó en responder. Espera unos segundos y vuelve a intentarlo."
        : cause instanceof Error ? cause.message : "No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout
      footer={<>¿Ya tienes cuenta? <Link className="link" href="/iniciar-sesion" transitionTypes={["nav-forward"]}>Inicia sesión</Link></>}
      intro="Solo tres datos. Toma un minuto."
      signal={senal}
      steps={{ current: 1, total: 3 }}
      title={<>Crea tu <em>cuenta</em></>}
    >
      <div className="mt-6 grid gap-3 empty:hidden">
        <AnimatedNotice message={aviso} tone="info" />
        <AnimatedNotice message={error} tone="error" />
      </div>
      <form className={styles.form} noValidate onSubmit={registrar}>
        <div className="field">
          <label className="field-label" htmlFor="nombre">Nombre completo</label>
          <input
            aria-describedby={errores.nombre ? "nombre-error" : undefined}
            aria-invalid={Boolean(errores.nombre)}
            autoComplete="name"
            className="field-input"
            id="nombre"
            maxLength={100}
            onChange={(event) => {
              setNombre(event.target.value);
              if (errores.nombre) setErrores((e) => ({ ...e, nombre: undefined }));
            }}
            placeholder="Tu nombre y apellido"
            value={nombre}
          />
          {errores.nombre ? <p className="field-error" id="nombre-error">{errores.nombre}</p> : null}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="correo-registro">Correo electrónico</label>
          <input
            aria-describedby={errores.correo ? "correo-registro-error" : undefined}
            aria-invalid={Boolean(errores.correo)}
            autoComplete="email"
            className="field-input"
            id="correo-registro"
            inputMode="email"
            onChange={(event) => {
              setCorreo(event.target.value);
              if (errores.correo) setErrores((e) => ({ ...e, correo: undefined }));
            }}
            placeholder="tu@campusucc.edu.co"
            type="email"
            value={correo}
          />
          {errores.correo ? <p className="field-error" id="correo-registro-error">{errores.correo}</p> : null}
        </div>
        <div className="field">
          <label className="field-label" htmlFor="contrasena-registro">Contraseña</label>
          <div className={styles.passwordWrap}>
            <input
              aria-describedby="contrasena-reglas"
              aria-invalid={Boolean(errores.contrasena)}
              autoComplete="new-password"
              className="field-input"
              id="contrasena-registro"
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
          <ul className={styles.checklist} id="contrasena-reglas">
            <li className={largoOk ? styles.ok : ""}>
              {largoOk ? <Check size={14} /> : <Circle size={12} />} Al menos 6 caracteres
            </li>
          </ul>
          {errores.contrasena ? <p className="field-error">{errores.contrasena}</p> : null}
        </div>
        <button className="btn btn-primary btn-lg btn-block mt-1" disabled={enviando} type="submit">
          {enviando ? <><Spinner size={18} /> Creando cuenta…</> : <>Crear cuenta <ArrowRight className="icon-shift" size={18} /></>}
        </button>
      </form>
    </AuthLayout>
  );
}
