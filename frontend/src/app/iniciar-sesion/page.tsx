"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TimerReset,
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
import {
  institutionalEmailError,
  isInstitutionalEmail,
  normalizeInstitutionalEmail,
} from "@/lib/institutional-email";
import {
  clearAuthSession,
  saveAuthToken,
  saveAuthUser,
  useAuthSession,
  type UsuarioSesion,
} from "@/lib/use-auth-session";

type Paso = "credenciales" | "codigo";
type CanalSegundoFactor = "CORREO" | "SMS";
type TonoMensaje = "error" | "aviso" | "exito" | "info";

type MensajeEstado = {
  texto: string;
  tono: TonoMensaje;
};

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

async function leerJsonSeguro<T>(response: Response): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new Error("El servidor respondió con un formato inesperado. Intenta de nuevo.");
  }
}

function mensajeDeRed(status: number, fallback: string, backendMessage?: string) {
  if (backendMessage) return backendMessage;
  if (status === 429) return "Demasiados intentos. Espera un momento antes de volver a probar.";
  if (status === 503) return "El envío del código está temporalmente fuera de servicio. Tu sesión guardada no se modificó.";
  if (status === 502) return "No logramos conectar con el servicio de AlgoLab. Revisa tu red e intenta otra vez.";
  if (status === 401) return "Los datos no coinciden o el código no es correcto.";
  return fallback;
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

export default function IniciarSesionPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [paso, setPaso] = useState<Paso>("credenciales");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [canal, setCanal] = useState<CanalSegundoFactor>("CORREO");
  const [correoTocado, setCorreoTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensaje, setMensaje] = useState<MensajeEstado | null>(null);
  const [avisoSesion, setAvisoSesion] = useState("");

  const [desafio, setDesafio] = useState<DesafioRespuesta | null>(null);
  const [codigo, setCodigo] = useState<string[]>(EMPTY_CODE);
  const [ahora, setAhora] = useState(() => Date.now());
  const [expiraEn, setExpiraEn] = useState(0);
  const [expiracionTotal, setExpiracionTotal] = useState(1);
  const [reenvioEn, setReenvioEn] = useState(0);
  const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [pulsoError, setPulsoError] = useState(0);

  const errorCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const codigoCompleto = codigo.every(Boolean);
  const segundosExpira = Math.max(0, Math.ceil((expiraEn - ahora) / 1000));
  const segundosReenvio = Math.max(0, Math.ceil((reenvioEn - ahora) / 1000));
  const progresoTiempo = Math.max(0, Math.min(100, (segundosExpira / expiracionTotal) * 100));

  const destino = useMemo(() => {
    if (desafio?.destinoEnmascarado) return desafio.destinoEnmascarado;
    return correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo institucional";
  }, [correo, desafio?.destinoEnmascarado]);

  useEffect(() => {
    if (!hydrated || !existingToken || !usuario) return;

    const controller = new AbortController();
    fetch("/api/me", {
      headers: { Authorization: `Bearer ${existingToken}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) {
          const route = usuario.rol === "ADMINISTRADOR"
            ? "/administrador"
            : usuario.rol === "DOCENTE"
              ? "/docente"
              : "/estudiante";
          router.replace(route);
          return;
        }

        if (response.status === 401) {
          setAvisoSesion("La sesión guardada necesita verificarse otra vez. No la eliminamos automáticamente: puedes reingresar o cambiar de cuenta.");
          return;
        }

        setAvisoSesion("No pudimos comprobar tu sesión por un problema temporal. Tus datos guardados permanecen intactos.");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setAvisoSesion("No hay conexión con AlgoLab. Tu sesión guardada permanece intacta mientras reintentas.");
      });

    return () => controller.abort();
  }, [hydrated, existingToken, usuario, router]);

  useEffect(() => {
    if (paso !== "codigo") return;
    const timer = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [paso]);

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

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCorreoTocado(true);
    const normalizedEmail = normalizeInstitutionalEmail(correo);
    const emailError = institutionalEmailError(normalizedEmail);
    if (emailError) {
      setMensaje({ texto: emailError, tono: "error" });
      emailInputRef.current?.focus();
      return;
    }

    setEnviando(true);
    setMensaje(null);
    try {
      const response = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: normalizedEmail, contrasena, canal }),
      });
      const data = await leerJsonSeguro<DesafioRespuesta>(response);

      if (!response.ok || !data.requiereSegundoFactor || !data.desafioId) {
        setMensaje({
          texto: mensajeDeRed(response.status, "No fue posible validar tus credenciales.", data.mensaje),
          tono: response.status === 429 || response.status >= 500 ? "aviso" : "error",
        });
        return;
      }

      setCorreo(normalizedEmail);
      setContrasena("");
      activarDesafio(data);
      setMensaje({
        texto: data.mensaje ?? "Código institucional enviado. Completa el segundo factor para abrir tu portal.",
        tono: "exito",
      });
    } catch (error) {
      setMensaje({
        texto: error instanceof Error ? error.message : "No se pudo conectar con AlgoLab. Tu sesión guardada no cambió.",
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
    if (!desafio?.desafioId || !codigoCompleto || bloqueado) return;

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
        body: JSON.stringify({ desafioId: desafio.desafioId, codigo: codigo.join("") }),
      });
      const data = await leerJsonSeguro<LoginRespuesta>(response);

      if (!response.ok || !data.token || !data.usuario) {
        const backendMessage = data.mensaje ?? "No fue posible verificar el código.";
        const remaining = extraerNumero(backendMessage, /intentos restantes:\s*(\d+)/i);
        if (remaining !== null) setIntentosRestantes(remaining);
        if (response.status === 429) setBloqueado(true);
        if (response.status === 410) setExpiraEn(Date.now());
        setCodigo([...EMPTY_CODE]);
        setPulsoError((value) => value + 1);
        window.requestAnimationFrame(() => codeInputRefs.current[0]?.focus());
        setMensaje({
          texto: mensajeDeRed(response.status, "No fue posible verificar el código.", backendMessage),
          tono: response.status === 401 ? "error" : "aviso",
        });
        return;
      }

      saveAuthToken(data.token);
      saveAuthUser(data.usuario);
      setMensaje({ texto: "Identidad confirmada. Abriendo tu espacio de realidad mixta…", tono: "exito" });
      const route = data.usuario.rol === "ADMINISTRADOR"
        ? "/administrador"
        : data.usuario.rol === "DOCENTE"
          ? "/docente"
          : "/estudiante";
      router.replace(route);
    } catch (error) {
      setMensaje({
        texto: error instanceof Error ? error.message : "La red se interrumpió. El desafío y tu sesión guardada siguen intactos.",
        tono: "aviso",
      });
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
      const data = await leerJsonSeguro<DesafioRespuesta>(response);

      if (!response.ok || !data.desafioId) {
        const backendMessage = data.mensaje ?? "No se pudo reenviar el código.";
        if (response.status === 429) {
          const wait = extraerNumero(backendMessage, /en\s+(\d+)\s+segundos/i);
          if (wait !== null) setReenvioEn(Date.now() + wait * 1000);
        }
        setMensaje({
          texto: mensajeDeRed(response.status, "No se pudo reenviar el código.", backendMessage),
          tono: response.status >= 500 || response.status === 429 ? "aviso" : "error",
        });
        return;
      }

      activarDesafio(data);
      setMensaje({ texto: data.mensaje ?? "Nuevo código enviado.", tono: "exito" });
    } catch (error) {
      setMensaje({
        texto: error instanceof Error ? error.message : "No se pudo reenviar. Conservamos el desafío actual.",
        tono: "aviso",
      });
    } finally {
      setReenviando(false);
    }
  }

  function volverACredenciales(clearEmail = false) {
    setPaso("credenciales");
    setDesafio(null);
    setCodigo([...EMPTY_CODE]);
    setContrasena("");
    setBloqueado(false);
    setIntentosRestantes(null);
    setMensaje(null);
    if (clearEmail) {
      setCorreo("");
      setCorreoTocado(false);
    }
    window.requestAnimationFrame(() => emailInputRef.current?.focus());
  }

  function usarOtraCuentaGuardada() {
    clearAuthSession();
    setAvisoSesion("");
    volverACredenciales(true);
  }

  const motionTransition = reduceMotion ? { duration: 0 } : { duration: 0.42, ease: "easeOut" as const };

  return (
    <main className="auth-shell min-h-screen">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">A</span>
        <strong>AlgoLab</strong>
      </Link>

      <section className="auth-layout">
        <div className="auth-story">
          <p className="section-kicker">Identidad MR protegida</p>
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
              initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
              key={paso}
              transition={motionTransition}
            >
              <h1>{paso === "codigo" ? "Abre el portal de tu identidad." : "Tu progreso sigue donde lo dejaste."}</h1>
              <p>
                {paso === "codigo"
                  ? "Un segundo factor enlaza tu cuenta institucional con el laboratorio web y las gafas, sin entregar acceso antes de comprobar que eres tú."
                  : "Consulta tus niveles, descubre el análisis del mentor IA y mantén tu perfil sincronizado con la experiencia de las gafas."}
              </p>
              <div className="auth-code">
                <span>{paso === "codigo" ? "seguridad" : "progreso"}</span>
                <strong>{paso === "codigo" ? ".confirmarIdentidad();" : ".continuar();"}</strong>
                <small>{paso === "codigo" ? "// desafío temporal · JWT después de verificar" : "// evidencia + retroalimentación"}</small>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className={`auth-card ${styles.securityCard}`}>
          <div aria-hidden="true" className={styles.cardCircuit} />
          <div className={styles.stepRail}>
            <span className={paso === "credenciales" ? styles.activeStep : styles.completedStep}>
              {paso === "codigo" ? <CheckCircle2 size={14} /> : <LockKeyhole size={14} />} Credenciales
            </span>
            <i aria-hidden="true" />
            <span className={paso === "codigo" ? styles.activeStep : ""}>
              <KeyRound size={14} /> Código 2FA
            </span>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {paso === "credenciales" ? (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.975 }}
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.975 }}
                key="credentials"
                transition={motionTransition}
              >
                <p className="section-kicker">Acceso institucional</p>
                <h2>Iniciar sesión</h2>
                <p className="auth-copy">Primero validamos tus credenciales UCC. Después recibirás un código temporal de seis dígitos.</p>

                {avisoSesion ? (
                  <div className={styles.savedSessionNotice} role="status">
                    <ShieldCheck aria-hidden="true" size={19} />
                    <div>
                      <strong>Sesión local protegida</strong>
                      <p>{avisoSesion}</p>
                      <button onClick={usarOtraCuentaGuardada} type="button">Cambiar de cuenta</button>
                    </div>
                  </div>
                ) : null}

                <form className="mt-7 space-y-5" onSubmit={iniciarSesion}>
                  <label className="field-label" htmlFor="institutional-email">
                    Correo institucional
                    <span className={styles.inputShell}>
                      <Mail aria-hidden="true" size={18} />
                      <input
                        aria-describedby="institutional-email-help"
                        aria-invalid={Boolean(errorCorreo)}
                        autoCapitalize="none"
                        autoComplete="email"
                        className="field-input"
                        id="institutional-email"
                        onBlur={() => setCorreoTocado(true)}
                        onChange={(event) => {
                          setCorreo(event.target.value);
                          if (correoTocado) setMensaje(null);
                        }}
                        placeholder="nombre.apellido@campusucc.edu.co"
                        ref={emailInputRef}
                        required
                        spellCheck={false}
                        type="email"
                        value={correo}
                      />
                    </span>
                    <small className={errorCorreo ? styles.fieldError : styles.fieldHelp} id="institutional-email-help">
                      {errorCorreo || "Acceso exclusivo para cuentas @campusucc.edu.co"}
                    </small>
                  </label>

                  <label className="field-label" htmlFor="password">
                    Contraseña
                    <span className={styles.inputShell}>
                      <LockKeyhole aria-hidden="true" size={18} />
                      <input
                        autoComplete="current-password"
                        className="field-input"
                        id="password"
                        minLength={6}
                        onChange={(event) => setContrasena(event.target.value)}
                        placeholder="••••••••"
                        required
                        type="password"
                        value={contrasena}
                      />
                    </span>
                  </label>

                  <div>
                    <span className="field-label" id="second-factor-channel-label">Recibir código por</span>
                    <div
                      aria-labelledby="second-factor-channel-label"
                      className={styles.channelPicker}
                      role="radiogroup"
                    >
                      <button
                        aria-checked={canal === "CORREO"}
                        data-active={canal === "CORREO"}
                        onClick={() => setCanal("CORREO")}
                        role="radio"
                        type="button"
                      >
                        <Mail aria-hidden="true" size={18} />
                        <span>
                          <strong>Correo UCC</strong>
                          <small>Disponible con tu cuenta institucional</small>
                        </span>
                      </button>
                      <button
                        aria-checked={canal === "SMS"}
                        data-active={canal === "SMS"}
                        onClick={() => setCanal("SMS")}
                        role="radio"
                        type="button"
                      >
                        <Smartphone aria-hidden="true" size={18} />
                        <span>
                          <strong>Celular</strong>
                          <small>SMS real; requiere un número registrado</small>
                        </span>
                      </button>
                    </div>
                  </div>

                  <button
                    className="primary-button flex w-full items-center justify-center gap-2"
                    disabled={enviando || !contrasena || (correoTocado && !isInstitutionalEmail(correo))}
                    type="submit"
                  >
                    {enviando ? <RefreshCw aria-hidden="true" className={styles.spinning} size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
                    {enviando ? "Creando desafío seguro…" : "Continuar con verificación"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1, rotateX: 0, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                initial={{ opacity: 0, rotateX: reduceMotion ? 0 : -5, y: reduceMotion ? 0 : 14 }}
                key="code"
                transition={motionTransition}
              >
                <button className={styles.backButton} onClick={() => volverACredenciales(false)} type="button">
                  <ArrowLeft aria-hidden="true" size={16} /> Volver
                </button>

                <div className={styles.portalHeader}>
                  <div aria-hidden="true" className={styles.portalCore}>
                    <span /><span /><span />
                    {desafio?.canal === "SMS" ? <Smartphone size={24} /> : <Mail size={24} />}
                  </div>
                  <div>
                    <p className="section-kicker">
                      {desafio?.canal === "SMS" ? "SMS verificado en tránsito" : "Correo institucional confirmado"}
                    </p>
                    <h2 aria-label="Código de acceso" data-text="Código de acceso">Código de acceso</h2>
                    <p className="auth-copy">Escribe el código enviado a <strong>{destino}</strong>.</p>
                  </div>
                </div>

                <form className={styles.codeForm} onSubmit={verificarCodigo}>
                  <fieldset
                    className={styles.codeFieldset}
                    key={pulsoError}
                    onPaste={pegarCodigo}
                  >
                    <legend className="sr-only">Código de verificación de seis dígitos</legend>
                    {codigo.map((digit, index) => (
                      <input
                        aria-label={`Dígito ${index + 1} de 6`}
                        autoComplete={index === 0 ? "one-time-code" : "off"}
                        className={digit ? styles.filledCode : ""}
                        disabled={bloqueado}
                        inputMode="numeric"
                        key={index}
                        maxLength={1}
                        onChange={(event) => actualizarCodigo(index, event.target.value)}
                        onFocus={(event) => event.currentTarget.select()}
                        onKeyDown={(event) => navegarCodigo(event, index)}
                        pattern="[0-9]*"
                        ref={(node) => { codeInputRefs.current[index] = node; }}
                        type="text"
                        value={digit}
                      />
                    ))}
                  </fieldset>

                  <div className={styles.timerPanel}>
                    <div>
                      <span><TimerReset aria-hidden="true" size={15} /> Vigencia</span>
                      <strong>{formatearTiempo(segundosExpira)}</strong>
                    </div>
                    <div aria-hidden="true" className={styles.timerTrack}>
                      <span style={{ width: `${progresoTiempo}%` }} />
                    </div>
                    <p>
                      {segundosExpira <= 0
                        ? "Código expirado: solicita uno nuevo."
                        : intentosRestantes !== null
                          ? `${intentosRestantes} intento${intentosRestantes === 1 ? "" : "s"} restante${intentosRestantes === 1 ? "" : "s"}.`
                          : "El código es de un solo uso y nunca crea sesión antes de validarse."}
                    </p>
                  </div>

                  <button
                    className={`primary-button ${styles.verifyButton}`}
                    disabled={!codigoCompleto || verificando || segundosExpira <= 0 || bloqueado}
                    type="submit"
                  >
                    {verificando ? <RefreshCw aria-hidden="true" className={styles.spinning} size={18} /> : <Sparkles aria-hidden="true" size={18} />}
                    {verificando ? "Sincronizando identidad…" : codigoCompleto ? "Abrir portal AlgoLab" : "Completa los 6 dígitos"}
                  </button>
                </form>

                <div className={styles.resendRow}>
                  <button
                    disabled={segundosReenvio > 0 || reenviando || bloqueado}
                    onClick={reenviarCodigo}
                    type="button"
                  >
                    <RefreshCw aria-hidden="true" className={reenviando ? styles.spinning : ""} size={15} />
                    {reenviando
                      ? "Enviando…"
                      : segundosReenvio > 0
                        ? `Reenviar en ${segundosReenvio}s`
                        : "Reenviar código"}
                  </button>
                  <button onClick={() => volverACredenciales(true)} type="button">Cambiar cuenta</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div aria-atomic="true" aria-live="polite" className={styles.messageRegion}>
            {mensaje ? (
              <div className={styles.feedback} data-tone={mensaje.tono} role={mensaje.tono === "error" ? "alert" : "status"}>
                {mensaje.tono === "exito" ? <CheckCircle2 aria-hidden="true" size={18} /> : <ShieldCheck aria-hidden="true" size={18} />}
                <span>{mensaje.texto}</span>
              </div>
            ) : null}
          </div>

          {paso === "credenciales" ? (
            <p className="auth-switch">
              ¿Aún no tienes cuenta? <Link href="/registrarse">Crea tu perfil institucional</Link>
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
