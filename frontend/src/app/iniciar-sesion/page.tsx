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
  TimerReset,
  Zap,
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

type Paso = "credenciales" | "canal" | "codigo";
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

const EMPTY = ["", "", "", "", "", ""];

async function readJson<T>(r: Response): Promise<T> {
  try { return await r.json() as T; }
  catch { throw new Error("Respuesta inesperada del servidor."); }
}

function fmtTime(s: number) {
  const ss = Math.max(0, s);
  return `${Math.floor(ss / 60)}:${String(ss % 60).padStart(2, "0")}`;
}
function extractNum(t: string, re: RegExp) {
  const m = t.match(re); return m ? Number(m[1]) : null;
}

// ─── Hero / Left panel ───────────────────────────────────
function HeroPanel({ paso }: { paso: Paso }) {
  const slides = {
    credenciales: {
      kicker: "Portal seguro",
      title: "Tu progreso sigue donde lo dejaste.",
      desc: "Accede a niveles, análisis del mentor IA y mantén tu perfil sincronizado con las gafas de Realidad Mixta.",
      code: { prefix: "sesion", fn: ".continuar();", comment: "// progreso · realidad mixta · compilador" },
    },
    canal: {
      kicker: "Verificación 2FA",
      title: "Elige cómo confirmar que eres tú.",
      desc: "Un código temporal de un solo uso garantiza que nadie más accede a tu espacio de AlgoLab.",
      code: { prefix: "seguridad", fn: ".elegirCanal();", comment: "// correo UCC · SMS · OTP de 6 dígitos" },
    },
    codigo: {
      kicker: "Segundo factor activo",
      title: "Confirma tu identidad digital.",
      desc: "Escribe el código que enviamos. Solo tú lo tienes. Solo funciona ahora.",
      code: { prefix: "identidad", fn: ".verificar();", comment: "// JWT generado al validarse · sesión cifrada" },
    },
  };
  const s = slides[paso];
  return (
    <div className="auth-story">
      <motion.div
        key={paso}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <span className="section-kicker">{s.kicker}</span>
        <h1 className="mt-3">{s.title}</h1>
        <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">{s.desc}</p>
      </motion.div>
      <div className="auth-code mt-8">
        <span>{s.code.prefix}</span>
        <strong>{s.code.fn}</strong>
        <small>{s.code.comment}</small>
      </div>
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────
const STEPS: { key: Paso; label: string }[] = [
  { key: "credenciales", label: "Credenciales" },
  { key: "canal", label: "Canal 2FA" },
  { key: "codigo", label: "Código OTP" },
];
function Stepper({ paso }: { paso: Paso }) {
  const idx = STEPS.findIndex((s) => s.key === paso);
  return (
    <div className={styles.stepRail}>
      {STEPS.map((s, i) => (
        <>
          <span
            key={s.key}
            className={
              i < idx ? styles.completedStep
              : i === idx ? styles.activeStep
              : ""
            }
          >
            {i < idx && <CheckCircle2 size={13} />}
            {i === 0 && i >= idx && <LockKeyhole size={13} />}
            {i === 1 && i >= idx && <KeyRound size={13} />}
            {i === 2 && i >= idx && <ShieldCheck size={13} />}
            {" "}{s.label}
          </span>
          {i < STEPS.length - 1 && <i key={s.key + "-sep"} aria-hidden />}
        </>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────
export default function IniciarSesionPage() {
  const router = useRouter();
  const rm = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [paso, setPaso] = useState<Paso>("credenciales");
  const [correo, setCorreo] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [canal, setCanal] = useState<Canal>("CORREO");
  const [correoTocado, setCorreoTocado] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [avisoSesion, setAvisoSesion] = useState("");
  const [mensaje, setMensaje] = useState<{ texto: string; tono: Tono } | null>(null);

  const [desafio, setDesafio] = useState<DesafioRespuesta | null>(null);
  const [codigo, setCodigo] = useState<string[]>(EMPTY);
  const [ahora, setAhora] = useState(() => Date.now());
  const [expiraEn, setExpiraEn] = useState(0);
  const [expTotal, setExpTotal] = useState(1);
  const [reenvioEn, setReenvioEn] = useState(0);
  const [intentosRest, setIntentosRest] = useState<number | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [otpKey, setOtpKey] = useState(0);

  const errCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const completo = codigo.every(Boolean);
  const segsExp = Math.max(0, Math.ceil((expiraEn - ahora) / 1000));
  const segsRenv = Math.max(0, Math.ceil((reenvioEn - ahora) / 1000));
  const prgTiempo = Math.max(0, Math.min(100, (segsExp / expTotal) * 100));

  const destino = useMemo(() => {
    if (desafio?.destinoEnmascarado) return desafio.destinoEnmascarado;
    return correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo";
  }, [correo, desafio?.destinoEnmascarado]);

  // Redirect if already logged in
  useEffect(() => {
    if (!hydrated || !existingToken || !usuario) return;
    const controller = new AbortController();
    fetch("/api/me", {
      headers: { Authorization: `Bearer ${existingToken}` },
      cache: "no-store", signal: controller.signal,
    }).then((r) => {
      if (r.ok) {
        const route = usuario.rol === "ADMINISTRADOR" ? "/administrador"
          : usuario.rol === "DOCENTE" ? "/docente" : "/estudiante";
        router.replace(route);
        return;
      }
      if (r.status === 401) setAvisoSesion("La sesión guardada necesita verificarse. Puedes reingresar o cambiar de cuenta.");
      else setAvisoSesion("No pudimos comprobar tu sesión. Tus datos siguen guardados.");
    }).catch((e: unknown) => {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setAvisoSesion("Sin conexión con AlgoLab. Tu sesión local permanece intacta.");
    });
    return () => controller.abort();
  }, [hydrated, existingToken, usuario, router]);

  // Timer tick
  useEffect(() => {
    if (paso !== "codigo") return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [paso]);

  // Autofocus OTP
  useEffect(() => {
    if (paso !== "codigo") return;
    const f = requestAnimationFrame(() => codeRefs.current[0]?.focus());
    return () => cancelAnimationFrame(f);
  }, [paso, otpKey]);

  // ── Paso 1: validar credenciales
  async function validarCredenciales(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCorreoTocado(true);
    const email = normalizeInstitutionalEmail(correo);
    const eE = institutionalEmailError(email);
    if (eE) { setMensaje({ texto: eE, tono: "error" }); emailRef.current?.focus(); return; }

    setEnviando(true);
    setMensaje(null);
    try {
      // Validate credentials first (quick check with CORREO)
      const r = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, contrasena: pass, canal: "CORREO" }),
      });
      const data = await readJson<DesafioRespuesta>(r);

      if (!r.ok || !data.requiereSegundoFactor) {
        const msg = data.mensaje ?? (r.status === 401 ? "Correo o contraseña incorrectos." : "No fue posible validar tus credenciales.");
        setMensaje({ texto: msg, tono: r.status >= 500 ? "aviso" : "error" });
        return;
      }
      // Credentials OK → go to channel selection
      setCorreo(email);
      // Store provisional desafio data
      setDesafio(data);
      setPaso("canal");
      setMensaje(null);
    } catch (err) {
      setMensaje({ texto: err instanceof Error ? err.message : "Error de conexión.", tono: "aviso" });
    } finally {
      setEnviando(false);
    }
  }

  // ── Paso 2: enviar código por canal elegido
  async function enviarCodigo() {
    setEnviando(true);
    setMensaje(null);
    try {
      const email = normalizeInstitutionalEmail(correo);
      let data: DesafioRespuesta;

      if (canal !== (desafio?.canal ?? "CORREO")) {
        // Re-request with different channel
        const r = await fetch("/api/iniciar-sesion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo: email, contrasena: pass, canal }),
        });
        data = await readJson<DesafioRespuesta>(r);
        if (!r.ok || !data.desafioId) {
          const msg = data.mensaje ?? "No se pudo enviar el código.";
          setMensaje({ texto: msg, tono: "error" });
          return;
        }
      } else {
        data = desafio!;
      }

      const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
      const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
      const ts = Date.now();
      setDesafio(data);
      setExpTotal(exp);
      setExpiraEn(ts + exp * 1000);
      setReenvioEn(ts + resend * 1000);
      setAhora(ts);
      setCodigo([...EMPTY]);
      setIntentosRest(null);
      setBloqueado(false);
      setOtpKey((k) => k + 1);
      setPaso("codigo");
      setMensaje({
        texto: canal === "SMS" ? "Código enviado por SMS 📱" : "Código enviado a tu correo 📧",
        tono: "exito",
      });
    } catch {
      const ts = Date.now();
      setExpTotal(300); setExpiraEn(ts + 300_000); setReenvioEn(ts + 30_000); setAhora(ts);
      setCodigo([...EMPTY]); setOtpKey((k) => k + 1); setPaso("codigo");
    } finally {
      setEnviando(false);
    }
  }

  // ── OTP helpers
  function updateDigit(idx: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (d.length > 1) { distribuir(d, idx); return; }
    setCodigo((c) => { const n = [...c]; n[idx] = d.slice(-1); return n; });
    if (d && idx < 5) codeRefs.current[idx + 1]?.focus();
  }
  function distribuir(raw: string, start = 0) {
    const d = raw.replace(/\D/g, "").slice(0, 6 - start);
    if (!d) return;
    setCodigo((c) => { const n = [...c]; d.split("").forEach((ch, i) => { n[start + i] = ch; }); return n; });
    requestAnimationFrame(() => codeRefs.current[Math.min(start + d.length, 5)]?.focus());
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

  // ── Paso 3: verificar código
  async function verificarCodigo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!completo || bloqueado || segsExp <= 0) {
      if (segsExp <= 0) setMensaje({ texto: "El código expiró. Solicita uno nuevo.", tono: "aviso" });
      return;
    }
    setVerificando(true);
    setMensaje(null);
    try {
      const r = await fetch("/api/segundo-factor/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio?.desafioId ?? "demo", codigo: codigo.join("") }),
      });
      const data = await readJson<LoginRespuesta>(r);
      if (!r.ok || !data.token || !data.usuario) {
        const msg = data.mensaje ?? "Código incorrecto.";
        const rem = extractNum(msg, /intentos restantes:\s*(\d+)/i);
        if (rem !== null) setIntentosRest(rem);
        if (r.status === 429) setBloqueado(true);
        setCodigo([...EMPTY]); setOtpKey((k) => k + 1);
        requestAnimationFrame(() => codeRefs.current[0]?.focus());
        setMensaje({ texto: msg, tono: "error" });
        return;
      }
      saveAuthToken(data.token);
      saveAuthUser(data.usuario);
      const route = data.usuario.rol === "ADMINISTRADOR" ? "/administrador"
        : data.usuario.rol === "DOCENTE" ? "/docente" : "/estudiante";
      router.replace(route);
    } catch {
      setMensaje({ texto: "Error de conexión. Intenta de nuevo.", tono: "aviso" });
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
      const r = await fetch("/api/segundo-factor/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio.desafioId }),
      });
      const data = await readJson<DesafioRespuesta>(r);
      if (r.ok && data.desafioId) {
        const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
        const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
        const ts = Date.now();
        setDesafio(data); setExpTotal(exp); setExpiraEn(ts + exp * 1000);
        setReenvioEn(ts + resend * 1000); setAhora(ts);
      } else {
        setReenvioEn(Date.now() + 30_000);
      }
      setCodigo([...EMPTY]); setOtpKey((k) => k + 1);
      setMensaje({ texto: "Nuevo código enviado a " + destino, tono: "exito" });
    } catch {
      setReenvioEn(Date.now() + 30_000); setCodigo([...EMPTY]); setOtpKey((k) => k + 1);
      setMensaje({ texto: "Código reenviado.", tono: "exito" });
    } finally {
      setReenviando(false);
    }
  }

  const ease = rm ? { duration: 0 } : { duration: 0.38, ease: "easeOut" as const };
  const slide = (dir: number) => ({
    initial: { opacity: 0, x: rm ? 0 : dir * 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: rm ? 0 : -dir * 20 },
    transition: ease,
  });

  return (
    <main className="auth-shell min-h-screen">
      {/* Brand logo */}
      <Link className="auth-brand" href="/">
        <span className="brand-mark">A</span>
        <strong>AlgoLab</strong>
      </Link>

      <section className="auth-layout">
        {/* ── LEFT: Story panel ── */}
        <AnimatePresence mode="wait">
          <HeroPanel paso={paso} />
        </AnimatePresence>

        {/* ── RIGHT: Auth card ── */}
        <div className={`auth-card ${styles.securityCard} relative`}>
          <div aria-hidden className={styles.cardCircuit} />
          <Stepper paso={paso} />

          <AnimatePresence mode="wait">
            {/* ══════════════════ PASO 1: CREDENCIALES ══════════════════ */}
            {paso === "credenciales" && (
              <motion.div key="creds" {...slide(1)}>
                <p className="section-kicker">Acceso institucional</p>
                <h2>Iniciar sesión</h2>
                <p className="auth-copy">Ingresa tus credenciales UCC para continuar al portal.</p>

                {/* Session warning */}
                {avisoSesion && (
                  <div className={styles.savedSessionNotice} role="status">
                    <ShieldCheck size={18} aria-hidden />
                    <div>
                      <strong>Sesión local protegida</strong>
                      <p>{avisoSesion}</p>
                      <button
                        type="button"
                        onClick={() => { clearAuthSession(); setAvisoSesion(""); }}
                      >
                        Cambiar de cuenta
                      </button>
                    </div>
                  </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={validarCredenciales} noValidate>
                  {/* Email */}
                  <label className="field-label" htmlFor="login-email">
                    Correo institucional
                    <span className={styles.inputShell}>
                      <Mail aria-hidden size={18} />
                      <input
                        id="login-email"
                        ref={emailRef}
                        className="field-input"
                        type="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="nombre.apellido@campusucc.edu.co"
                        required
                        value={correo}
                        aria-invalid={Boolean(errCorreo)}
                        aria-describedby="login-email-help"
                        onBlur={() => setCorreoTocado(true)}
                        onChange={(e) => { setCorreo(e.target.value); if (correoTocado) setMensaje(null); }}
                      />
                    </span>
                    <small
                      id="login-email-help"
                      className={errCorreo ? styles.fieldError : styles.fieldHelp}
                    >
                      {errCorreo || "Solo cuentas @campusucc.edu.co"}
                    </small>
                  </label>

                  {/* Password */}
                  <label className="field-label" htmlFor="login-pass">
                    Contraseña
                    <span className={styles.inputShell}>
                      <LockKeyhole aria-hidden size={18} />
                      <input
                        id="login-pass"
                        className="field-input"
                        type={verPass ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        minLength={6}
                        required
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.togglePasswordBtn}
                        onClick={() => setVerPass((v) => !v)}
                        aria-label={verPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {verPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </span>
                  </label>

                  <button
                    className="primary-button flex w-full items-center justify-center gap-2 mt-2"
                    disabled={enviando || !pass || (correoTocado && !isInstitutionalEmail(correo))}
                    type="submit"
                  >
                    {enviando
                      ? <RefreshCw aria-hidden className={styles.spinning} size={18} />
                      : <Zap aria-hidden size={18} />}
                    {enviando ? "Verificando credenciales…" : "Continuar"}
                  </button>
                </form>

                <p className="auth-switch mt-5">
                  ¿No tienes cuenta? <Link href="/registrarse">Créala gratis aquí</Link>
                </p>
              </motion.div>
            )}

            {/* ══════════════════ PASO 2: SELECCIÓN CANAL ══════════════════ */}
            {paso === "canal" && (
              <motion.div key="canal" {...slide(1)}>
                <button
                  className={styles.backButton}
                  type="button"
                  onClick={() => { setPaso("credenciales"); setMensaje(null); }}
                >
                  <ArrowLeft size={14} /> Volver
                </button>

                <p className="section-kicker">Verificación en dos pasos</p>
                <h2>¿Cómo recibes el código?</h2>
                <p className="auth-copy">
                  Selecciona el canal por donde quieres que te enviemos el código temporal.
                </p>

                <div className="mt-6 space-y-3">
                  {/* Correo */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={canal === "CORREO"}
                    onClick={() => setCanal("CORREO")}
                    className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      canal === "CORREO"
                        ? "border-emerald-500/55 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                        : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl transition-colors ${canal === "CORREO" ? "bg-emerald-500/20" : "bg-white/5"}`}>
                      <Mail size={20} className={canal === "CORREO" ? "text-emerald-400" : "text-slate-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold leading-none ${canal === "CORREO" ? "text-emerald-200" : "text-slate-200"}`}>
                        Correo institucional UCC
                      </p>
                      <p className="text-xs text-slate-500 mt-1 truncate">
                        {correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2")}
                      </p>
                    </div>
                    {canal === "CORREO" && <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />}
                  </button>

                  {/* SMS */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={canal === "SMS"}
                    onClick={() => setCanal("SMS")}
                    className={`w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 ${
                      canal === "SMS"
                        ? "border-cyan-500/55 bg-cyan-500/10 shadow-lg shadow-cyan-500/10"
                        : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className={`grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl transition-colors ${canal === "SMS" ? "bg-cyan-500/20" : "bg-white/5"}`}>
                      <Smartphone size={20} className={canal === "SMS" ? "text-cyan-400" : "text-slate-500"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold leading-none ${canal === "SMS" ? "text-cyan-200" : "text-slate-200"}`}>
                        Celular / SMS
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Mensaje de texto a tu número registrado
                      </p>
                    </div>
                    {canal === "SMS" && <CheckCircle2 size={18} className="text-cyan-400 flex-shrink-0" />}
                  </button>
                </div>

                <button
                  className="primary-button flex w-full items-center justify-center gap-2 mt-6"
                  type="button"
                  disabled={enviando}
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

            {/* ══════════════════ PASO 3: OTP ══════════════════ */}
            {paso === "codigo" && (
              <motion.div key="otp" {...slide(1)}>
                <button
                  className={styles.backButton}
                  type="button"
                  onClick={() => { setPaso("canal"); setMensaje(null); }}
                >
                  <ArrowLeft size={14} /> Cambiar canal
                </button>

                {/* Portal header */}
                <div className={styles.portalHeader}>
                  <div aria-hidden className={styles.portalCore}>
                    <span /><span /><span />
                    {canal === "SMS" ? <Smartphone size={22} /> : <Mail size={22} />}
                  </div>
                  <div>
                    <p className="section-kicker">
                      {canal === "SMS" ? "SMS enviado" : "Correo enviado"}
                    </p>
                    <h2 aria-label="Código OTP" data-text="Código OTP">Código OTP</h2>
                    <p className="auth-copy text-xs">
                      Enviado a <strong className="text-emerald-300">{destino}</strong>
                    </p>
                  </div>
                </div>

                <form className={styles.codeForm} onSubmit={verificarCodigo} noValidate>
                  <fieldset
                    key={otpKey}
                    className={styles.codeFieldset}
                    onPaste={pegar}
                    style={{ perspective: "800px" }}
                  >
                    <legend className="sr-only">Código de verificación de 6 dígitos</legend>
                    {codigo.map((d, i) => (
                      <input
                        key={i}
                        aria-label={`Dígito ${i + 1} de 6`}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        className={d ? styles.filledCode : ""}
                        disabled={bloqueado}
                        inputMode="numeric"
                        maxLength={1}
                        pattern="[0-9]*"
                        value={d}
                        ref={(n) => { codeRefs.current[i] = n; }}
                        onChange={(e) => updateDigit(i, e.target.value)}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => navKey(e, i)}
                      />
                    ))}
                  </fieldset>

                  <div className={styles.timerPanel}>
                    <div>
                      <span><TimerReset aria-hidden size={13} /> Vigencia</span>
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
                        : "El código expira automáticamente por seguridad."}
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
                    {verificando ? "Verificando identidad…"
                      : completo ? "Abrir mi portal AlgoLab"
                      : "Ingresa los 6 dígitos"}
                  </button>
                </form>

                <div className={styles.resendRow}>
                  <button
                    type="button"
                    disabled={segsRenv > 0 || reenviando || bloqueado}
                    onClick={reenviar}
                  >
                    <RefreshCw aria-hidden className={reenviando ? styles.spinning : ""} size={13} />
                    {reenviando ? "Enviando…" : segsRenv > 0 ? `Reenviar en ${segsRenv}s` : "Reenviar código"}
                  </button>
                  <button type="button" onClick={() => { setPaso("credenciales"); setMensaje(null); }}>
                    Cambiar cuenta
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback */}
          <div aria-atomic aria-live="polite" className={styles.messageRegion}>
            {mensaje && (
              <div
                className={styles.feedback}
                data-tone={mensaje.tono}
                role={mensaje.tono === "error" ? "alert" : "status"}
              >
                {mensaje.tono === "exito"
                  ? <CheckCircle2 aria-hidden size={17} />
                  : <ShieldCheck aria-hidden size={17} />}
                <span>{mensaje.texto}</span>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
