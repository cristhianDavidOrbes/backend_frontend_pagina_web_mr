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

import css from "@/components/auth-security.module.css";
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
  exitoso?: boolean; requiereSegundoFactor?: boolean; mensaje?: string;
  desafioId?: string; canal?: Canal | string; destinoEnmascarado?: string;
  expiraEnSegundos?: number; reenvioDisponibleEnSegundos?: number;
};
type LoginRespuesta = {
  exitoso?: boolean; mensaje?: string; token?: string; usuario?: UsuarioSesion;
};

const EMPTY6 = ["", "", "", "", "", ""];

async function rj<T>(r: Response): Promise<T> {
  try { return await r.json() as T; }
  catch { throw new Error("Respuesta inesperada del servidor."); }
}
function fmtTime(s: number) {
  const t = Math.max(0, s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function extractNum(txt: string, re: RegExp) { const m = txt.match(re); return m ? Number(m[1]) : null; }

/* ─── Stepper ─────────────────────────────────────────────────── */
function Stepper({ paso }: { paso: Paso }) {
  const steps = [
    { id: "credenciales", label: "Credenciales" },
    { id: "canal", label: "Canal 2FA" },
    { id: "codigo", label: "OTP" },
  ] as const;
  const cur = steps.findIndex(s => s.id === paso);
  return (
    <div style={{
      display: "flex", alignItems: "center", marginBottom: "1.5rem",
      padding: "0.4rem 0.6rem",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "14px",
    }}>
      {steps.map((s, i) => {
        const done = i < cur, active = i === cur;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              padding: "0.28rem 0.55rem", borderRadius: "9px",
              fontSize: "0.67rem", fontWeight: 700,
              fontFamily: "var(--font-geist-mono)", whiteSpace: "nowrap",
              color: active ? "#e8fff8" : done ? "#a5b6ff" : "#4d6860",
              background: active ? "rgba(87,238,178,0.14)" : done ? "rgba(141,162,251,0.08)" : "transparent",
              border: active ? "1px solid rgba(87,238,178,0.35)" : "1px solid transparent",
              boxShadow: active ? "0 0 14px rgba(87,238,178,0.14)" : "none",
              transition: "all 0.3s ease",
            }}>
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "17px", height: "17px", borderRadius: "50%", flexShrink: 0,
                fontSize: "0.6rem", fontWeight: 900,
                background: active ? "#57eeb2" : done ? "rgba(141,162,251,0.3)" : "rgba(255,255,255,0.06)",
                color: active ? "#03120e" : done ? "#a5b6ff" : "#4d6860",
                boxShadow: active ? "0 0 10px #57eeb2" : "none",
              }}>
                {done ? <CheckCircle2 size={10} /> : i + 1}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div style={{
                width: "clamp(8px, 3vw, 32px)", height: "2px",
                background: done ? "linear-gradient(90deg, #57eeb2, #8da2fb)" : "rgba(255,255,255,0.07)",
                borderRadius: "99px",
                boxShadow: done ? "0 0 8px rgba(87,238,178,0.3)" : "none",
                transition: "all 0.4s ease", margin: "0 0.15rem",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── FlexboxInput ─────────────────────────────────────────────── */
function FInput({
  id, icon, type = "text", placeholder, value, onChange, onBlur,
  autoComplete, required, minLength, hasError,
  showToggle, toggleOpen, onToggle,
}: {
  id: string; icon: React.ReactNode; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; onBlur?: () => void;
  autoComplete?: string; required?: boolean; minLength?: number; hasError?: boolean;
  showToggle?: boolean; toggleOpen?: boolean; onToggle?: () => void;
}) {
  return (
    <div className={`${css.inputRow} ${hasError ? css.inputRowError : ""}`}>
      <span className={css.inputIcon}>{icon}</span>
      <input id={id} className={css.inputField}
        type={type} placeholder={placeholder} value={value}
        autoComplete={autoComplete} required={required} minLength={minLength}
        spellCheck={false} autoCapitalize={type === "email" ? "none" : undefined}
        onChange={e => onChange(e.target.value)} onBlur={onBlur} />
      {showToggle && (
        <button type="button" className={css.inputToggle} onClick={onToggle}
          aria-label={toggleOpen ? "Ocultar contraseña" : "Mostrar contraseña"}>
          {toggleOpen ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
}

/* ─── HeroPanel ────────────────────────────────────────────────── */
function HeroPanel({ paso }: { paso: Paso }) {
  const content = {
    credenciales: {
      kicker: "Portal seguro",
      title: "Tu progreso sigue donde lo dejaste.",
      desc: "Accede a niveles, análisis del mentor IA y sincronización con las gafas de Realidad Mixta.",
      fn: ".continuar();", comment: "// progreso · realidad mixta · compilador",
    },
    canal: {
      kicker: "Verificación 2FA",
      title: "Elige cómo confirmar que eres tú.",
      desc: "Un código temporal de un solo uso garantiza que nadie más accede a tu espacio en AlgoLab.",
      fn: ".elegirCanal();", comment: "// correo UCC · SMS · OTP de 6 dígitos",
    },
    codigo: {
      kicker: "Segundo factor activo",
      title: "Confirma tu identidad digital.",
      desc: "Escribe el código que te enviamos. Solo tú lo tienes. Solo funciona ahora.",
      fn: ".verificar();", comment: "// JWT generado al validarse · sesión cifrada",
    },
  };
  const s = content[paso];
  return (
    <div className="auth-story">
      <AnimatePresence mode="wait">
        <motion.div key={paso}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.32, ease: "easeOut" }}>
          <span className="section-kicker">{s.kicker}</span>
          <h1 className="mt-3">{s.title}</h1>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "#6b8a82", maxWidth: "360px" }}>{s.desc}</p>
        </motion.div>
      </AnimatePresence>
      <div className="auth-code mt-8">
        <span>sesion</span>
        <strong>{s.fn}</strong>
        <small>{s.comment}</small>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
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
  const [dir, setDir] = useState(1);

  const [enviando, setEnviando] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [avisoSesion, setAvisoSesion] = useState("");
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

  const errCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const completo = codigo.every(Boolean);
  const segsExp = Math.max(0, Math.ceil((expiraEn - ahora) / 1000));
  const segsRenv = Math.max(0, Math.ceil((reenvioEn - ahora) / 1000));
  const prgTiempo = Math.max(0, Math.min(100, (segsExp / expTotal) * 100));

  const destino = useMemo(() => {
    if (desafio?.destinoEnmascarado) return desafio.destinoEnmascarado;
    return correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo";
  }, [correo, desafio?.destinoEnmascarado]);

  function navTo(next: Paso, d: number) { setDir(d); setPaso(next); setMsg(null); }

  useEffect(() => {
    if (!hydrated || !existingToken || !usuario) return;
    const ctrl = new AbortController();
    fetch("/api/me", { headers: { Authorization: `Bearer ${existingToken}` }, cache: "no-store", signal: ctrl.signal })
      .then(r => {
        if (r.ok) { router.replace(usuario.rol === "ADMINISTRADOR" ? "/administrador" : usuario.rol === "DOCENTE" ? "/docente" : "/estudiante"); return; }
        if (r.status === 401) setAvisoSesion("Sesión anterior detectada. Reingresa o cambia de cuenta.");
        else setAvisoSesion("No se pudo verificar tu sesión. Tus datos están guardados.");
      }).catch((e: unknown) => { if (e instanceof DOMException && e.name === "AbortError") return; setAvisoSesion("Sin conexión. Sesión local intacta."); });
    return () => ctrl.abort();
  }, [hydrated, existingToken, usuario, router]);

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

  function validarCredenciales(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCorreoTocado(true);
    const email = normalizeInstitutionalEmail(correo);
    const eE = institutionalEmailError(email);
    if (eE) { setMsg({ texto: eE, tono: "error" }); emailRef.current?.focus(); return; }
    if (!pass) { setMsg({ texto: "Ingresa tu contraseña.", tono: "error" }); return; }
    setCorreo(email);
    navTo("canal", 1);
  }

  async function enviarCodigo() {
    setEnviando(true); setMsg(null);
    try {
      const email = normalizeInstitutionalEmail(correo);
      const r = await fetch("/api/iniciar-sesion", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, contrasena: pass, canal }),
      });
      const data = await rj<DesafioRespuesta>(r);
      if (!r.ok || !data.desafioId) {
        const fallback = r.status === 401 ? "Correo o contraseña incorrectos." : (data.mensaje ?? "No se pudo enviar el código.");
        setMsg({ texto: fallback, tono: "error" });
        return;
      }
      const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
      const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
      const ts = Date.now();
      setDesafio(data); setExpTotal(exp); setExpiraEn(ts + exp * 1000); setReenvioEn(ts + resend * 1000); setAhora(ts);
      setCodigo([...EMPTY6]); setIntentosRest(null); setBloqueado(false); setOtpKey(k => k + 1);
      navTo("codigo", 1);
      setMsg({ texto: canal === "SMS" ? "Código enviado por SMS 📱" : "Código enviado a tu correo 📧", tono: "exito" });
    } catch {
      const ts = Date.now();
      setExpTotal(300); setExpiraEn(ts + 300_000); setReenvioEn(ts + 30_000); setAhora(ts);
      setCodigo([...EMPTY6]); setOtpKey(k => k + 1); navTo("codigo", 1);
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

  async function verificarCodigo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!completo || bloqueado || segsExp <= 0) { if (segsExp <= 0) setMsg({ texto: "El código expiró. Solicita uno nuevo.", tono: "aviso" }); return; }
    setVerificando(true); setMsg(null);
    try {
      const r = await fetch("/api/segundo-factor/verificar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio?.desafioId ?? "demo", codigo: codigo.join("") }),
      });
      const data = await rj<LoginRespuesta>(r);
      if (!r.ok || !data.token || !data.usuario) {
        const m = data.mensaje ?? "Código incorrecto.";
        const rem = extractNum(m, /intentos restantes:\s*(\d+)/i);
        if (rem !== null) setIntentosRest(rem);
        if (r.status === 429) setBloqueado(true);
        setCodigo([...EMPTY6]); setOtpKey(k => k + 1);
        requestAnimationFrame(() => codeRefs.current[0]?.focus());
        setMsg({ texto: m, tono: "error" }); return;
      }
      saveAuthToken(data.token); saveAuthUser(data.usuario);
      router.replace(data.usuario.rol === "ADMINISTRADOR" ? "/administrador" : data.usuario.rol === "DOCENTE" ? "/docente" : "/estudiante");
    } catch {
      setMsg({ texto: "Error de conexión. Intenta de nuevo.", tono: "aviso" });
    } finally { setVerificando(false); }
  }

  async function reenviar() {
    if (!desafio?.desafioId || segsRenv > 0 || reenviando || bloqueado) return;
    setReenviando(true); setMsg(null);
    try {
      const r = await fetch("/api/segundo-factor/reenviar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio.desafioId }),
      });
      const data = await rj<DesafioRespuesta>(r);
      if (r.ok && data.desafioId) {
        const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
        const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
        const ts = Date.now();
        setDesafio(data); setExpTotal(exp); setExpiraEn(ts + exp * 1000); setReenvioEn(ts + resend * 1000); setAhora(ts);
      } else { setReenvioEn(Date.now() + 30_000); }
      setCodigo([...EMPTY6]); setOtpKey(k => k + 1);
      setMsg({ texto: "Nuevo código enviado a " + destino, tono: "exito" });
    } catch {
      setReenvioEn(Date.now() + 30_000); setCodigo([...EMPTY6]); setOtpKey(k => k + 1);
      setMsg({ texto: "Código reenviado.", tono: "exito" });
    } finally { setReenviando(false); }
  }

  const sbs = (d: number) => rm ? {} : {
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
        <HeroPanel paso={paso} />

        <motion.div className={`auth-card ${css.securityCard} relative`}
          initial={{ opacity: 0, scale: rm ? 1 : 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
          <div aria-hidden className={css.cardCircuit} />
          <Stepper paso={paso} />

          <AnimatePresence mode="wait" custom={dir}>
            {/* ══ CREDENCIALES ══ */}
            {paso === "credenciales" && (
              <motion.div key="creds" {...sbs(dir)}>
                <p className="section-kicker">Acceso institucional</p>
                <h2>Iniciar sesión</h2>
                <p className="auth-copy">Ingresa tus credenciales UCC para continuar al portal.</p>

                {avisoSesion && (
                  <div className={css.savedSessionNotice} role="status">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>Sesión local protegida</strong>
                      <p>{avisoSesion}</p>
                      <button type="button" onClick={() => { clearAuthSession(); setAvisoSesion(""); }}>Cambiar de cuenta</button>
                    </div>
                  </div>
                )}

                <form className="mt-6 space-y-4" onSubmit={validarCredenciales} noValidate>
                  <div>
                    <label className="field-label" htmlFor="le">Correo institucional</label>
                    <FInput id="le" icon={<Mail size={18} />} type="email"
                      placeholder="nombre.apellido@campusucc.edu.co"
                      value={correo} onChange={v => { setCorreo(v); if (correoTocado) setMsg(null); }}
                      onBlur={() => setCorreoTocado(true)}
                      autoComplete="email" required hasError={Boolean(errCorreo)} />
                    <small className={errCorreo ? css.fieldError : css.fieldHelp}>
                      {errCorreo || "Solo cuentas @campusucc.edu.co"}
                    </small>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="lp">Contraseña</label>
                    <FInput id="lp" icon={<LockKeyhole size={18} />}
                      type={verPass ? "text" : "password"}
                      placeholder="••••••••" value={pass} onChange={setPass}
                      autoComplete="current-password" required minLength={6}
                      showToggle toggleOpen={verPass} onToggle={() => setVerPass(v => !v)} />
                  </div>
                  <button className="primary-button flex w-full items-center justify-center gap-2 mt-3"
                    disabled={enviando || !pass || (correoTocado && !isInstitutionalEmail(correo))} type="submit">
                    {enviando ? <RefreshCw className={css.spinning} size={18} /> : <Zap size={18} />}
                    {enviando ? "Verificando credenciales…" : "Continuar →"}
                  </button>
                </form>
                <p className="auth-switch mt-5">¿No tienes cuenta? <Link href="/registrarse">Créala gratis aquí</Link></p>
              </motion.div>
            )}

            {/* ══ CANAL ══ */}
            {paso === "canal" && (
              <motion.div key="canal" {...sbs(dir)}>
                <button className={css.backButton} type="button" onClick={() => navTo("credenciales", -1)}>
                  <ArrowLeft size={14} /> Volver
                </button>
                <p className="section-kicker">Verificación en dos pasos</p>
                <h2>¿Cómo recibes el código?</h2>
                <p className="auth-copy">Selecciona el canal para tu código temporal de seguridad.</p>

                <div className="mt-6 space-y-3">
                  <button type="button" role="radio" aria-checked={canal === "CORREO"} onClick={() => setCanal("CORREO")}
                    className={`${css.channelCard} ${canal === "CORREO" ? css.channelCardActiveMail : ""}`}>
                    <div className={css.channelIconWrap}><Mail size={22} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>Correo institucional UCC</p>
                      <p style={{ fontSize: "0.73rem", color: "#6b8a82", marginTop: "0.2rem" }}>
                        {correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2")}
                      </p>
                    </div>
                    {canal === "CORREO" && <CheckCircle2 size={20} style={{ color: "#57eeb2", flexShrink: 0 }} />}
                  </button>
                  <button type="button" role="radio" aria-checked={canal === "SMS"} onClick={() => setCanal("SMS")}
                    className={`${css.channelCard} ${canal === "SMS" ? css.channelCardActiveSms : ""}`}>
                    <div className={css.channelIconWrap}><Smartphone size={22} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.88rem", fontWeight: 700, color: "white" }}>Celular / SMS</p>
                      <p style={{ fontSize: "0.73rem", color: "#6b8a82", marginTop: "0.2rem" }}>Mensaje de texto a tu número registrado</p>
                    </div>
                    {canal === "SMS" && <CheckCircle2 size={20} style={{ color: "#38bdf8", flexShrink: 0 }} />}
                  </button>
                </div>

                <button className="primary-button flex w-full items-center justify-center gap-2 mt-6"
                  type="button" disabled={enviando} onClick={enviarCodigo}>
                  {enviando ? <RefreshCw className={css.spinning} size={18} /> : <ShieldCheck size={18} />}
                  {enviando ? "Enviando código…" : `Enviar código por ${canal === "SMS" ? "SMS" : "Correo"}`}
                </button>
              </motion.div>
            )}

            {/* ══ OTP ══ */}
            {paso === "codigo" && (
              <motion.div key="otp" {...sbs(dir)}>
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

                <form className={css.codeForm} onSubmit={verificarCodigo} noValidate>
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
                      : "El código expira automáticamente por seguridad."}</p>
                  </div>

                  <button className={`primary-button ${css.verifyButton}`}
                    disabled={!completo || verificando || segsExp <= 0 || bloqueado} type="submit">
                    {verificando ? <RefreshCw className={css.spinning} size={18} /> : <ShieldCheck size={18} />}
                    {verificando ? "Verificando identidad…" : completo ? "Abrir mi portal AlgoLab 🚀" : "Ingresa los 6 dígitos"}
                  </button>
                </form>

                <div className={css.resendRow}>
                  <button type="button" disabled={segsRenv > 0 || reenviando || bloqueado} onClick={reenviar}>
                    <RefreshCw className={reenviando ? css.spinning : ""} size={13} />
                    {reenviando ? "Enviando…" : segsRenv > 0 ? `Reenviar en ${segsRenv}s` : "Reenviar código"}
                  </button>
                  <button type="button" onClick={() => navTo("credenciales", -1)}>Cambiar cuenta</button>
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
        </motion.div>
      </section>
    </main>
  );
}
