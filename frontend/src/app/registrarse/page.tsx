"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, LockKeyhole, Mail, RefreshCw, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import styles from "@/components/auth-security.module.css";
import {
  institutionalEmailError,
  isInstitutionalEmail,
  normalizeInstitutionalEmail,
} from "@/lib/institutional-email";
import { useAuthSession } from "@/lib/use-auth-session";

type RegistroRespuesta = { exitoso?: boolean; mensaje?: string };
type TonoMensaje = "error" | "aviso" | "exito";

const PHONE_E164_PATTERN = /^\+[1-9]\d{7,14}$/;

function normalizePhone(value: string) {
  return value.trim().replace(/[\s()-]/g, "");
}

function phoneError(value: string) {
  const normalized = normalizePhone(value);
  if (!normalized) return "";
  return PHONE_E164_PATTERN.test(normalized)
    ? ""
    : "Usa formato internacional E.164, por ejemplo +573001234567.";
}

async function readJson(response: Response): Promise<RegistroRespuesta> {
  try {
    return await response.json() as RegistroRespuesta;
  } catch {
    throw new Error("El servidor respondió con un formato inesperado. Intenta de nuevo.");
  }
}

export default function RegistrarsePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();
  const emailRef = useRef<HTMLInputElement | null>(null);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [correoTocado, setCorreoTocado] = useState(false);
  const [celularTocado, setCelularTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tono: TonoMensaje } | null>(null);

  const errorCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const errorCelular = celularTocado ? phoneError(celular) : "";

  useEffect(() => {
    if (!hydrated || !existingToken || !usuario) return;
    const route = usuario.rol === "ADMINISTRADOR"
      ? "/administrador"
      : usuario.rol === "DOCENTE"
        ? "/docente"
        : "/estudiante";
    router.replace(route);
  }, [hydrated, existingToken, usuario, router]);

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCorreoTocado(true);
    setCelularTocado(true);

    const normalizedEmail = normalizeInstitutionalEmail(correo);
    const normalizedPhone = normalizePhone(celular);
    const emailValidation = institutionalEmailError(normalizedEmail);
    const phoneValidation = phoneError(normalizedPhone);
    if (emailValidation || phoneValidation) {
      setMensaje({ texto: emailValidation || phoneValidation, tono: "error" });
      if (emailValidation) emailRef.current?.focus();
      return;
    }

    setEnviando(true);
    setMensaje(null);
    try {
      const response = await fetch("/api/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: normalizedEmail,
          celular: normalizedPhone || undefined,
          contrasena,
          rol: "ESTUDIANTE",
        }),
      });
      const data = await readJson(response);
      if (!response.ok || data.exitoso === false) {
        const fallback = response.status === 429
          ? "Se realizaron demasiados intentos. Espera un momento antes de continuar."
          : response.status >= 500
            ? "El registro está temporalmente fuera de servicio. Intenta de nuevo en unos minutos."
            : "No se pudo crear la cuenta.";
        setMensaje({ texto: data.mensaje ?? fallback, tono: response.status >= 500 ? "aviso" : "error" });
        return;
      }

      setMensaje({ texto: "Perfil institucional creado. Preparando tu verificación segura…", tono: "exito" });
      router.push("/iniciar-sesion?registro=exitoso");
    } catch (error) {
      setMensaje({
        texto: error instanceof Error ? error.message : "No se pudo conectar con AlgoLab.",
        tono: "aviso",
      });
    } finally {
      setEnviando(false);
    }
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.45, ease: "easeOut" as const };

  return (
    <main className="auth-shell min-h-screen">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">A</span>
        <strong>AlgoLab</strong>
      </Link>

      <section className="auth-layout">
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="auth-story"
          initial={{ opacity: 0, x: reduceMotion ? 0 : -18 }}
          transition={transition}
        >
          <p className="section-kicker">Identidad institucional</p>
          <h1>Crea una identidad que viajará contigo.</h1>
          <p>
            Tu cuenta conecta el portal, el progreso pedagógico y las gafas de realidad mixta. Solo estudiantes con correo UCC pueden abrir esta ruta.
          </p>
          <div className="auth-code">
            <span>estudiante</span>
            <strong>{".iniciarRutaSegura();"}</strong>
            <small>{"// correo UCC · 2FA · progreso sincronizado"}</small>
          </div>
          <div className={styles.institutionalNotice}>
            <ShieldCheck aria-hidden="true" size={22} />
            <div>
              <strong>Dominio institucional obligatorio</strong>
              <p>Usa exactamente una dirección terminada en @campusucc.edu.co. Los correos personales no pueden registrarse.</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className={`auth-card ${styles.securityCard}`}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.975 }}
          transition={transition}
        >
          <div aria-hidden="true" className={styles.cardCircuit} />
          <p className="section-kicker">Primera misión</p>
          <h2>Crear perfil UCC</h2>
          <p className="auth-copy">Tus datos esenciales quedan listos para protegerse con un código temporal al iniciar sesión.</p>

          <form className="mt-7 space-y-5" onSubmit={registrar}>
            <label className="field-label" htmlFor="full-name">
              Nombre completo
              <span className={styles.inputShell}>
                <Sparkles aria-hidden="true" size={18} />
                <input autoComplete="name" className="field-input" id="full-name" onChange={(event) => setNombre(event.target.value)} placeholder="Tu nombre" required value={nombre} />
              </span>
            </label>

            <label className="field-label" htmlFor="register-email">
              Correo institucional
              <span className={styles.inputShell}>
                <Mail aria-hidden="true" size={18} />
                <input
                  aria-describedby="register-email-help"
                  aria-invalid={Boolean(errorCorreo)}
                  autoCapitalize="none"
                  autoComplete="email"
                  className="field-input"
                  id="register-email"
                  onBlur={() => setCorreoTocado(true)}
                  onChange={(event) => { setCorreo(event.target.value); if (correoTocado) setMensaje(null); }}
                  placeholder="nombre.apellido@campusucc.edu.co"
                  ref={emailRef}
                  required
                  spellCheck={false}
                  type="email"
                  value={correo}
                />
              </span>
              <small className={errorCorreo ? styles.fieldError : styles.fieldHelp} id="register-email-help">
                {errorCorreo || "Solo se aceptan cuentas @campusucc.edu.co"}
              </small>
            </label>

            <label className="field-label" htmlFor="register-phone">
              Celular para SMS · opcional
              <span className={styles.inputShell}>
                <Smartphone aria-hidden="true" size={18} />
                <input
                  aria-describedby="register-phone-help"
                  aria-invalid={Boolean(errorCelular)}
                  autoComplete="tel"
                  className="field-input"
                  id="register-phone"
                  inputMode="tel"
                  onBlur={() => setCelularTocado(true)}
                  onChange={(event) => { setCelular(event.target.value); if (celularTocado) setMensaje(null); }}
                  placeholder="+573001234567"
                  type="tel"
                  value={celular}
                />
              </span>
              <small className={errorCelular ? styles.fieldError : styles.fieldHelp} id="register-phone-help">
                {errorCelular || "Opcional. Habilita el segundo factor por SMS real; el correo seguirá disponible."}
              </small>
            </label>

            <label className="field-label" htmlFor="register-password">
              Contraseña
              <span className={styles.inputShell}>
                <LockKeyhole aria-hidden="true" size={18} />
                <input autoComplete="new-password" className="field-input" id="register-password" minLength={6} onChange={(event) => setContrasena(event.target.value)} placeholder="Mínimo 6 caracteres" required type="password" value={contrasena} />
              </span>
            </label>

            <button
              className="primary-button flex w-full items-center justify-center gap-2"
              disabled={enviando || !nombre.trim() || !contrasena || (correoTocado && !isInstitutionalEmail(correo)) || Boolean(errorCelular)}
              type="submit"
            >
              {enviando ? <RefreshCw aria-hidden="true" className={styles.spinning} size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
              {enviando ? "Creando identidad segura…" : "Crear mi perfil institucional"}
            </button>
          </form>

          <div aria-atomic="true" aria-live="polite" className={styles.messageRegion}>
            {mensaje ? (
              <div className={styles.feedback} data-tone={mensaje.tono} role={mensaje.tono === "error" ? "alert" : "status"}>
                {mensaje.tono === "exito" ? <CheckCircle2 aria-hidden="true" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
                <span>{mensaje.texto}</span>
              </div>
            ) : null}
          </div>

          <p className="auth-switch">¿Ya tienes una cuenta? <Link href="/iniciar-sesion">Inicia sesión con 2FA</Link></p>
        </motion.div>
      </section>
    </main>
  );
}
