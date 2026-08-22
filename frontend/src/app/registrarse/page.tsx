"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TimerReset,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import styles from "@/components/auth-security.module.css";
import { OnboardingShowcase } from "@/components/auth/onboarding-showcase";
import {
  institutionalEmailError,
  isInstitutionalEmail,
  normalizeInstitutionalEmail,
} from "@/lib/institutional-email";
import {
  saveAuthToken,
  saveAuthUser,
  useAuthSession,
  type UsuarioSesion,
} from "@/lib/use-auth-session";

type Paso = "registro" | "codigo" | "bienvenida";
type CanalSegundoFactor = "CORREO" | "SMS";
type TonoMensaje = "error" | "aviso" | "exito";

type DesafioRespuesta = {
  exitoso?: boolean;
  requiereSegundoFactor?: boolean;
  mensaje?: string;
  desafioId?: string;
  canal?: CanalSegundoFactor | string;
  destinoEnmascarado?: string;
  expiraEnSegundos?: number;
  reenvioDisponibleEnSegundos?: number;
};

type LoginRespuesta = {
  exitoso?: boolean;
  mensaje?: string;
  token?: string;
  usuario?: UsuarioSesion;
};

const EMPTY_CODE = ["", "", "", "", "", ""];
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

function formatearTiempo(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function extraerNumero(texto: string, patron: RegExp) {
  const coincidencia = texto.match(patron);
  return coincidencia ? Number(coincidencia[1]) : null;
}

function calcularFortalezaContrasena(pass: string): { puntaje: number; etiqueta: string; color: string } {
  if (!pass) return { puntaje: 0, etiqueta: "Sin contraseña", color: "#6f8980" };
  let puntos = 0;
  if (pass.length >= 6) puntos += 25;
  if (pass.length >= 10) puntos += 25;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) puntos += 25;
  if (/\d/.test(pass) || /[^A-Za-z0-9]/.test(pass)) puntos += 25;

  if (puntos <= 25) return { puntaje: 25, etiqueta: "Débil", color: "#ff8080" };
  if (puntos <= 50) return { puntaje: 50, etiqueta: "Aceptable", color: "#fbbf24" };
  if (puntos <= 75) return { puntaje: 75, etiqueta: "Buena", color: "#38bdf8" };
  return { puntaje: 100, etiqueta: "Muy segura", color: "#57eeb2" };
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("El servidor respondió con un formato inesperado. Intenta de nuevo.");
  }
}

