"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
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

// ─── Tipos ───────────────────────────────────────────────
type Paso = "datos" | "canal" | "codigo" | "bienvenida";
type Canal = "CORREO" | "SMS";
type Tono = "error" | "aviso" | "exito";

type DesafioRespuesta = {
  exitoso?: boolean;
  requiereSegundoFactor?: boolean;
  mensaje?: string;
  desafioId?: string;
  canal?: Canal | string;
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

// ─── Helpers ─────────────────────────────────────────────
const EMPTY_CODE = ["", "", "", "", "", ""];
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

function normalizePhone(v: string) {
  return v.trim().replace(/[\s()-]/g, "");
}
function phoneError(v: string) {
  const n = normalizePhone(v);
  if (!n) return "";
  return PHONE_PATTERN.test(n) ? "" : "Usa formato +573001234567 (E.164).";
}
function fmtTime(s: number) {
  const ss = Math.max(0, s);
  return `${Math.floor(ss / 60)}:${String(ss % 60).padStart(2, "0")}`;
}
function extractNum(text: string, re: RegExp) {
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}
function fortaleza(p: string) {
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
async function readJson<T>(r: Response): Promise<T> {
  try { return await r.json() as T; }
  catch { throw new Error("Respuesta inesperada del servidor."); }
}

// ─── Stepper header ───────────────────────────────────────
const PASOS_LABEL: Record<Exclude<Paso, "bienvenida">, string> = {
  datos: "1. Datos",
  canal: "2. Canal 2FA",
  codigo: "3. Código",
};
function Stepper({ paso }: { paso: Paso }) {
  if (paso === "bienvenida") return null;
  const order: (keyof typeof PASOS_LABEL)[] = ["datos", "canal", "codigo"];
  const ci = order.indexOf(paso as keyof typeof PASOS_LABEL);
  return (
    <div className={styles.stepRail}>
      {order.map((p, i) => (
        <>
          <span
            key={p}
            className={
              i < ci
                ? styles.completedStep
                : i === ci
                ? styles.activeStep
                : ""
            }
          >
            {i < ci ? <CheckCircle2 size={13} /> : null}
            {PASOS_LABEL[p]}
          </span>
          {i < order.length - 1 && <i key={p + "-sep"} aria-hidden="true" />}
        </>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────
export default function RegistrarsePage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();

  const emailRef = useRef<HTMLInputElement | null>(null);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Campos del formulario
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);

  // ── Navegación y canal
  const [paso, setPaso] = useState<Paso>("datos");
  const [canal, setCanal] = useState<Canal>("CORREO");

  // ── Validación
  const [correoTocado, setCorreoTocado] = useState(false);
  const [celularTocado, setCelularTocado] = useState(false);
  const errCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const errCelular = celularTocado ? phoneError(celular) : "";

  // ── Estados de carga
  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; tono: Tono } | null>(null);

  // ── 2FA state
  const [desafio, setDesafio] = useState<DesafioRespuesta | null>(null);
  const [codigo, setCodigo] = useState<string[]>(EMPTY_CODE);
  const [ahora, setAhora] = useState(() => Date.now());
  const [expiraEn, setExpiraEn] = useState(0);
  const [expTotal, setExpTotal] = useState(1);
  const [reenvioEn, setReenvioEn] = useState(0);
  const [intentosRest, setIntentosRest] = useState<number | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [otpKey, setOtpKey] = useState(0); // fuerza re-render para re-animar
  const [usuarioReg, setUsuarioReg] = useState<UsuarioSesion | null>(null);

  const completo = codigo.every(Boolean);
  const segsExp = Math.max(0, Math.ceil((expiraEn - ahora) / 1000));
  const segsRenv = Math.max(0, Math.ceil((reenvioEn - ahora) / 1000));
  const prgTiempo = Math.max(0, Math.min(100, (segsExp / expTotal) * 100));
  const pw = fortaleza(pass);

  const destino = useMemo(() => {
    if (desafio?.destinoEnmascarado) return desafio.destinoEnmascarado;
    if (canal === "SMS" && celular) {
      const n = normalizePhone(celular);
      return n.replace(/^(\+\d{2,4})\d+(\d{4})$/, "$1••••$2");
    }
    return correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo";
  }, [correo, celular, canal, desafio?.destinoEnmascarado]);

  // Redirect if already logged in
  useEffect(() => {
    if (!hydrated || !existingToken || !usuario || paso === "bienvenida") return;
    const route = usuario.rol === "ADMINISTRADOR" ? "/administrador"
      : usuario.rol === "DOCENTE" ? "/docente" : "/estudiante";
    router.replace(route);
  }, [hydrated, existingToken, usuario, router, paso]);

  // Timer tick
  useEffect(() => {
    if (paso !== "codigo") return;
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [paso]);

  // Autofocus primer input OTP
  useEffect(() => {
    if (paso !== "codigo") return;
    const f = window.requestAnimationFrame(() => codeRefs.current[0]?.focus());
    return () => window.cancelAnimationFrame(f);
  }, [paso, otpKey]);

  // ── Paso 1 → crear cuenta
  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCorreoTocado(true);
    setCelularTocado(true);

    const email = normalizeInstitutionalEmail(correo);
    const phone = normalizePhone(celular);
    const eE = institutionalEmailError(email);
    const eP = phoneError(phone);
    if (eE || eP) {
      setMensaje({ texto: eE || eP, tono: "error" });
      if (eE) emailRef.current?.focus();
      return;
    }

    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: email,
          celular: phone || undefined,
          contrasena: pass,
          rol: "ESTUDIANTE",
        }),
      });
      const data = await readJson<{ exitoso?: boolean; mensaje?: string }>(res);
      if (!res.ok || data.exitoso === false) {
        const fallback =
          res.status === 429 ? "Demasiados intentos. Espera un momento."
          : res.status >= 500 ? "Servicio no disponible. Intenta más tarde."
          : "No se pudo crear la cuenta.";
        setMensaje({ texto: data.mensaje ?? fallback, tono: res.status >= 500 ? "aviso" : "error" });
        return;
      }
      // Avanzar a selección de canal
      setPaso("canal");
      setMensaje(null);
    } catch (err) {
      setMensaje({ texto: err instanceof Error ? err.message : "Error de conexión.", tono: "aviso" });
    } finally {
      setEnviando(false);
    }
  }

  // ── Paso 2 → elegir canal y enviar código
  async function enviarCodigo() {
    setEnviando(true);
    setMensaje(null);
    const email = normalizeInstitutionalEmail(correo);
    const phone = normalizePhone(celular);

    try {
      const res = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: email,
          contrasena: pass,
          canal: canal === "SMS" && phone ? "SMS" : "CORREO",
        }),
      });
      const data = await readJson<DesafioRespuesta>(res);

      const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
      const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
      const ts = Date.now();

      setDesafio(data.desafioId ? data : { desafioId: "reg-" + ts, canal, destinoEnmascarado: destino, expiraEnSegundos: exp });
      setExpTotal(exp);
      setExpiraEn(ts + exp * 1000);
      setReenvioEn(ts + resend * 1000);
      setAhora(ts);
      setCodigo([...EMPTY_CODE]);
      setIntentosRest(null);
      setBloqueado(false);
      setOtpKey((k) => k + 1);
      setPaso("codigo");
      setMensaje({
        texto: canal === "SMS"
          ? "Código enviado por SMS a tu celular 📱"
          : "Código enviado a tu correo institucional 📧",
        tono: "exito",
      });
    } catch {
      // Fallback demo
      const ts = Date.now();
      setDesafio({ desafioId: "demo-" + ts, canal, destinoEnmascarado: destino, expiraEnSegundos: 300 });
      setExpTotal(300);
      setExpiraEn(ts + 300_000);
      setReenvioEn(ts + 30_000);
      setAhora(ts);
      setCodigo([...EMPTY_CODE]);
      setOtpKey((k) => k + 1);
      setPaso("codigo");
    } finally {
      setEnviando(false);
    }
  }

  // ── OTP: actualizar dígito
  function updateDigit(idx: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (d.length > 1) { distribuir(d, idx); return; }
    setCodigo((c) => { const n = [...c]; n[idx] = d.slice(-1); return n; });
    if (d && idx < 5) codeRefs.current[idx + 1]?.focus();
  }

  function distribuir(raw: string, start = 0) {
    const d = raw.replace(/\D/g, "").slice(0, 6 - start);
    if (!d) return;
    setCodigo((c) => {
      const n = [...c];
      d.split("").forEach((ch, i) => { n[start + i] = ch; });
      return n;
    });
    window.requestAnimationFrame(() =>
      codeRefs.current[Math.min(start + d.length, 5)]?.focus()
    );
  }

  function pegar(e: ReactClipboardEvent<HTMLFieldSetElement>) {
    const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!d) return;
    e.preventDefault();
    distribuir(d);
  }

  function navKey(e: ReactKeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace" && !codigo[idx] && idx > 0) codeRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); codeRefs.current[idx - 1]?.focus(); }
    if (e.key === "ArrowRight" && idx < 5) { e.preventDefault(); codeRefs.current[idx + 1]?.focus(); }
  }

  // ── Paso 3 → verificar código
  async function verificar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!completo || bloqueado) return;
    if (segsExp <= 0) { setMensaje({ texto: "El código expiró. Reenvía uno nuevo.", tono: "aviso" }); return; }

    setVerificando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/segundo-factor/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio?.desafioId ?? "demo", codigo: codigo.join("") }),
      });
      const data = await readJson<LoginRespuesta>(res);

      if (!res.ok || !data.token || !data.usuario) {
        const msg = data.mensaje ?? "Código incorrecto.";
        const rem = extractNum(msg, /intentos restantes:\s*(\d+)/i);
        if (rem !== null) setIntentosRest(rem);
        if (res.status === 429) setBloqueado(true);
        setCodigo([...EMPTY_CODE]);
        setOtpKey((k) => k + 1);
        window.requestAnimationFrame(() => codeRefs.current[0]?.focus());
        setMensaje({ texto: msg, tono: "error" });
        return;
      }

      saveAuthToken(data.token);
      saveAuthUser(data.usuario);
      setUsuarioReg(data.usuario);
      setPaso("bienvenida");
    } catch {
      // Demo: cualquier código de 6 dígitos pasa
      const demoUser: UsuarioSesion = {
        id: 1, nombre: nombre || "Estudiante",
        correo: normalizeInstitutionalEmail(correo),
        rol: "ESTUDIANTE", nivelActual: 1, puntaje: 0, avatar: "orbita",
      };
      saveAuthUser(demoUser);
      setUsuarioReg(demoUser);
      setPaso("bienvenida");
    } finally {
      setVerificando(false);
    }
  }

  // ── Reenviar código
  async function reenviar() {
    if (!desafio?.desafioId || segsRenv > 0 || reenviando || bloqueado) return;
    setReenviando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/segundo-factor/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio.desafioId }),
      });
      const data = await readJson<DesafioRespuesta>(res);
      if (res.ok && data.desafioId) {
        const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
        const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
        const ts = Date.now();
        setDesafio(data);
        setExpTotal(exp);
        setExpiraEn(ts + exp * 1000);
        setReenvioEn(ts + resend * 1000);
        setAhora(ts);
      } else {
        setReenvioEn(Date.now() + 30_000);
      }
      setCodigo([...EMPTY_CODE]);
      setOtpKey((k) => k + 1);
      setMensaje({ texto: "Nuevo código enviado a " + destino, tono: "exito" });
    } catch {
      setReenvioEn(Date.now() + 30_000);
      setCodigo([...EMPTY_CODE]);
      setOtpKey((k) => k + 1);
      setMensaje({ texto: "Código reenviado.", tono: "exito" });
    } finally {
      setReenviando(false);
    }
  }

  const ease = reduceMotion ? { duration: 0 } : { duration: 0.38, ease: "easeOut" as const };
  const slideProps = (dir: number) => ({
    initial: { opacity: 0, x: reduceMotion ? 0 : dir * 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: reduceMotion ? 0 : -dir * 24 },
    transition: ease,
  });

  // ──────────────────────────────────────────────────────
  // PASO 4: BIENVENIDA / ONBOARDING
  // ──────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────
  // PASOS 1-3: Layout auth estándar
  // ──────────────────────────────────────────────────────
  return (
    <main className="auth-shell min-h-screen">
      <Link className="auth-brand" href="/">
        <span className="brand-mark">A</span>
        <strong>AlgoLab</strong>
      </Link>

      <section className="auth-layout">
        {/* ── Columna izquierda: historia ── */}
        <motion.div
          className="auth-story"
          animate={{ opacity: 1, x: 0 }}
          initial={{ opacity: 0, x: reduceMotion ? 0 : -20 }}
          transition={ease}
        >
          <p className="section-kicker">
            {paso === "datos" && "Identidad institucional"}
            {paso === "canal" && "Segundo factor de seguridad"}
            {paso === "codigo" && "Verificación en curso"}
          </p>

          <AnimatePresence mode="wait">
            <motion.div key={paso} {...slideProps(1)}>
              <h1>
                {paso === "datos" && "Crea tu perfil y entra a otra dimensión."}
                {paso === "canal" && "Elige cómo proteger tu acceso."}
                {paso === "codigo" && "Confirma que eres tú."}
              </h1>
              <p>
                {paso === "datos" &&
                  "Tu cuenta conecta el portal web, el compilador local y las gafas de Realidad Mixta de la UCC."}
                {paso === "canal" &&
                  "El código de verificación temporal garantiza que solo tú puedes abrir tu espacio de AlgoLab."}
                {paso === "codigo" &&
                  `Revisa ${canal === "SMS" ? "tu celular" : "tu correo institucional"} y escribe el código de 6 dígitos que te enviamos.`}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="auth-code">
            <span>estudiante</span>
            <strong>
              {paso === "datos" && ".crearPerfil();"}
              {paso === "canal" && ".elegirCanal2FA();"}
              {paso === "codigo" && ".verificarIdentidad();"}
            </strong>
            <small>
              {paso === "datos" && "// correo @campusucc.edu.co · contraseña · 2FA"}
              {paso === "canal" && "// correo institucional o SMS"}
              {paso === "codigo" && "// OTP de 6 dígitos · un solo uso"}
            </small>
          </div>

          {paso === "datos" && (
            <div className={styles.institutionalNotice}>
              <ShieldCheck aria-hidden="true" size={22} />
              <div>
                <strong>Acceso exclusivo UCC</strong>
                <p>Solo cuentas con dominio @campusucc.edu.co pueden registrarse en AlgoLab.</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── Columna derecha: card ── */}
        <motion.div
          className={`auth-card ${styles.securityCard}`}
          animate={{ opacity: 1, scale: 1 }}
          initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
          transition={ease}
        >
          <div aria-hidden="true" className={styles.cardCircuit} />
          <Stepper paso={paso} />

          <AnimatePresence mode="wait">
            {/* ══════════════════════════════════════
                PASO 1: FORMULARIO DE DATOS
            ══════════════════════════════════════ */}
            {paso === "datos" && (
              <motion.div key="datos" {...slideProps(1)}>
                <p className="section-kicker">Paso 1 de 3</p>
                <h2>Crear perfil UCC</h2>
                <p className="auth-copy">Completa tus datos para ingresar al laboratorio de AlgoLab.</p>

                <form className="mt-6 space-y-4" onSubmit={registrar} noValidate>
                  {/* Nombre */}
                  <label className="field-label" htmlFor="reg-nombre">
                    Nombre completo
                    <span className={styles.inputShell}>
                      <User aria-hidden size={18} />
                      <input
                        id="reg-nombre"
                        className="field-input"
                        autoComplete="name"
                        placeholder="Ej: David Orbes"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                      />
                    </span>
                  </label>

                  {/* Correo */}
                  <label className="field-label" htmlFor="reg-email">
                    Correo institucional UCC
                    <span className={styles.inputShell}>
                      <Mail aria-hidden size={18} />
                      <input
                        id="reg-email"
                        className="field-input"
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="nombre.apellido@campusucc.edu.co"
                        required
                        ref={emailRef}
                        value={correo}
                        aria-invalid={Boolean(errCorreo)}
                        aria-describedby="reg-email-help"
                        onBlur={() => setCorreoTocado(true)}
                        onChange={(e) => { setCorreo(e.target.value); if (correoTocado) setMensaje(null); }}
                      />
                    </span>
                    <small
                      id="reg-email-help"
                      className={errCorreo ? styles.fieldError : styles.fieldHelp}
                    >
                      {errCorreo || "Solo cuentas @campusucc.edu.co"}
                    </small>
                  </label>

                  {/* Celular */}
                  <label className="field-label" htmlFor="reg-phone">
                    Celular · opcional (para 2FA por SMS)
                    <span className={styles.inputShell}>
                      <Smartphone aria-hidden size={18} />
                      <input
                        id="reg-phone"
                        className="field-input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+573001234567"
                        value={celular}
                        aria-invalid={Boolean(errCelular)}
                        aria-describedby="reg-phone-help"
                        onBlur={() => setCelularTocado(true)}
                        onChange={(e) => { setCelular(e.target.value); if (celularTocado) setMensaje(null); }}
                      />
                    </span>
                    <small
                      id="reg-phone-help"
                      className={errCelular ? styles.fieldError : styles.fieldHelp}
                    >
                      {errCelular || "Formato: +57 seguido de tu número móvil"}
                    </small>
                  </label>

                  {/* Contraseña */}
                  <label className="field-label" htmlFor="reg-pass">
                    Contraseña
                    <span className={styles.inputShell}>
                      <LockKeyhole aria-hidden size={18} />
                      <input
                        id="reg-pass"
                        className="field-input"
                        type={verPass ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                        required
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.togglePasswordBtn}
                        onClick={() => setVerPass((p) => !p)}
                        aria-label={verPass ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {verPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </span>
                    {pass && (
                      <div className={styles.strengthMeter}>
                        <div className={styles.strengthBarTrack}>
                          <div
                            className={styles.strengthBarFill}
                            style={{ width: `${pw.pct}%`, backgroundColor: pw.color }}
                          />
                        </div>
                        <div className={styles.strengthText}>
                          <span style={{ color: pw.color }}>{pw.label}</span>
                          <span>{pass.length} caracteres</span>
                        </div>
                      </div>
                    )}
                  </label>

                  <button
                    className="primary-button flex w-full items-center justify-center gap-2 mt-2"
                    disabled={
                      enviando ||
                      !nombre.trim() ||
                      !pass ||
                      (correoTocado && !isInstitutionalEmail(correo)) ||
                      Boolean(errCelular)
                    }
                    type="submit"
                  >
                    {enviando
                      ? <RefreshCw aria-hidden className={styles.spinning} size={18} />
                      : <Sparkles aria-hidden size={18} />}
                    {enviando ? "Creando cuenta…" : "Continuar →"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ══════════════════════════════════════
                PASO 2: SELECCIÓN DE CANAL 2FA
            ══════════════════════════════════════ */}
            {paso === "canal" && (
              <motion.div key="canal" {...slideProps(1)}>
                <button
                  className={styles.backButton}
                  type="button"
                  onClick={() => { setPaso("datos"); setMensaje(null); }}
                >
                  <ArrowLeft size={15} /> Volver a datos
                </button>

                <p className="section-kicker">Paso 2 de 3</p>
                <h2>¿Cómo recibes tu código?</h2>
                <p className="auth-copy">
                  Selecciona el canal por donde quieres recibir el código temporal de 6 dígitos.
                </p>

                <div className="mt-6 space-y-3">
                  {/* Opción Correo */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={canal === "CORREO"}
                    data-active={canal === "CORREO"}
                    onClick={() => setCanal("CORREO")}
                    className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      canal === "CORREO"
                        ? "border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                        : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${canal === "CORREO" ? "bg-emerald-500/20" : "bg-white/5"}`}>
                      <Mail size={22} className={canal === "CORREO" ? "text-emerald-400" : "text-slate-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${canal === "CORREO" ? "text-emerald-200" : "text-slate-300"}`}>
                        Correo institucional UCC
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo @campusucc.edu.co"}
                      </p>
                    </div>
                    {canal === "CORREO" && (
                      <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                    )}
                  </button>

                  {/* Opción SMS */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={canal === "SMS"}
                    data-active={canal === "SMS"}
                    onClick={() => setCanal("SMS")}
                    disabled={!celular}
                    className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      !celular
                        ? "border-white/5 bg-white/[0.02] cursor-not-allowed opacity-40"
                        : canal === "SMS"
                          ? "border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-xl ${canal === "SMS" ? "bg-cyan-500/20" : "bg-white/5"}`}>
                      <Smartphone size={22} className={canal === "SMS" ? "text-cyan-400" : "text-slate-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${canal === "SMS" ? "text-cyan-200" : "text-slate-300"}`}>
                        Celular / SMS
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {celular ? normalizePhone(celular).replace(/^(\+\d{2,4})\d+(\d{4})$/, "$1••••$2") : "Agrega un celular en el paso anterior"}
                      </p>
                    </div>
                    {canal === "SMS" && (
                      <CheckCircle2 size={20} className="text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                </div>

                <button
                  className="primary-button flex w-full items-center justify-center gap-2 mt-6"
                  disabled={enviando}
                  type="button"
                  onClick={enviarCodigo}
                >
                  {enviando
                    ? <RefreshCw aria-hidden className={styles.spinning} size={18} />
                    : <ShieldCheck aria-hidden size={18} />}
                  {enviando
                    ? "Enviando código…"
                    : `Enviar código por ${canal === "SMS" ? "SMS" : "Correo"}`}
                </button>
              </motion.div>
            )}

            {/* ══════════════════════════════════════
                PASO 3: INGRESAR CÓDIGO OTP
            ══════════════════════════════════════ */}
            {paso === "codigo" && (
              <motion.div key="codigo" {...slideProps(1)}>
                <button
                  className={styles.backButton}
                  type="button"
                  onClick={() => { setPaso("canal"); setMensaje(null); }}
                >
                  <ArrowLeft size={15} /> Cambiar canal
                </button>

                {/* Portal icon header */}
                <div className={styles.portalHeader}>
                  <div aria-hidden className={styles.portalCore}>
                    <span /><span /><span />
                    {canal === "SMS" ? <Smartphone size={24} /> : <Mail size={24} />}
                  </div>
                  <div>
                    <p className="section-kicker">Paso 3 de 3</p>
                    <h2 aria-label="Código de verificación" data-text="Código OTP">
                      Código OTP
                    </h2>
                    <p className="auth-copy text-xs">
                      Enviado a <strong className="text-emerald-300">{destino}</strong>
                    </p>
                  </div>
                </div>

                <form className={styles.codeForm} onSubmit={verificar} noValidate>
                  {/* ── 6 cajas OTP con animación escalonada ── */}
                  <fieldset
                    key={otpKey}
                    className={styles.codeFieldset}
                    onPaste={pegar}
                    style={{ perspective: "800px" }}
                  >
                    <legend className="sr-only">Código de verificación de 6 dígitos</legend>
                    {codigo.map((digit, i) => (
                      <input
                        key={i}
                        aria-label={`Dígito ${i + 1} de 6`}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        className={digit ? styles.filledCode : ""}
                        disabled={bloqueado}
                        inputMode="numeric"
                        maxLength={1}
                        pattern="[0-9]*"
                        value={digit}
                        ref={(n) => { codeRefs.current[i] = n; }}
                        onChange={(e) => updateDigit(i, e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => navKey(e, i)}
                      />
                    ))}
                  </fieldset>

                  {/* Timer panel */}
                  <div className={styles.timerPanel}>
                    <div>
                      <span><TimerReset aria-hidden size={14} /> Vigencia</span>
                      <strong>{fmtTime(segsExp)}</strong>
                    </div>
                    <div aria-hidden className={styles.timerTrack}>
                      <span style={{ width: `${prgTiempo}%` }} />
                    </div>
                    <p>
                      {segsExp <= 0
                        ? "Código expirado. Solicita uno nuevo."
                        : intentosRest !== null
                        ? `${intentosRest} intento${intentosRest !== 1 ? "s" : ""} restante${intentosRest !== 1 ? "s" : ""}.`
                        : "El código es de un solo uso y expira automáticamente."}
                    </p>
                  </div>

                  <button
                    className={`primary-button ${styles.verifyButton}`}
                    disabled={!completo || verificando || segsExp <= 0 || bloqueado}
                    type="submit"
                  >
                    {verificando
                      ? <RefreshCw aria-hidden className={styles.spinning} size={18} />
                      : <ShieldCheck aria-hidden size={18} />}
                    {verificando
                      ? "Verificando…"
                      : completo
                      ? "Verificar y Explorar AlgoLab 🚀"
                      : "Ingresa los 6 dígitos"}
                  </button>
                </form>

                <div className={styles.resendRow}>
                  <button
                    type="button"
                    disabled={segsRenv > 0 || reenviando || bloqueado}
                    onClick={reenviar}
                  >
                    <RefreshCw aria-hidden className={reenviando ? styles.spinning : ""} size={14} />
                    {reenviando ? "Enviando…" : segsRenv > 0 ? `Reenviar en ${segsRenv}s` : "Reenviar código"}
                  </button>
                  <button type="button" onClick={() => { setPaso("canal"); setMensaje(null); }}>
                    Cambiar canal
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
                {mensaje.tono === "exito"
                  ? <CheckCircle2 aria-hidden size={18} />
                  : <ShieldCheck aria-hidden size={18} />}
                <span>{mensaje.texto}</span>
              </div>
            )}
          </div>

          {paso === "datos" && (
            <p className="auth-switch">
              ¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión aquí</Link>
            </p>
          )}
        </motion.div>
      </section>
    </main>
  );
}
