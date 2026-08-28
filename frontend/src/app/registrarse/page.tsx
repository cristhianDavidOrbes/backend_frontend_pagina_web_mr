"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  RefreshCw,
  Sparkles,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import css from "@/components/auth-security.module.css";
import { OnboardingShowcase } from "@/components/auth/onboarding-showcase";
import {
  institutionalEmailError,
  normalizeInstitutionalEmail,
} from "@/lib/institutional-email";
import {
  saveAuthSession,
  useAuthSession,
  type UsuarioSesion,
} from "@/lib/use-auth-session";

type Paso = "datos" | "codigo" | "bienvenida";
type Tono = "error" | "aviso" | "exito";
type DocumentoLegal = "terminos" | "datos";

const LEGAL_VERSION = "2026-08-26";

function pw(p: string) {
  if (!p) return { pct: 0, label: "", color: "" };
  let pts = 0;
  if (p.length >= 6) pts += 25;
  if (p.length >= 10) pts += 25;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) pts += 25;
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) pts += 25;
  if (pts <= 25) return { pct: 25, label: "Débil", color: "#ff8080" };
  if (pts <= 50) return { pct: 50, label: "Aceptable", color: "#fbbf24" };
  if (pts <= 75) return { pct: 75, label: "Buena", color: "#38bdf8" };
  return { pct: 100, label: "Muy segura", color: "#57eeb2" };
}
async function rj<T>(r: Response): Promise<T> {
  try {
    return (await r.json()) as T;
  } catch {
    throw new Error("Respuesta inesperada del servidor.");
  }
}

