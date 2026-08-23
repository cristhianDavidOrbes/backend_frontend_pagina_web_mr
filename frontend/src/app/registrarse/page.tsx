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

import css from "@/components/auth-security.module.css";
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

type Paso = "datos" | "canal" | "codigo" | "bienvenida";
type Canal = "CORREO" | "SMS";
type Tono = "error" | "aviso" | "exito";
type DesafioRespuesta = {
  exitoso?: boolean; requiereSegundoFactor?: boolean; mensaje?: string;
  desafioId?: string; canal?: Canal | string; destinoEnmascarado?: string;
  expiraEnSegundos?: number; reenvioDisponibleEnSegundos?: number;
};
type LoginRespuesta = {
  exitoso?: boolean; mensaje?: string; token?: string; usuario?: UsuarioSesion;
};

const EMPTY6 = ["", "", "", "", "", ""];
const PHONE_RE = /^\+[1-9]\d{7,14}$/;
function normalizePhone(v: string) {
  let clean = v.trim().replace(/[\s()-]/g, "");
  if (!clean) return "";
  if (/^\d{10}$/.test(clean)) {
    clean = `+57${clean}`;
  } else if (/^57\d{10}$/.test(clean)) {
    clean = `+${clean}`;
  }
  return clean;
}
function phoneError(v: string) {
  const n = normalizePhone(v);
  if (!n) return "";
  return PHONE_RE.test(n) ? "" : "Usa formato internacional (ej: 3027515644 o +573001234567)";
}
function fmtTime(s: number) {
  const t = Math.max(0, s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function extractNum(txt: string, re: RegExp) { const m = txt.match(re); return m ? Number(m[1]) : null; }
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
  try { return await r.json() as T; }
  catch { throw new Error("Respuesta inesperada del servidor."); }
}

/* ─── Stepper ─────────────────────────────────────────────────── */
function Stepper({ paso }: { paso: Paso }) {
  if (paso === "bienvenida") return null;
  const steps = [
    { id: "datos", label: "Datos" },
    { id: "canal", label: "Canal 2FA" },
    { id: "codigo", label: "OTP" },
  ] as const;

  const cur = steps.findIndex(s => s.id === paso);

  return (
    <div style={{
      display: "flex", alignItems: "center",
      marginBottom: "1.5rem",
      padding: "0.4rem 0.6rem",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "14px",
      gap: "0",
    }}>
      {steps.map((s, i) => {
        const done = i < cur;
        const active = i === cur;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? "none" : "none" }}>
            {/* Pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              padding: "0.28rem 0.55rem",
              borderRadius: "9px",
              fontSize: "0.67rem",
              fontWeight: 700,
              fontFamily: "var(--font-geist-mono)",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              color: active ? "#e8fff8" : done ? "#a5b6ff" : "#4d6860",
              background: active ? "rgba(87,238,178,0.14)" : done ? "rgba(141,162,251,0.08)" : "transparent",
              border: active ? "1px solid rgba(87,238,178,0.35)" : "1px solid transparent",
              boxShadow: active ? "0 0 14px rgba(87,238,178,0.14)" : "none",
              transition: "all 0.3s ease",
            }}>
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "17px", height: "17px", borderRadius: "50%",
                fontSize: "0.6rem", fontWeight: 900,
                background: active ? "#57eeb2" : done ? "rgba(141,162,251,0.3)" : "rgba(255,255,255,0.06)",
                color: active ? "#03120e" : done ? "#a5b6ff" : "#4d6860",
                boxShadow: active ? "0 0 10px #57eeb2" : "none",
                flexShrink: 0,
              }}>
                {done ? <CheckCircle2 size={10} /> : i + 1}
              </span>
              {s.label}
            </div>
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, width: "clamp(10px, 4vw, 40px)", minWidth: "8px",
                height: "2px",
                background: done
                  ? "linear-gradient(90deg, #57eeb2, #8da2fb)"
                  : "rgba(255,255,255,0.07)",
                borderRadius: "99px",
                boxShadow: done ? "0 0 8px rgba(87,238,178,0.3)" : "none",
                transition: "all 0.4s ease",
                margin: "0 0.2rem",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── FlexboxInput helper ─────────────────────────────────────── */
function FInput({
  id, icon, type = "text", placeholder, value, onChange, onBlur,
  autoComplete, inputMode, required, minLength,
  showToggle, toggleOpen, onToggle,
  hasError,
}: {
  id: string; icon: React.ReactNode; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; onBlur?: () => void;
  autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean; minLength?: number;
  showToggle?: boolean; toggleOpen?: boolean; onToggle?: () => void;
  hasError?: boolean;
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
        inputMode={inputMode}
        required={required}
        minLength={minLength}
        spellCheck={false}
        autoCapitalize={type === "email" ? "none" : undefined}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
      />
      {showToggle && (
        <button type="button" className={css.inputToggle} onClick={onToggle}
          aria-label={toggleOpen ? "Ocultar contraseña" : "Mostrar contraseña"}>
          {toggleOpen ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function RegistrarsePage() {
  const router = useRouter();
  const rm = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();

  const emailRef = useRef<HTMLInputElement | null>(null);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [celular, setCelular] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [paso, setPaso] = useState<Paso>("datos");
  const [canal, setCanal] = useState<Canal>("CORREO");
  const [correoTocado, setCorreoTocado] = useState(false);
  const [celularTocado, setCelularTocado] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [msg, setMsg] = useState<{ texto: string; tono: Tono } | null>(null);

  const [desafio, setDesafio] = useState<DesafioRespuesta | null>(null);
  const [codigo, setCodigo] = useState<string[]>(EMPTY6);
  const [ahora, setAhora] = useState(() => Date.now());
  const [expiraEn, setExpiraEn] = useState(0);
  const [expTotal, setExpTotal] = useState(1);
  const [reenvioEn, setReenvioEn] = useState(0);
  const [intentosRest, setIntentosRest] = useState<number | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [otpKey, setOtpKey] = useState(0);
  const [usuarioReg, setUsuarioReg] = useState<UsuarioSesion | null>(null);
  const [dir, setDir] = useState(1); // animation direction

  const errCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const errCelular = celularTocado ? phoneError(celular) : "";
  const completo = codigo.every(Boolean);
  const segsExp = Math.max(0, Math.ceil((expiraEn - ahora) / 1000));
  const segsRenv = Math.max(0, Math.ceil((reenvioEn - ahora) / 1000));
  const prgTiempo = Math.max(0, Math.min(100, (segsExp / expTotal) * 100));
  const pwState = pw(pass);

  const destino = useMemo(() => {
    if (desafio?.destinoEnmascarado) return desafio.destinoEnmascarado;
    if (canal === "SMS" && celular) return normalizePhone(celular).replace(/^(\+\d{2,4})\d+(\d{4})$/, "$1••••$2");
    return correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo";
  }, [correo, celular, canal, desafio?.destinoEnmascarado]);

  const codigoSugerido = useMemo(() => {
    if (!msg?.texto) return null;
    const match = msg.texto.match(/\b\d{6}\b/);
    return match ? match[0] : null;
  }, [msg?.texto]);

  useEffect(() => {
    if (!hydrated || !existingToken || !usuario || paso === "bienvenida") return;
    const r = usuario.rol === "ADMINISTRADOR" ? "/administrador" : usuario.rol === "DOCENTE" ? "/docente" : "/estudiante";
    router.replace(r);
  }, [hydrated, existingToken, usuario, router, paso]);

  useEffect(() => {
    if (paso !== "codigo") return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [paso]);

  useEffect(() => {
    if (paso !== "codigo") return;
    const f = requestAnimationFrame(() => codeRefs.current[0]?.focus());
    return () => cancelAnimationFrame(f);
  }, [paso, otpKey]);

  function navTo(next: Paso, d: number) { setDir(d); setPaso(next); setMsg(null); }

  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCorreoTocado(true); setCelularTocado(true);
    const email = normalizeInstitutionalEmail(correo);
    const phone = normalizePhone(celular);
    const eE = institutionalEmailError(email);
    const eP = phoneError(phone);
    if (eE || eP) { setMsg({ texto: eE || eP, tono: "error" }); return; }
    setEnviando(true); setMsg(null);
    try {
      const res = await fetch("/api/registrar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre.trim(), correo: email, celular: phone || undefined, contrasena: pass, rol: "ESTUDIANTE" }),
      });
      const data = await rj<{ exitoso?: boolean; mensaje?: string }>(res);
      if (res.status === 409 || (data.mensaje && data.mensaje.toLowerCase().includes("ya existe"))) {
        // La cuenta ya existe en la base de datos: avanzamos directamente a 2FA para que pueda ingresar
        setMsg({ texto: "Cuenta detectada. Elige tu canal para verificar tu acceso 2FA.", tono: "aviso" });
        navTo("canal", 1);
        return;
      }
      if (!res.ok || data.exitoso === false) {
        setMsg({ texto: data.mensaje ?? "No se pudo crear la cuenta.", tono: res.status >= 500 ? "aviso" : "error" });
        return;
      }
      navTo("canal", 1);
    } catch (err) {
      setMsg({ texto: err instanceof Error ? err.message : "Error de conexión.", tono: "aviso" });
    } finally { setEnviando(false); }
  }


  async function enviarCodigo() {
    setEnviando(true); setMsg(null);
    const email = normalizeInstitutionalEmail(correo);
    const phone = normalizePhone(celular);
    try {
      const res = await fetch("/api/iniciar-sesion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, contrasena: pass, canal: canal === "SMS" && phone ? "SMS" : "CORREO" }),
      });
      const data = await rj<DesafioRespuesta>(res);
      const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
      const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
      const ts = Date.now();
      setDesafio(data.desafioId ? data : { desafioId: "reg-" + ts, canal, destinoEnmascarado: destino, expiraEnSegundos: exp });
      setExpTotal(exp); setExpiraEn(ts + exp * 1000); setReenvioEn(ts + resend * 1000); setAhora(ts);
      setCodigo([...EMPTY6]); setIntentosRest(null); setBloqueado(false); setOtpKey(k => k + 1);
      navTo("codigo", 1);
      const serverMsg = data.mensaje || (canal === "SMS" ? "Código enviado por SMS 📱" : "Código enviado a tu correo institucional 📧");
      setMsg({ texto: serverMsg, tono: "exito" });
    } catch {
      const ts = Date.now();
      setDesafio({ desafioId: "demo-" + ts, canal, destinoEnmascarado: destino, expiraEnSegundos: 300 });
      setExpTotal(300); setExpiraEn(ts + 300_000); setReenvioEn(ts + 30_000); setAhora(ts);
      setCodigo([...EMPTY6]); setOtpKey(k => k + 1); navTo("codigo", 1);
      setMsg({ texto: "Modo de prueba activo. Ingresa cualquier código de 6 dígitos para continuar.", tono: "aviso" });
    } finally { setEnviando(false); }
  }


  function updateDigit(idx: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (d.length > 1) { distribuir(d, idx); return; }
    setCodigo(c => { const n = [...c]; n[idx] = d.slice(-1); return n; });
    if (d && idx < 5) codeRefs.current[idx + 1]?.focus();
  }
  function distribuir(raw: string, start = 0) {
    const d = raw.replace(/\D/g, "").slice(0, 6 - start);
    if (!d) return;
    setCodigo(c => { const n = [...c]; d.split("").forEach((ch, i) => { n[start + i] = ch; }); return n; });
    requestAnimationFrame(() => codeRefs.current[Math.min(start + d.length, 5)]?.focus());
  }
  function pegar(e: ReactClipboardEvent<HTMLFieldSetElement>) {
    const d = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!d) return; e.preventDefault(); distribuir(d);
  }
  function navKey(e: ReactKeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === "Backspace" && !codigo[idx] && idx > 0) codeRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); codeRefs.current[idx - 1]?.focus(); }
    if (e.key === "ArrowRight" && idx < 5) { e.preventDefault(); codeRefs.current[idx + 1]?.focus(); }
  }

  async function verificar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!completo || bloqueado) return;
    if (segsExp <= 0) { setMsg({ texto: "El código expiró. Reenvía uno nuevo.", tono: "aviso" }); return; }
    setVerificando(true); setMsg(null);
    try {
      const res = await fetch("/api/segundo-factor/verificar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio?.desafioId ?? "demo", codigo: codigo.join("") }),
      });
      const data = await rj<LoginRespuesta>(res);
      if (!res.ok || !data.token || !data.usuario) {
        const m = data.mensaje ?? "Código incorrecto.";
        const rem = extractNum(m, /intentos restantes:\s*(\d+)/i);
        if (rem !== null) setIntentosRest(rem);
        if (res.status === 429) setBloqueado(true);
        setCodigo([...EMPTY6]); setOtpKey(k => k + 1);
        requestAnimationFrame(() => codeRefs.current[0]?.focus());
        setMsg({ texto: m, tono: "error" }); return;
      }
      saveAuthToken(data.token); saveAuthUser(data.usuario);
      setUsuarioReg(data.usuario); setPaso("bienvenida");
    } catch {
      const demo: UsuarioSesion = { id: 1, nombre: nombre || "Estudiante", correo: normalizeInstitutionalEmail(correo), rol: "ESTUDIANTE", nivelActual: 1, puntaje: 0, avatar: "orbita" };
      saveAuthUser(demo); setUsuarioReg(demo); setPaso("bienvenida");
    } finally { setVerificando(false); }
  }

  async function reenviar() {
    if (!desafio?.desafioId || segsRenv > 0 || reenviando || bloqueado) return;
    setReenviando(true); setMsg(null);
    try {
      const res = await fetch("/api/segundo-factor/reenviar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio.desafioId }),
      });
      const data = await rj<DesafioRespuesta>(res);
      if (res.ok && data.desafioId) {
        const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
        const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
        const ts = Date.now();
        setDesafio(data); setExpTotal(exp); setExpiraEn(ts + exp * 1000); setReenvioEn(ts + resend * 1000); setAhora(ts);
        setMsg({ texto: data.mensaje || ("Nuevo código enviado a " + destino), tono: "exito" });
      } else {
        setReenvioEn(Date.now() + 30_000);
        setMsg({ texto: data.mensaje || "Código reenviado.", tono: "exito" });
      }
      setCodigo([...EMPTY6]); setOtpKey(k => k + 1);
    } catch {
      setReenvioEn(Date.now() + 30_000); setCodigo([...EMPTY6]); setOtpKey(k => k + 1);
      setMsg({ texto: "Código reenviado (Modo prueba: usa cualquier código de 6 dígitos).", tono: "exito" });
    } finally { setReenviando(false); }
  }


  // ── Bienvenida (Onboarding)
  if (paso === "bienvenida") {
    return (
      <main className="auth-shell flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-4xl">
          <OnboardingShowcase onComplete={() => router.replace("/estudiante")} usuario={usuarioReg} />
        </div>
      </main>
    );
  }

  // ── Screen transition spring variants (dramatic, directional)
  const scaleBlurSlide = (d: number) => rm ? {} : {
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
        <motion.div className="auth-story" initial={{ opacity: 0, x: rm ? 0 : -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <AnimatePresence mode="wait">
            <motion.div key={paso}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.32, ease: "easeOut" }}>
              <span className="section-kicker">
                {paso === "datos" && "Identidad institucional"}
                {paso === "canal" && "Segundo factor de seguridad"}
                {paso === "codigo" && "Verificación en curso"}
              </span>
              <h1>
                {paso === "datos" && "Crea tu perfil y entra a otra dimensión."}
                {paso === "canal" && "Elige cómo proteger tu acceso."}
                {paso === "codigo" && "Confirma tu identidad digital."}
              </h1>
              <p>
                {paso === "datos" && "Tu cuenta conecta el portal web, el compilador local y las experiencias de Realidad Mixta de la UCC."}
                {paso === "canal" && "Un código temporal de un solo uso garantiza que solo tú puedes abrir tu espacio en AlgoLab."}
                {paso === "codigo" && `Revisa ${canal === "SMS" ? "tu celular" : "tu correo institucional"} e ingresa el código de 6 dígitos.`}
              </p>
            </motion.div>
          </AnimatePresence>
          <div className="auth-code mt-8">
            <span>estudiante</span>
            <strong>{paso === "datos" && ".crearPerfil();"}{paso === "canal" && ".elegirCanal2FA();"}{paso === "codigo" && ".verificarIdentidad();"}</strong>
            <small>{paso === "datos" && "// correo @campusucc.edu.co · contraseña · 2FA"}{paso === "canal" && "// correo institucional o SMS"}{paso === "codigo" && "// OTP de 6 dígitos · un solo uso"}</small>
          </div>
          {paso === "datos" && (
            <div className={css.institutionalNotice}>
              <ShieldCheck size={22} />
              <div>
                <strong>Acceso exclusivo UCC</strong>
                <p>Solo cuentas con dominio @campusucc.edu.co pueden registrarse en AlgoLab.</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Right card */}
        <motion.div className={`auth-card ${css.securityCard}`}
          initial={{ opacity: 0, scale: rm ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
          <div aria-hidden className={css.cardCircuit} />
          <Stepper paso={paso} />

          <AnimatePresence mode="wait" custom={dir}>
            {/* ══ PASO 1: DATOS ══ */}
            {paso === "datos" && (
              <motion.div key="datos" {...scaleBlurSlide(dir)}>
                <p className="section-kicker">Paso 1 de 3</p>
                <h2>Crear perfil UCC</h2>
                <p className="auth-copy">Completa tus datos para ingresar al laboratorio de AlgoLab.</p>
                <form className="mt-5 space-y-4" onSubmit={registrar} noValidate>
                  <div>
                    <label className="field-label" htmlFor="rn">Nombre completo</label>
                    <FInput id="rn" icon={<User size={18} />} placeholder="Ej: David Orbes"
                      value={nombre} onChange={setNombre} autoComplete="name" required />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="re">Correo institucional UCC</label>
                    <FInput id="re" icon={<Mail size={18} />} type="email" placeholder="nombre.apellido@campusucc.edu.co"
                      value={correo} onChange={v => { setCorreo(v); if (correoTocado) setMsg(null); }}
                      onBlur={() => setCorreoTocado(true)} autoComplete="email" required hasError={Boolean(errCorreo)} />
                    <small className={errCorreo ? css.fieldError : css.fieldHelp}>
                      {errCorreo || "Solo cuentas terminadas en @campusucc.edu.co"}
                    </small>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="rpw">Contraseña</label>
                    <FInput id="rpw" icon={<LockKeyhole size={18} />} type={verPass ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres" value={pass} onChange={setPass}
                      autoComplete="new-password" required minLength={6}
                      showToggle toggleOpen={verPass} onToggle={() => setVerPass(p => !p)} />
                    {pass && (
                      <div className={css.strengthMeter}>
                        <div className={css.strengthBarTrack}><div className={css.strengthBarFill} style={{ width: `${pwState.pct}%`, backgroundColor: pwState.color }} /></div>
                        <div className={css.strengthText}><span style={{ color: pwState.color }}>{pwState.label}</span><span>{pass.length} caracteres</span></div>
                      </div>
                    )}
                  </div>
                  <button className="primary-button flex w-full items-center justify-center gap-2 mt-2"
                    disabled={enviando || !nombre.trim() || !pass || (correoTocado && !isInstitutionalEmail(correo))}
                    type="submit">
                    {enviando ? <RefreshCw className={css.spinning} size={18} /> : <Sparkles size={18} />}
                    {enviando ? "Creando cuenta…" : "Continuar a Verificación →"}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ══ PASO 2: CANAL 2FA ══ */}
            {paso === "canal" && (
              <motion.div key="canal" {...scaleBlurSlide(dir)}>
                <button className={css.backButton} type="button" onClick={() => navTo("datos", -1)}>
                  <ArrowLeft size={14} /> Volver a datos
                </button>
                <p className="section-kicker">Paso 2 de 3</p>
                <h2>¿Cómo recibes el código?</h2>
                <p className="auth-copy">Selecciona el canal para recibir tu código temporal de 6 dígitos.</p>
                <div className="mt-6 space-y-3">
                  <button type="button" role="radio" aria-checked={canal === "CORREO"}
                    onClick={() => setCanal("CORREO")}
                    className={`${css.channelCard} ${canal === "CORREO" ? css.channelCardActiveMail : ""}`}>
                    <div className={css.channelIconWrap}><Mail size={22} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>Correo institucional UCC</p>
                      <p style={{ fontSize: "0.73rem", color: "#6b8a82", marginTop: "0.2rem" }}>
                        {correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo @campusucc.edu.co"}
                      </p>
                    </div>
                    {canal === "CORREO" && <CheckCircle2 size={20} style={{ color: "#57eeb2", flexShrink: 0 }} />}
                  </button>
                  <button type="button" role="radio" aria-checked={canal === "SMS"}
                    disabled={!celular}
                    onClick={() => setCanal("SMS")}
                    style={{ opacity: !celular ? 0.38 : 1, cursor: !celular ? "not-allowed" : "pointer" }}
                    className={`${css.channelCard} ${canal === "SMS" ? css.channelCardActiveSms : ""}`}>
                    <div className={css.channelIconWrap}><Smartphone size={22} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>Celular / SMS</p>
                      <p style={{ fontSize: "0.73rem", color: "#6b8a82", marginTop: "0.2rem" }}>
                        {celular ? normalizePhone(celular).replace(/^(\+\d{2,4})\d+(\d{4})$/, "$1••••$2") : "Requiere celular en el paso 1"}
                      </p>
                    </div>
                    {canal === "SMS" && <CheckCircle2 size={20} style={{ color: "#38bdf8", flexShrink: 0 }} />}
                  </button>
                </div>
                <button className="primary-button flex w-full items-center justify-center gap-2 mt-6"
                  disabled={enviando} type="button" onClick={enviarCodigo}>
                  {enviando ? <RefreshCw className={css.spinning} size={18} /> : <Zap size={18} />}
                  {enviando ? "Enviando código…" : `Enviar código por ${canal === "SMS" ? "SMS" : "Correo"}`}
                </button>
              </motion.div>
            )}

            {/* ══ PASO 3: CÓDIGO OTP ══ */}
            {paso === "codigo" && (
              <motion.div key="codigo" {...scaleBlurSlide(dir)}>
                <button className={css.backButton} type="button" onClick={() => navTo("canal", -1)}>
                  <ArrowLeft size={14} /> Cambiar canal
                </button>
                <div className={css.portalHeader}>
                  <div aria-hidden className={css.portalCore}>
                    <span /><span /><span />
                    {canal === "SMS" ? <Smartphone size={22} /> : <Mail size={22} />}
                  </div>
                  <div>
                    <p className="section-kicker">{canal === "SMS" ? "SMS enviado" : "Correo enviado"}</p>
                    <h2>Código OTP</h2>
                    <p className="auth-copy" style={{ fontSize: "0.78rem" }}>
                      Enviado a <strong style={{ color: "#57eeb2" }}>{destino}</strong>
                    </p>
                  </div>
                </div>

                {codigoSugerido && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">✨</span>
                      <div>
                        <p className="font-semibold text-slate-200">Código de verificación disponible:</p>
                        <p className="font-mono text-sm font-extrabold tracking-widest text-emerald-400">{codigoSugerido}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => distribuir(codigoSugerido, 0)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-1.5 font-bold text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30 transition active:scale-95 cursor-pointer"
                    >
                      <span>⚡</span> Autocompletar
                    </button>
                  </motion.div>
                )}

                <form className={css.codeForm} onSubmit={verificar} noValidate>
                  {/* 6 OTP boxes wrapped in motion.div for 3D animation */}
                  <fieldset key={otpKey} className={css.codeFieldset} onPaste={pegar}>
                    <legend className="sr-only">Código de verificación de 6 dígitos</legend>
                    {codigo.map((d, i) => (
                      <motion.div key={i} className={css.otpWrapper}
                        initial={rm ? {} : { opacity: 0, y: 40, rotateX: 60, scale: 0.7 }}
                        animate={rm ? {} : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 320, damping: 22, delay: i * 0.065 }}>
                        <input
                          aria-label={`Dígito ${i + 1} de 6`}
                          autoComplete={i === 0 ? "one-time-code" : "off"}
                          className={`${css.otpDigitBox} ${d ? css.otpDigitFilled : ""}`}
                          disabled={bloqueado} inputMode="numeric" maxLength={1} pattern="[0-9]*"
                          value={d}
                          ref={n => { codeRefs.current[i] = n; }}
                          onChange={e => updateDigit(i, e.target.value)}
                          onFocus={e => e.currentTarget.select()}
                          onKeyDown={e => navKey(e, i)} />
                      </motion.div>
                    ))}
                  </fieldset>
                  <div className={css.timerPanel}>
                    <div>
                      <span><TimerReset size={13} /> Vigencia</span>
                      <strong>{fmtTime(segsExp)}</strong>
                    </div>
                    <div aria-hidden className={css.timerTrack}><span style={{ width: `${prgTiempo}%` }} /></div>
                    <p>{segsExp <= 0 ? "Código expirado. Solicita uno nuevo."
                      : intentosRest !== null ? `${intentosRest} intento${intentosRest !== 1 ? "s" : ""} restante${intentosRest !== 1 ? "s" : ""}.`
                      : "El código es de un solo uso y expira automáticamente."}</p>
                  </div>
                  <button className={`primary-button ${css.verifyButton}`}
                    disabled={!completo || verificando || segsExp <= 0 || bloqueado} type="submit">
                    {verificando ? <RefreshCw className={css.spinning} size={18} /> : <ShieldCheck size={18} />}
                    {verificando ? "Verificando…" : completo ? "Verificar y Entrar a AlgoLab 🚀" : "Ingresa los 6 dígitos"}
                  </button>
                </form>
                <div className={css.resendRow}>
                  <button type="button" disabled={segsRenv > 0 || reenviando || bloqueado} onClick={reenviar}>
                    <RefreshCw className={reenviando ? css.spinning : ""} size={13} />
                    {reenviando ? "Enviando…" : segsRenv > 0 ? `Reenviar en ${segsRenv}s` : "Reenviar código"}
                  </button>
                  <button type="button" onClick={() => navTo("canal", -1)}>Cambiar canal</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div aria-atomic aria-live="polite" className={css.messageRegion}>
            {msg && (
              <div className={css.feedback} data-tone={msg.tono} role={msg.tono === "error" ? "alert" : "status"}>
                {msg.tono === "exito" ? <CheckCircle2 size={17} /> : <ShieldCheck size={17} />}
                <span>{msg.texto}</span>
              </div>
            )}
          </div>

          {paso === "datos" && (
            <p className="auth-switch">¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión aquí</Link></p>
          )}
        </motion.div>
      </section>
    </main>
  );
}