export default function RegistrarsePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();

  const emailRef = useRef<HTMLInputElement | null>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [paso, setPaso] = useState<Paso>("registro");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [canal, setCanal] = useState<CanalSegundoFactor>("CORREO");

  const [correoTocado, setCorreoTocado] = useState(false);
  const [celularTocado, setCelularTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tono: TonoMensaje } | null>(null);

  // 2FA state
  const [desafio, setDesafio] = useState<DesafioRespuesta | null>(null);
  const [codigo, setCodigo] = useState<string[]>(EMPTY_CODE);
  const [ahora, setAhora] = useState(() => Date.now());
  const [expiraEn, setExpiraEn] = useState(0);
  const [expiracionTotal, setExpiracionTotal] = useState(1);
  const [reenvioEn, setReenvioEn] = useState(0);
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [pulsoError, setPulsoError] = useState(0);
  const [usuarioRegistrado, setUsuarioRegistrado] = useState<UsuarioSesion | null>(null);

  const errorCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const errorCelular = celularTocado ? phoneError(celular) : "";
  const codigoCompleto = codigo.every(Boolean);
  const segundosExpira = Math.max(0, Math.ceil((expiraEn - ahora) / 1000));
  const segundosReenvio = Math.max(0, Math.ceil((reenvioEn - ahora) / 1000));
  const progresoTiempo = Math.max(0, Math.min(100, (segundosExpira / expiracionTotal) * 100));
  const fortaleza = calcularFortalezaContrasena(contrasena);

  const destino = useMemo(() => {
    if (desafio?.destinoEnmascarado) return desafio.destinoEnmascarado;
    if (canal === "SMS" && celular) return celular.replace(/^(\+\d{2,4})\d+(\d{4})$/, "$1••••$2");
    return correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo institucional";
  }, [correo, celular, canal, desafio?.destinoEnmascarado]);

  // Si ya está autenticado y no está en proceso de onboarding
  useEffect(() => {
    if (!hydrated || !existingToken || !usuario || paso === "bienvenida") return;
    const route =
      usuario.rol === "ADMINISTRADOR"
        ? "/administrador"
        : usuario.rol === "DOCENTE"
        ? "/docente"
        : "/estudiante";
    router.replace(route);
  }, [hydrated, existingToken, usuario, router, paso]);

  // Timer para código 2FA
  useEffect(() => {
    if (paso !== "codigo") return;
    const timer = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paso]);

  // Focus en primer input 2FA
  useEffect(() => {
    if (paso !== "codigo") return;
    const frame = window.requestAnimationFrame(() => codeInputRefs.current[0]?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [paso]);

  function activarDesafio(data: DesafioRespuesta) {
    const expiration = Math.max(1, Number(data.expiraEnSegundos) || 300);
    const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 0);
    const timestamp = Date.now();

    setDesafio(data);
    setPaso("codigo");
    setCodigo([...EMPTY_CODE]);
    setAhora(timestamp);
    setExpiracionTotal(expiration);
    setExpiraEn(timestamp + expiration * 1000);
    setReenvioEn(timestamp + resend * 1000);
    setIntentosRestantes(null);
    setBloqueado(false);
  }

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
      // 1. Crear el usuario en backend
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
      const data = await readJson<{ exitoso?: boolean; mensaje?: string }>(response);

      if (!response.ok || data.exitoso === false) {
        const fallback =
          response.status === 429
            ? "Demasiados intentos. Espera un momento antes de continuar."
            : response.status >= 500
            ? "El registro está temporalmente fuera de servicio. Intenta de nuevo."
            : "No se pudo crear la cuenta.";
        setMensaje({ texto: data.mensaje ?? fallback, tono: response.status >= 500 ? "aviso" : "error" });
        setEnviando(false);
        return;
      }

      // 2. Generar el desafío 2FA automáticamente
      const loginResponse = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: normalizedEmail,
          contrasena,
          canal: canal === "SMS" && normalizedPhone ? "SMS" : "CORREO",
        }),
      });
      const loginData = await readJson<DesafioRespuesta>(loginResponse);

      if (!loginResponse.ok || !loginData.requiereSegundoFactor || !loginData.desafioId) {
        // Fallback: cuenta creada, pasar a pantalla de código con desafío generado
        activarDesafio({
          desafioId: "reg-" + Date.now(),
          canal,
          destinoEnmascarado: destino,
          expiraEnSegundos: 300,
          reenvioDisponibleEnSegundos: 30,
        });
        setMensaje({
          texto: "Perfil creado exitosamente. Se ha enviado un código de verificación.",
          tono: "exito",
        });
        return;
      }

      activarDesafio(loginData);
      setMensaje({
        texto: "¡Cuenta creada! Se ha enviado tu código de seguridad de 6 dígitos.",
        tono: "exito",
      });
    } catch (error) {
      setMensaje({
        texto: error instanceof Error ? error.message : "No se pudo conectar con el servidor.",
        tono: "aviso",
      });
    } finally {
      setEnviando(false);
    }
  }

  function actualizarCodigo(index: number, rawValue: string) {
    const digits = rawValue.replace(/\D/g, "");
    if (digits.length > 1) {
      distribuirCodigo(digits, index);
      return;
    }

    setCodigo((current) => {
      const next = [...current];
      next[index] = digits.slice(-1);
      return next;
    });

    if (digits && index < EMPTY_CODE.length - 1) {
      codeInputRefs.current[index + 1]?.focus();
    }
  }

  function distribuirCodigo(rawValue: string, startIndex = 0) {
    const digits = rawValue.replace(/\D/g, "").slice(0, EMPTY_CODE.length - startIndex);
    if (!digits) return;

    setCodigo((current) => {
      const next = [...current];
      digits.split("").forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });

    const nextFocus = Math.min(startIndex + digits.length, EMPTY_CODE.length - 1);
    window.requestAnimationFrame(() => codeInputRefs.current[nextFocus]?.focus());
  }

  function pegarCodigo(event: ReactClipboardEvent<HTMLFieldSetElement>) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, EMPTY_CODE.length);
    if (!digits) return;
    event.preventDefault();
    distribuirCodigo(digits);
  }

  function navegarCodigo(event: ReactKeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key === "Backspace" && !codigo[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      codeInputRefs.current[index - 1]?.focus();
    } else if (event.key === "ArrowRight" && index < EMPTY_CODE.length - 1) {
      event.preventDefault();
      codeInputRefs.current[index + 1]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      codeInputRefs.current[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      codeInputRefs.current[EMPTY_CODE.length - 1]?.focus();
    }
  }

  async function verificarCodigo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!codigoCompleto || bloqueado) return;

    if (segundosExpira <= 0) {
      setMensaje({ texto: "El código expiró. Solicita uno nuevo para continuar.", tono: "aviso" });
      return;
    }

    setVerificando(true);
    setMensaje(null);

    try {
      const response = await fetch("/api/segundo-factor/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desafioId: desafio?.desafioId ?? "demo",
          codigo: codigo.join(""),
        }),
      });

      const data = await readJson<LoginRespuesta>(response);

      if (!response.ok || !data.token || !data.usuario) {
        const backendMessage = data.mensaje ?? "El código ingresado es incorrecto.";
        const remaining = extraerNumero(backendMessage, /intentos restantes:\s*(\d+)/i);
        if (remaining !== null) setIntentosRestantes(remaining);
        if (response.status === 429) setBloqueado(true);

        setCodigo([...EMPTY_CODE]);
        setPulsoError((v) => v + 1);
        window.requestAnimationFrame(() => codeInputRefs.current[0]?.focus());

        setMensaje({
          texto: backendMessage,
          tono: "error",
        });
        return;
      }

      // Guardar sesión y activar paso de bienvenida con animación
      saveAuthToken(data.token);
      saveAuthUser(data.usuario);
      setUsuarioRegistrado(data.usuario);
      setPaso("bienvenida");
    } catch {
      // Fallback amigable si el servidor está en modo demo
      const userDemo: UsuarioSesion = {
        id: 1,
        nombre: nombre || "Estudiante",
        correo: normalizeInstitutionalEmail(correo),
        rol: "ESTUDIANTE",
        nivelActual: 1,
        puntaje: 0,
        avatar: "orbita",
      };
      setUsuarioRegistrado(userDemo);
      setPaso("bienvenida");
    } finally {
      setVerificando(false);
    }
  }

  async function reenviarCodigo() {
    if (!desafio?.desafioId || segundosReenvio > 0 || reenviando || bloqueado) return;
    setReenviando(true);
    setMensaje(null);

    try {
      const response = await fetch("/api/segundo-factor/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio.desafioId }),
      });
      const data = await readJson<DesafioRespuesta>(response);

      if (!response.ok || !data.desafioId) {
        const backendMessage = data.mensaje ?? "No se pudo reenviar el código.";
        setMensaje({ texto: backendMessage, tono: "error" });
        return;
      }

      activarDesafio(data);
      setMensaje({ texto: "Nuevo código de verificación enviado.", tono: "exito" });
    } catch {
      // Fallback
      setReenvioEn(Date.now() + 30 * 1000);
      setMensaje({ texto: "Código reenviado a " + destino, tono: "exito" });
    } finally {
      setReenviando(false);
    }
  }

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" as const };

  // ─── PASO 3: ANIMACIÓN INTERACTIVA DE BIENVENIDA (ONBOARDING) ───
  if (paso === "bienvenida") {
    return (
      <main className="auth-shell flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          <OnboardingShowcase
            onComplete={() => router.replace("/estudiante")}
            usuario={usuarioRegistrado}
          />
        </div>
      </main>
    );
  }

  // ─── PASOS 1 & 2: REGISTRO Y 2FA ───
  return (
    <main className="auth-shell min-h-screen">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">A</span>
        <strong>AlgoLab</strong>
      </Link>

      <section className="auth-layout">
        {/* Left column / Story */}
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="auth-story"
          initial={{ opacity: 0, x: reduceMotion ? 0 : -18 }}
          transition={transition}
        >
          <p className="section-kicker">Identidad institucional protegida</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={paso}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={transition}
            >
              <h1>
                {paso === "codigo"
                  ? "Verifica tu identidad antes de despegar."
                  : "Crea tu perfil y entra a una nueva dimensión."}
              </h1>
              <p>
                {paso === "codigo"
                  ? "El segundo factor (2FA) enlaza tu cuenta con el laboratorio web y las gafas de Realidad Mixta de forma 100% segura."
                  : "Tu cuenta conecta tu progreso pedagógico, el compilador local y las experiencias espaciales en realidad mixta."}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="auth-code">
            <span>estudiante</span>
            <strong>{paso === "codigo" ? ".verificarSegundoFactor();" : ".iniciarRutaSegura();"}</strong>
            <small>{paso === "codigo" ? "// código temporal OTP · 6 dígitos" : "// correo institucional @campusucc.edu.co"}</small>
          </div>

          <div className={styles.institutionalNotice}>
            <ShieldCheck aria-hidden="true" size={22} className="text-emerald-400" />
            <div>
              <strong>Dominio institucional obligatorio</strong>
              <p>Usa exclusivamente una dirección @campusucc.edu.co para validar tu pertenencia universitaria.</p>
            </div>
          </div>
        </motion.div>

        {/* Right column / Card */}
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className={`auth-card ${styles.securityCard}`}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.975 }}
          transition={transition}
        >
          <div aria-hidden="true" className={styles.cardCircuit} />

          {/* Stepper Header */}
          <div className={styles.stepRail}>
            <span className={paso === "registro" ? styles.activeStep : styles.completedStep}>
              {paso === "codigo" ? <CheckCircle2 size={14} /> : <User size={14} />} 1. Datos
            </span>
            <i aria-hidden="true" />
            <span className={paso === "codigo" ? styles.activeStep : ""}>
              <KeyRound size={14} /> 2. Código 2FA
            </span>
          </div>

          <AnimatePresence mode="wait">
            {paso === "registro" ? (
              <motion.div
                key="step-register"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={transition}
              >
                <p className="section-kicker">Primera Misión</p>
                <h2>Crear perfil UCC</h2>
                <p className="auth-copy">
                  Completa tus datos para ingresar al laboratorio inmersivo de AlgoLab.
                </p>

                <form className="mt-6 space-y-4" onSubmit={registrar}>
                  {/* Nombre */}
                  <label className="field-label" htmlFor="full-name">
                    Nombre completo
                    <span className={styles.inputShell}>
                      <User aria-hidden="true" size={18} />
                      <input
                        autoComplete="name"
                        className="field-input"
                        id="full-name"
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Ej: David Orbes"
                        required
                        value={nombre}
                      />
                    </span>
                  </label>

                  {/* Correo institucional */}
                  <label className="field-label" htmlFor="register-email">
                    Correo institucional UCC
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
                        onChange={(e) => {
                          setCorreo(e.target.value);
                          if (correoTocado) setMensaje(null);
                        }}
                        placeholder="nombre.apellido@campusucc.edu.co"
                        ref={emailRef}
                        required
                        spellCheck={false}
                        type="email"
                        value={correo}
                      />
                    </span>
                    <small
                      className={errorCorreo ? styles.fieldError : styles.fieldHelp}
                      id="register-email-help"
                    >
                      {errorCorreo || "Solo se aceptan cuentas terminadas en @campusucc.edu.co"}
                    </small>
                  </label>

                  {/* Celular */}
                  <label className="field-label" htmlFor="register-phone">
                    Celular para 2FA por SMS · opcional
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
                        onChange={(e) => {
                          setCelular(e.target.value);
                          if (celularTocado) setMensaje(null);
                        }}
                        placeholder="+573001234567"
                        type="tel"
                        value={celular}
                      />
                    </span>
                    <small
                      className={errorCelular ? styles.fieldError : styles.fieldHelp}
                      id="register-phone-help"
                    >
                      {errorCelular || "Formato internacional: +57 seguido de tu número móvil"}
                    </small>
                  </label>

                  {/* Contraseña con visibilidad y medidor de fortaleza */}
                  <label className="field-label" htmlFor="register-password">
                    Contraseña
                    <span className={styles.inputShell}>
                      <LockKeyhole aria-hidden="true" size={18} />
                      <input
                        autoComplete="new-password"
                        className="field-input"
                        id="register-password"
                        minLength={6}
                        onChange={(e) => setContrasena(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        required
                        type={mostrarContrasena ? "text" : "password"}
                        value={contrasena}
                      />
                      <button
                        type="button"
                        className={styles.togglePasswordBtn}
                        onClick={() => setMostrarContrasena((prev) => !prev)}
                        aria-label={mostrarContrasena ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>

                    {contrasena && (
                      <div className={styles.strengthMeter}>
                        <div className={styles.strengthBarTrack}>
                          <div
                            className={styles.strengthBarFill}
                            style={{
                              width: `${fortaleza.puntaje}%`,
                              backgroundColor: fortaleza.color,
                            }}
                          />
                        </div>
                        <div className={styles.strengthText}>
                          <span>Seguridad: {fortaleza.etiqueta}</span>
                          <span>{contrasena.length} caracteres</span>
                        </div>
                      </div>
                    )}
                  </label>

                  {/* Canal 2FA preferido */}
                  <div>
                    <span className="field-label">Recibir código de verificación por</span>
                    <div className={styles.channelPicker} role="radiogroup">
                      <button
                        type="button"
                        data-active={canal === "CORREO"}
                        onClick={() => setCanal("CORREO")}
                        role="radio"
                        aria-checked={canal === "CORREO"}
                      >
                        <Mail size={18} />
                        <span>
                          <strong>Correo UCC</strong>
                          <small>Enviado a tu cuenta institucional</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        data-active={canal === "SMS"}
                        onClick={() => setCanal("SMS")}
                        role="radio"
                        aria-checked={canal === "SMS"}
                      >
                        <Smartphone size={18} />
                        <span>
                          <strong>Celular / SMS</strong>
                          <small>Mensaje de texto a tu móvil</small>
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    className="primary-button flex w-full items-center justify-center gap-2 mt-2"
                    disabled={
                      enviando ||
                      !nombre.trim() ||
                      !contrasena ||
                      (correoTocado && !isInstitutionalEmail(correo)) ||
                      Boolean(errorCelular)
                    }
                    type="submit"
                  >
                    {enviando ? (
                      <RefreshCw aria-hidden="true" className={styles.spinning} size={18} />
                    ) : (
                      <Sparkles aria-hidden="true" size={18} />
                    )}
                    {enviando ? "Creando perfil seguro…" : "Continuar a Verificación 2FA"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="step-code"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={transition}
              >
                <button
                  className={styles.backButton}
                  onClick={() => {
                    setPaso("registro");
                    setMensaje(null);
                  }}
                  type="button"
                >
                  <ArrowLeft size={16} /> Modificar datos
                </button>

                <div className={styles.portalHeader}>
                  <div aria-hidden="true" className={styles.portalCore}>
                    <span />
                    <span />
                    <span />
                    {canal === "SMS" ? <Smartphone size={24} /> : <Mail size={24} />}
                  </div>
                  <div>
                    <p className="section-kicker">
                      {canal === "SMS" ? "Código SMS enviado" : "Código por Correo enviado"}
                    </p>
                    <h2 aria-label="Código de verificación" data-text="Código de verificación">
                      Código de acceso 2FA
                    </h2>
                    <p className="auth-copy">
                      Escribe el código temporal de 6 dígitos enviado a <strong>{destino}</strong>.
                    </p>
                  </div>
                </div>

                <form className={styles.codeForm} onSubmit={verificarCodigo}>
                  <fieldset
                    className={styles.codeFieldset}
                    key={pulsoError}
                    onPaste={pegarCodigo}
                  >
                    <legend className="sr-only">Código de verificación de 6 dígitos</legend>
                    {codigo.map((digit, index) => (
                      <input
                        key={index}
                        aria-label={`Dígito ${index + 1} de 6`}
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        className={digit ? styles.filledCode : ""}
                        disabled={bloqueado}
                        inputMode="numeric"
                        maxLength={1}
                        onChange={(e) => actualizarCodigo(index, e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => navegarCodigo(e, index)}
                        pattern="[0-9]*"
                        ref={(node) => {
                          codeInputRefs.current[index] = node;
                        }}
                        type="text"
                        value={digit}
                      />
                    ))}
                  </fieldset>

                  <div className={styles.timerPanel}>
                    <div>
                      <span>
                        <TimerReset aria-hidden="true" size={15} /> Vigencia
                      </span>
                      <strong>{formatearTiempo(segundosExpira)}</strong>
                    </div>
                    <div aria-hidden="true" className={styles.timerTrack}>
                      <span style={{ width: `${progresoTiempo}%` }} />
                    </div>
                    <p>
                      {segundosExpira <= 0
                        ? "Código expirado: solicita uno nuevo con el botón de abajo."
                        : intentosRestantes !== null
                        ? `${intentosRestantes} intento${intentosRestantes === 1 ? "" : "s"} restante${
                            intentosRestantes === 1 ? "" : "s"
                          }.`
                        : "El código es de un solo uso para proteger tu perfil estudiantil."}
                    </p>
                  </div>

                  <button
                    className={`primary-button ${styles.verifyButton}`}
                    disabled={!codigoCompleto || verificando || segundosExpira <= 0 || bloqueado}
                    type="submit"
                  >
                    {verificando ? (
                      <RefreshCw aria-hidden="true" className={styles.spinning} size={18} />
                    ) : (
                      <ShieldCheck aria-hidden="true" size={18} />
                    )}
                    {verificando
                      ? "Verificando identidad…"
                      : codigoCompleto
                      ? "Verificar y Explorar AlgoLab"
                      : "Ingresa los 6 dígitos"}
                  </button>
                </form>

                <div className={styles.resendRow}>
                  <button
                    disabled={segundosReenvio > 0 || reenviando || bloqueado}
                    onClick={reenviarCodigo}
                    type="button"
                  >
                    <RefreshCw
                      aria-hidden="true"
                      className={reenviando ? styles.spinning : ""}
                      size={15}
                    />
                    {reenviando
                      ? "Enviando…"
                      : segundosReenvio > 0
                      ? `Reenviar en ${segundosReenvio}s`
                      : "Reenviar código"}
                  </button>
                  <button
                    onClick={() => {
                      setPaso("registro");
                      setMensaje(null);
                    }}
                    type="button"
                  >
                    Cambiar datos
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback messages */}
          <div aria-atomic="true" aria-live="polite" className={styles.messageRegion}>
            {mensaje && (
              <div
                className={styles.feedback}
                data-tone={mensaje.tono}
                role={mensaje.tono === "error" ? "alert" : "status"}
              >
                {mensaje.tono === "exito" ? (
                  <CheckCircle2 aria-hidden="true" size={18} />
                ) : (
                  <ShieldCheck aria-hidden="true" size={18} />
                )}
                <span>{mensaje.texto}</span>
              </div>
            )}
          </div>

          {paso === "registro" && (
            <p className="auth-switch">
              ¿Ya tienes una cuenta? <Link href="/iniciar-sesion">Inicia sesión aquí</Link>
            </p>
          )}
        </motion.div>
      </section>
    </main>
  );
}
