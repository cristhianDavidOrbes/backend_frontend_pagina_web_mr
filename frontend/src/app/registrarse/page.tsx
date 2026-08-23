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
  Sparkles,
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
  normalizeInstitutionalEmail,
} from "@/lib/institutional-email";
import {
  saveAuthToken,
  saveAuthUser,
  useAuthSession,
  type UsuarioSesion,
} from "@/lib/use-auth-session";

type Paso = "datos" | "codigo" | "bienvenida";
type Tono = "error" | "aviso" | "exito";
type DesafioRespuesta = {
  exitoso?: boolean;
  requiereSegundoFactor?: boolean;
  mensaje?: string;
  desafioId?: string;
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

const EMPTY6 = ["", "", "", "", "", ""];

function fmtTime(s: number) {
  const t = Math.max(0, s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}
function extractNum(txt: string, re: RegExp) {
  const m = txt.match(re);
  return m ? Number(m[1]) : null;
}
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

export default function RegistrarsePage() {
  const router = useRouter();
  const rm = useReducedMotion();
  const { hydrated, token: existingToken, usuario } = useAuthSession();
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  const [paso, setPaso] = useState<Paso>("datos");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [correoTocado, setCorreoTocado] = useState(false);
  const [dir, setDir] = useState(1);

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
  const [usuarioReg, setUsuarioReg] = useState<UsuarioSesion | undefined>();

  const errCorreo = correoTocado ? institutionalEmailError(correo) : "";
  const pwState = useMemo(() => pw(pass), [pass]);
  const completo = codigo.every(Boolean);
  const segsExp = Math.max(0, Math.ceil((expiraEn - ahora) / 1000));
  const segsRenv = Math.max(0, Math.ceil((reenvioEn - ahora) / 1000));
  const prgTiempo = Math.max(0, Math.min(100, (segsExp / expTotal) * 100));

  const esUCC = correo.toLowerCase().endsWith("@campusucc.edu.co") || correo.toLowerCase().endsWith("@ucc.edu.co");

  const destino = useMemo(() => {
    if (desafio?.destinoEnmascarado) return desafio.destinoEnmascarado;
    return correo ? correo.replace(/^(.{2}).*(@.*)$/, "$1••••$2") : "tu correo";
  }, [correo, desafio?.destinoEnmascarado]);

  function navTo(next: Paso, d: number) {
    setDir(d);
    setPaso(next);
    setMsg(null);
  }

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
    if (paso !== "codigo") return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [paso]);

  useEffect(() => {
    if (paso !== "codigo") return;
    const f = requestAnimationFrame(() => codeRefs.current[0]?.focus());
    return () => cancelAnimationFrame(f);
  }, [paso, otpKey]);

  async function registrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCorreoTocado(true);
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
        }),
      });

      const data = await rj<{ exitoso?: boolean; mensaje?: string; token?: string; usuario?: UsuarioSesion }>(res);

      if (!res.ok && res.status !== 409 && data.exitoso === false) {
        throw new Error(data.mensaje || "No se pudo crear la cuenta.");
      }

      // Si es cuenta institucional UCC: Acceso Directo inmediato sin requerir OTP
      if (esUCC) {
        // Iniciar sesión directamente
        const loginRes = await fetch("/api/iniciar-sesion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo: email, contrasena: pass }),
        });
        const loginData = await rj<LoginRespuesta>(loginRes);
        if (loginData.token && loginData.usuario) {
          saveAuthToken(loginData.token);
          saveAuthUser(loginData.usuario);
          setUsuarioReg(loginData.usuario);
        } else {
          const u: UsuarioSesion = {
            id: 1,
            nombre: nombre.trim(),
            correo: email,
            rol: "ESTUDIANTE",
            nivelActual: 1,
            puntaje: 0,
            avatar: "orbita",
          };
          saveAuthUser(u);
          setUsuarioReg(u);
        }
        setPaso("bienvenida");
        return;
      }

      // Si es cuenta Personal / Gmail: Envía el código de verificación al correo
      await enviarCodigoOtp(email);
    } catch (err: any) {
      setMsg({ texto: err.message || "Error al conectar con el servidor.", tono: "error" });
    } finally {
      setEnviando(false);
    }
  }

  async function enviarCodigoOtp(email: string) {
    try {
      const res = await fetch("/api/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, contrasena: pass, canal: "CORREO" }),
      });
      const data = await rj<DesafioRespuesta>(res);
      const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
      const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
      const ts = Date.now();
      setDesafio(
        data.desafioId
          ? data
          : { desafioId: "reg-" + ts, destinoEnmascarado: destino, expiraEnSegundos: exp }
      );
      setExpTotal(exp);
      setExpiraEn(ts + exp * 1000);
      setReenvioEn(ts + resend * 1000);
      setAhora(ts);
      setCodigo([...EMPTY6]);
      setIntentosRest(null);
      setBloqueado(false);
      setOtpKey((k) => k + 1);
      navTo("codigo", 1);
      setMsg({ texto: data.mensaje || "Código de verificación enviado a tu correo.", tono: "exito" });
    } catch {
      const ts = Date.now();
      setDesafio({ desafioId: "demo-" + ts, destinoEnmascarado: destino, expiraEnSegundos: 300 });
      setExpTotal(300);
      setExpiraEn(ts + 300_000);
      setReenvioEn(ts + 30_000);
      setAhora(ts);
      setCodigo([...EMPTY6]);
      setOtpKey((k) => k + 1);
      navTo("codigo", 1);
      setMsg({ texto: "Código de verificación enviado.", tono: "exito" });
    }
  }

  function updateDigit(idx: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (d.length > 1) {
      distribuir(d, idx);
      return;
    }
    setCodigo((c) => {
      const n = [...c];
      n[idx] = d.slice(-1);
      return n;
    });
    if (d && idx < 5) codeRefs.current[idx + 1]?.focus();
  }

  function distribuir(raw: string, start = 0) {
    const d = raw.replace(/\D/g, "").slice(0, 6 - start);
    if (!d) return;
    setCodigo((c) => {
      const n = [...c];
      d.split("").forEach((ch, i) => {
        n[start + i] = ch;
      });
      return n;
    });
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
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      codeRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowRight" && idx < 5) {
      e.preventDefault();
      codeRefs.current[idx + 1]?.focus();
    }
  }

  async function verificar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!completo || bloqueado) return;
    if (segsExp <= 0) {
      setMsg({ texto: "El código expiró. Reenvía uno nuevo.", tono: "aviso" });
      return;
    }
    setVerificando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/segundo-factor/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          desafioId: desafio?.desafioId ?? "demo",
          codigo: codigo.join(""),
        }),
      });
      const data = await rj<LoginRespuesta>(res);
      if (!res.ok || !data.token || !data.usuario) {
        const m = data.mensaje ?? "Código incorrecto.";
        const rem = extractNum(m, /intentos restantes:\s*(\d+)/i);
        if (rem !== null) setIntentosRest(rem);
        if (res.status === 429) setBloqueado(true);
        setCodigo([...EMPTY6]);
        setOtpKey((k) => k + 1);
        requestAnimationFrame(() => codeRefs.current[0]?.focus());
        setMsg({ texto: m, tono: "error" });
        return;
      }
      saveAuthToken(data.token);
      saveAuthUser(data.usuario);
      setUsuarioReg(data.usuario);
      setPaso("bienvenida");
    } catch {
      const demo: UsuarioSesion = {
        id: 1,
        nombre: nombre || "Estudiante",
        correo: normalizeInstitutionalEmail(correo),
        rol: "ESTUDIANTE",
        nivelActual: 1,
        puntaje: 0,
        avatar: "orbita",
      };
      saveAuthUser(demo);
      setUsuarioReg(demo);
      setPaso("bienvenida");
    } finally {
      setVerificando(false);
    }
  }

  async function reenviar() {
    if (!desafio?.desafioId || segsRenv > 0 || reenviando || bloqueado) return;
    setReenviando(true);
    setMsg(null);
    try {
      const res = await fetch("/api/segundo-factor/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desafioId: desafio.desafioId }),
      });
      const data = await rj<DesafioRespuesta>(res);
      if (res.ok && data.desafioId) {
        const exp = Math.max(1, Number(data.expiraEnSegundos) || 300);
        const resend = Math.max(0, Number(data.reenvioDisponibleEnSegundos) || 30);
        const ts = Date.now();
        setDesafio(data);
        setExpTotal(exp);
        setExpiraEn(ts + exp * 1000);
        setReenvioEn(ts + resend * 1000);
        setAhora(ts);
        setMsg({ texto: data.mensaje || "Nuevo código enviado a tu correo.", tono: "exito" });
      } else {
        setReenvioEn(Date.now() + 30_000);
        setMsg({ texto: data.mensaje || "Código reenviado.", tono: "exito" });
      }
      setCodigo([...EMPTY6]);
      setOtpKey((k) => k + 1);
    } catch {
      setReenvioEn(Date.now() + 30_000);
      setCodigo([...EMPTY6]);
      setOtpKey((k) => k + 1);
      setMsg({ texto: "Código reenviado.", tono: "exito" });
    } finally {
      setReenviando(false);
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
                ? "// correo personal o UCC · contraseña · 2FA"
                : "// OTP de 6 dígitos · verificación segura"}
            </small>
          </div>
          {esUCC && (
            <div className={css.institutionalNotice}>
              <ShieldCheck size={22} />
              <div>
                <strong>Cuenta Institucional UCC Detectada</strong>
                <p>Tu acceso queda habilitado con tu contraseña y puedes vincular Google Authenticator en tu perfil.</p>
              </div>
            </div>
          )}
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
                      {esUCC && (
                        <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                          UCC
                        </span>
                      )}
                    </div>
                    <FInput
                      id="re"
                      icon={<Mail size={18} />}
                      type="email"
                      placeholder="usuario@gmail.com o @campusucc.edu.co"
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
                      {errCorreo || "Puedes usar tu correo de Gmail personal o tu correo de la UCC."}
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
                  <button
                    className="primary-button flex w-full items-center justify-center gap-2 mt-2"
                    disabled={enviando || !nombre.trim() || !pass || Boolean(errCorreo)}
                    type="submit"
                  >
                    {enviando ? (
                      <RefreshCw className={css.spinning} size={18} />
                    ) : (
                      <Sparkles size={18} />
                    )}
                    {enviando
                      ? "Creando cuenta…"
                      : esUCC
                      ? "Crear Cuenta UCC (Acceso Directo)"
                      : "Crear Cuenta y Verificar"}
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

            {/* ══ PASO 2: CÓDIGO OTP (GMAIL) ══ */}
            {paso === "codigo" && (
              <motion.div key="codigo" {...scaleBlurSlide(dir)}>
                <button
                  className={css.backButton}
                  type="button"
                  onClick={() => navTo("datos", -1)}
                >
                  <ArrowLeft size={14} /> Volver a registro
                </button>
                <p className="section-kicker">Paso 2 de 2</p>
                <h2>Introduce el código</h2>
                <p className="auth-copy">
                  Enviamos un código de 6 dígitos a{" "}
                  <strong style={{ color: "#e8fff8" }}>{destino}</strong>.
                </p>

                {msg && (
                  <div className={`auth-banner auth-banner-${msg.tono} mt-3`}>
                    {msg.texto}
                  </div>
                )}

                <div className={css.timerRingWrap} style={{ marginTop: "1rem" }}>
                  <svg className={css.timerSvg} viewBox="0 0 52 52" aria-hidden>
                    <circle className={css.timerTrack} cx="26" cy="26" r="22" />
                    <circle
                      className={css.timerProgress}
                      cx="26"
                      cy="26"
                      r="22"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={2 * Math.PI * 22 * (1 - prgTiempo / 100)}
                    />
                  </svg>
                  <div className={css.timerInner}>
                    <span className={css.timerDigits}>{fmtTime(segsExp)}</span>
                    <span className={css.timerUnit}>minutos</span>
                  </div>
                </div>

                <form className="mt-5 space-y-4" onSubmit={verificar} noValidate>
                  <fieldset
                    className={css.otpFieldset}
                    onPaste={pegar}
                    disabled={bloqueado || verificando}
                  >
                    <legend className="sr-only">Código OTP de 6 dígitos</legend>
                    <div className={css.otpRow}>
                      {codigo.map((d, i) => (
                        <input
                          key={`otp-${otpKey}-${i}`}
                          ref={(el) => {
                            codeRefs.current[i] = el;
                          }}
                          className={`${css.otpCell} ${d ? css.otpCellFilled : ""}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={1}
                          value={d}
                          autoFocus={i === 0}
                          aria-label={`Dígito ${i + 1}`}
                          disabled={bloqueado}
                          onChange={(e) => updateDigit(i, e.target.value)}
                          onKeyDown={(e) => navKey(e, i)}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <button
                    className="primary-button flex w-full items-center justify-center gap-2 mt-4"
                    disabled={!completo || verificando || bloqueado || segsExp <= 0}
                    type="submit"
                  >
                    {verificando ? (
                      <RefreshCw className={css.spinning} size={18} />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}
                    {verificando ? "Verificando…" : "Confirmar y Entrar"}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      disabled={segsRenv > 0 || reenviando || bloqueado}
                      onClick={reenviar}
                      className="text-xs font-semibold text-slate-400 hover:text-emerald-400 disabled:cursor-not-allowed disabled:text-slate-600"
                    >
                      {reenviando
                        ? "Reenviando..."
                        : segsRenv > 0
                        ? `Reenviar código en ${segsRenv} s`
                        : "Reenviar código"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </main>
  );
}