/* ─── Stepper ─────────────────────────────────────────────────── */
function Stepper({ paso }: { paso: Paso }) {
  if (paso === "bienvenida") return null;
  const steps = [
    { id: "datos", label: "Registro" },
    { id: "codigo", label: "Verificación" },
  ] as const;
  const cur = steps.findIndex((s) => s.id === paso);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "1.5rem",
        padding: "0.4rem 0.6rem",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "14px",
      }}
    >
      {steps.map((s, i) => {
        const done = i < cur,
          active = i === cur;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.28rem 0.55rem",
                borderRadius: "9px",
                fontSize: "0.67rem",
                fontWeight: 700,
                fontFamily: "var(--font-geist-mono)",
                whiteSpace: "nowrap",
                color: active ? "#e8fff8" : done ? "#a5b6ff" : "#4d6860",
                background: active
                  ? "rgba(87,238,178,0.14)"
                  : done
                  ? "rgba(141,162,251,0.08)"
                  : "transparent",
                border: active ? "1px solid rgba(87,238,178,0.35)" : "1px solid transparent",
                boxShadow: active ? "0 0 14px rgba(87,238,178,0.14)" : "none",
                transition: "all 0.3s ease",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "17px",
                  height: "17px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  fontSize: "0.6rem",
                  fontWeight: 900,
                  background: active
                    ? "#57eeb2"
                    : done
                    ? "rgba(141,162,251,0.3)"
                    : "rgba(255,255,255,0.06)",
                  color: active ? "#03120e" : done ? "#a5b6ff" : "#4d6860",
                  boxShadow: active ? "0 0 10px #57eeb2" : "none",
                }}
              >
                {done ? <CheckCircle2 size={10} /> : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: "clamp(8px, 3vw, 32px)",
                  height: "2px",
                  background: done
                    ? "linear-gradient(90deg, #57eeb2, #8da2fb)"
                    : "rgba(255,255,255,0.07)",
                  borderRadius: "99px",
                  boxShadow: done ? "0 0 8px rgba(87,238,178,0.3)" : "none",
                  transition: "all 0.4s ease",
                  margin: "0 0.15rem",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── FlexboxInput ─────────────────────────────────────────────── */
function FInput({
  id,
  icon,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  autoComplete,
  required,
  minLength,
  hasError,
  showToggle,
  toggleOpen,
  onToggle,
}: {
  id: string;
  icon: React.ReactNode;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  hasError?: boolean;
  showToggle?: boolean;
  toggleOpen?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className={`${css.inputRow} ${hasError ? css.inputRowError : ""}`}>
      <span className={css.inputIcon}>{icon}</span>
      <input
        id={id}
        className={css.inputField}
        type={type}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        spellCheck={false}
        autoCapitalize={type === "email" ? "none" : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {showToggle && (
        <button
          type="button"
          className={css.inputToggle}
          onClick={onToggle}
          aria-label={toggleOpen ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {toggleOpen ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

const REGISTRO_DRAFT_KEY = "algolab_registro_draft";

export default function RegistrarsePage() {
  const router = useRouter();
  const rm = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();

  const [paso, setPaso] = useState<Paso>("datos");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [correoTocado, setCorreoTocado] = useState(false);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);
  const [consentimientoTocado, setConsentimientoTocado] = useState(false);
  const [documentoLegal, setDocumentoLegal] = useState<DocumentoLegal | null>(null);
  const dir = 1;

  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; tono: Tono } | null>(null);

  const [usuarioReg, setUsuarioReg] = useState<UsuarioSesion | undefined>();

  const errCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const pwState = useMemo(() => pw(pass), [pass]);

  // 1. Restaurar automáticamente el borrador guardado en sessionStorage (al volver de ver términos)
  useEffect(() => {
    const restaurar = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(REGISTRO_DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw) as {
            nombre?: string;
            correo?: string;
            aceptaTerminos?: boolean;
            aceptaDatos?: boolean;
          };
          if (draft.nombre) setNombre(draft.nombre);
          if (draft.correo) setCorreo(draft.correo);
          if (typeof draft.aceptaTerminos === "boolean") setAceptaTerminos(draft.aceptaTerminos);
          if (typeof draft.aceptaDatos === "boolean") setAceptaDatos(draft.aceptaDatos);
        }
      } catch {
        // Ignorar excepciones de lectura
      }
    }, 0);
    return () => window.clearTimeout(restaurar);
  }, []);

  // 2. Persistir automáticamente el borrador cada vez que el usuario escribe
  useEffect(() => {
    try {
      if (nombre || correo || aceptaTerminos || aceptaDatos) {
        sessionStorage.setItem(
          REGISTRO_DRAFT_KEY,
          JSON.stringify({ nombre, correo, aceptaTerminos, aceptaDatos })
        );
      }
    } catch {
      // Ignorar excepciones de cuota de storage
    }
  }, [nombre, correo, aceptaTerminos, aceptaDatos]);

  useEffect(() => {
    if (!hydrated || !existingToken || !usuario) return;
    router.replace(
      usuario.rol === "ADMINISTRADOR"
        ? "/administrador"
        : usuario.rol === "DOCENTE"
        ? "/docente"
        : "/estudiante"
    );
  }, [hydrated, existingToken, usuario, router]);

  useEffect(() => {
    if (!documentoLegal) return;

    const overflowAnterior = document.body.style.overflow;
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDocumentoLegal(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [documentoLegal]);

  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCorreoTocado(true);
    setConsentimientoTocado(true);
    const email = normalizeInstitutionalEmail(correo);
    const eE = institutionalEmailError(email);
    if (eE) {
      setMsg({ texto: eE, tono: "error" });
      return;
    }
    if (!pass || pass.length < 6) {
      setMsg({ texto: "La contraseña debe tener mínimo 6 caracteres.", tono: "error" });
      return;
    }
    if (!aceptaTerminos || !aceptaDatos) {
      setMsg({
        texto: "Para crear tu cuenta debes aceptar ambos documentos legales.",
        tono: "error",
      });
      return;
    }

    setEnviando(true);
    setMsg(null);

    try {
      const res = await fetch("/api/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: email,
          contrasena: pass,
          rol: "ESTUDIANTE",
          aceptaTerminos,
          aceptaTratamientoDatos: aceptaDatos,
          versionConsentimiento: LEGAL_VERSION,
        }),
      });

      const data = await rj<{ exitoso?: boolean; mensaje?: string; token?: string; usuario?: UsuarioSesion }>(res);

      if (!res.ok || data.exitoso === false) {
        throw new Error(data.mensaje || "No se pudo crear la cuenta.");
      }

      // Completar una autenticación real: nunca se crea una sesión local sin JWT.
      const loginRes = await fetch("/api/auth/2fa/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, contrasena: pass }),
      });
      const loginData = await rj<{
        exitoso?: boolean;
        mensaje?: string;
        requiere2fa?: boolean;
        token?: string;
        usuario?: UsuarioSesion;
      }>(loginRes);

      if (!loginRes.ok || loginData.exitoso === false) {
        throw new Error(loginData.mensaje || "La cuenta se creó, pero no fue posible iniciar sesión.");
      }

      if (loginData.requiere2fa) {
        router.replace(`/iniciar-sesion?correo=${encodeURIComponent(email)}&registro=exitoso`);
        return;
      }

      if (!loginData.token || !loginData.usuario) {
        throw new Error("La cuenta se creó, pero el servidor no entregó una sesión válida. Inicia sesión nuevamente.");
      }

      try {
        sessionStorage.removeItem(REGISTRO_DRAFT_KEY);
      } catch {
        // ignore
      }
      saveAuthSession(loginData.token, loginData.usuario);
      setUsuarioReg(loginData.usuario);
      setPaso("bienvenida");

    } catch (err: unknown) {
      setMsg({
        texto: err instanceof Error ? err.message : "Error al conectar con el servidor.",
        tono: "error",
      });
    } finally {
      setEnviando(false);
    }
  }
  if (paso === "bienvenida") {
    return (
      <main className="auth-shell flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          <OnboardingShowcase
            onComplete={() => router.replace("/estudiante")}
            usuario={usuarioReg}
          />
        </div>
      </main>
    );
  }

  const scaleBlurSlide = (d: number) =>
    rm
      ? {}
      : {
          initial: { opacity: 0, x: d * 60, scale: 0.9, filter: "blur(10px)", rotateY: d * 8 },
          animate: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)", rotateY: 0 },
          exit: { opacity: 0, x: d * -60, scale: 0.9, filter: "blur(10px)", rotateY: d * -8 },
          transition: { type: "spring" as const, stiffness: 300, damping: 28, mass: 0.9 },
        };

  return (
    <main className="auth-shell min-h-screen">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">A</span>
        <strong>AlgoLab</strong>
      </Link>

      <section className="auth-layout">
        {/* Left story */}
        <motion.div
          className="auth-story"
          initial={{ opacity: 0, x: rm ? 0 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={paso}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
            >
              <span className="section-kicker">
                {paso === "datos" && "Registro en AlgoLab"}
                {paso === "codigo" && "Verificación de Correo"}
              </span>
              <h1>
                {paso === "datos" && "Crea tu perfil y accede a los niveles."}
                {paso === "codigo" && "Confirma tu código de seguridad."}
              </h1>
              <p>
                {paso === "datos" &&
                  "Tu cuenta conecta el portal web, el compilador local y las experiencias de Realidad Mixta."}
                {paso === "codigo" &&
                  `Revisa tu bandeja de entrada e ingresa el código de 6 dígitos enviado a tu correo.`}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="auth-code mt-8">
            <span>estudiante</span>
            <strong>{paso === "datos" ? ".crearPerfil();" : ".verificarIdentidad();"}</strong>
            <small>
              {paso === "datos"
                ? "// correo institucional · contraseña"
                : "// verificación segura"}
            </small>
          </div>
        </motion.div>

        {/* Right card */}
        <motion.div
          className={`auth-card ${css.securityCard}`}
          initial={{ opacity: 0, scale: rm ? 1 : 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div aria-hidden className={css.cardCircuit} />
          <Stepper paso={paso} />

          <AnimatePresence mode="wait" custom={dir}>
            {/* ══ PASO 1: DATOS ══ */}
            {paso === "datos" && (
              <motion.div key="datos" {...scaleBlurSlide(dir)}>
                <p className="section-kicker">Paso 1 de 2</p>
                <h2>Crear tu cuenta</h2>
                <p className="auth-copy">
                  Completa tus datos para ingresar al laboratorio de programación de AlgoLab.
                </p>

                {msg && (
                  <div className={`auth-banner auth-banner-${msg.tono} mt-3`}>
                    {msg.texto}
                  </div>
                )}

                <form className="mt-5 space-y-4" onSubmit={registrar} noValidate>
                  <div>
                    <label className="field-label" htmlFor="rn">
                      Nombre completo
                    </label>
                    <FInput
                      id="rn"
                      icon={<User size={18} />}
                      placeholder="Ej: Cristhian Orbes"
                      value={nombre}
                      onChange={setNombre}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="field-label" htmlFor="re">
                        Correo Electrónico
                      </label>
                    </div>
                    <FInput
                      id="re"
                      icon={<Mail size={18} />}
                      type="email"
                      placeholder="Correo institucional"
                      value={correo}
                      onChange={(v) => {
                        setCorreo(v);
                        if (correoTocado) setMsg(null);
                      }}
                      onBlur={() => setCorreoTocado(true)}
                      autoComplete="email"
                      required
                      hasError={Boolean(errCorreo)}
                    />
                    <small className={errCorreo ? css.fieldError : css.fieldHelp}>
                      {errCorreo || "Ingresa el correo institucional asignado por tu universidad."}
                    </small>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="rpw">
                      Contraseña
                    </label>
                    <FInput
                      id="rpw"
                      icon={<LockKeyhole size={18} />}
                      type={verPass ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={pass}
                      onChange={setPass}
                      autoComplete="new-password"
                      required
                      minLength={6}
                      showToggle
                      toggleOpen={verPass}
                      onToggle={() => setVerPass((p) => !p)}
                    />
                    {pass && (
                      <div className={css.strengthMeter}>
                        <div className={css.strengthBarTrack}>
                          <div
                            className={css.strengthBarFill}
                            style={{ width: `${pwState.pct}%`, backgroundColor: pwState.color }}
                          />
                        </div>
                        <div className={css.strengthText}>
                          <span style={{ color: pwState.color }}>{pwState.label}</span>
                          <span>{pass.length} caracteres</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <fieldset
                    className={`${css.consentGroup} ${
                      consentimientoTocado && (!aceptaTerminos || !aceptaDatos)
                        ? css.consentGroupError
                        : ""
                    }`}
                    aria-describedby="consent-help consent-error"
                  >
                    <legend>Consentimientos requeridos</legend>
                    <div className={css.consentRow}>
                      <input
                        id="acepta-terminos"
                        type="checkbox"
                        checked={aceptaTerminos}
                        onChange={(event) => {
                          setAceptaTerminos(event.target.checked);
                          setMsg(null);
                        }}
                        aria-invalid={consentimientoTocado && !aceptaTerminos}
                        required
                      />
                      <div>
                        <label htmlFor="acepta-terminos">Acepto los Términos y Condiciones.</label>
                        <button
                          type="button"
                          className={css.consentLink}
                          onClick={() => setDocumentoLegal("terminos")}
                        >
                          Leer documento completo
                        </button>
                      </div>
                    </div>
                    <div className={css.consentRow}>
                      <input
                        id="acepta-datos"
                        type="checkbox"
                        checked={aceptaDatos}
                        onChange={(event) => {
                          setAceptaDatos(event.target.checked);
                          setMsg(null);
                        }}
                        aria-invalid={consentimientoTocado && !aceptaDatos}
                        required
                      />
                      <div>
                        <label htmlFor="acepta-datos">
                          Autorizo el tratamiento de mis datos personales para operar AlgoLab.
                        </label>
                        <button
                          type="button"
                          className={css.consentLink}
                          onClick={() => setDocumentoLegal("datos")}
                        >
                          Consultar política de datos
                        </button>
                      </div>
                    </div>
                    <small id="consent-help">
                      Son autorizaciones independientes y necesarias para crear la cuenta.
                    </small>
                    {consentimientoTocado && (!aceptaTerminos || !aceptaDatos) && (
                      <small id="consent-error" role="alert" className={css.consentError}>
                        Marca las dos casillas para continuar.
                      </small>
                    )}
                  </fieldset>
                  <button
                    className="primary-button flex w-full items-center justify-center gap-2 mt-2"
                    disabled={
                      enviando ||
                      !nombre.trim() ||
                      !pass ||
                      Boolean(errCorreo) ||
                      !aceptaTerminos ||
                      !aceptaDatos
                    }
                    type="submit"
                  >
                    {enviando ? (
                      <RefreshCw className={css.spinning} size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {enviando ? "Creando cuenta…" : "Crear Cuenta (Acceso Inmediato)"}
                  </button>
                </form>

                <div className="pt-4 text-center text-xs text-slate-400">
                  ¿Ya tienes una cuenta?{" "}
                  <Link href="/iniciar-sesion" className="font-semibold text-emerald-400 hover:underline">
                    Inicia sesión aquí
                  </Link>
                </div>
              </motion.div>
            )}


          </AnimatePresence>
        </motion.div>
      </section>

      <AnimatePresence>
        {documentoLegal && (
          <motion.div
            className={css.legalModalBackdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDocumentoLegal(null);
            }}
          >
            <motion.section
              className={css.legalModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="registro-documento-legal"
              initial={rm ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={rm ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <header className={css.legalModalHeader}>
                <div>
                  <span>Documento legal de AlgoLab</span>
                  <h2 id="registro-documento-legal">
                    {documentoLegal === "terminos"
                      ? "Términos y Condiciones"
                      : "Tratamiento de Datos Personales"}
                  </h2>
                </div>
                <button
                  type="button"
                  className={css.legalModalClose}
                  onClick={() => setDocumentoLegal(null)}
                  aria-label="Cerrar documento y volver al registro"
                  autoFocus
                >
                  <X size={22} aria-hidden />
                </button>
              </header>
              <iframe
                className={css.legalModalFrame}
                src={
                  documentoLegal === "terminos"
                    ? "/terminos-y-condiciones?embedded=1"
                    : "/tratamiento-de-datos?embedded=1"
                }
                title={
                  documentoLegal === "terminos"
                    ? "Términos y Condiciones de AlgoLab"
                    : "Tratamiento de Datos Personales de AlgoLab"
                }
              />
              <footer className={css.legalModalFooter}>
                <p>Tu formulario permanece intacto mientras consultas este documento.</p>
                <button type="button" onClick={() => setDocumentoLegal(null)}>
                  Volver al registro
                </button>
              </footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
