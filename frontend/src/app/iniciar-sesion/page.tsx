"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import css from "@/components/auth-security.module.css";
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
import { autenticarPasskeyEnNavegador, isWebAuthnSupported } from "@/lib/webauthn-client";

type MetodoActivo = "EMAIL" | "PASSKEY" | "TOTP" | "RECOVERY";

type Metodos2faInfo = {
  requiere2fa: boolean;
  sessionToken: string;
  metodoPreferido: "EMAIL" | "PASSKEY" | "TOTP";
  email: {
    enabled: boolean;
    available: boolean;
    destinoEnmascarado: string;
  };
  passkey: {
    enabled: boolean;
    registered: boolean;
    totalDispositivos: number;
    nombresDispositivos: string[];
  };
  totp: {
    enabled: boolean;
    configured: boolean;
  };
  codigosRecuperacionDisponibles: boolean;
};

export default function IniciarSesionPage() {
  const router = useRouter();
  const { hydrated, token: existingToken, usuario } = useAuthSession();

  // Estados del formulario inicial
  const [correo, setCorreo] = useState("");
  const [pass, setPass] = useState("");
  const [verPass, setVerPass] = useState(false);
  const [correoTocado, setCorreoTocado] = useState(false);
  const [cargandoLogin, setCargandoLogin] = useState(false);
  const [errorLogin, setErrorLogin] = useState("");

  // Estado de sesión 2FA
  const [enPaso2FA, setEnPaso2FA] = useState(false);
  const [info2fa, setInfo2fa] = useState<Metodos2faInfo | null>(null);
  const [metodoActivo, setMetodoActivo] = useState<MetodoActivo>("EMAIL");

  // Estado del OTP Email / TOTP
  const [otpDigitos, setOtpDigitos] = useState(["", "", "", "", "", ""]);
  const [codigoRecuperacion, setCodigoRecuperacion] = useState("");
  const [verificando2fa, setVerificando2fa] = useState(false);
  const [error2fa, setError2fa] = useState("");
  const [mensaje2fa, setMensaje2fa] = useState("");

  // Temporizador para reenvío de Email OTP
  const [segundosReenvio, setSegundosReenvio] = useState(0);
  const [reenviandoEmail, setReenviandoEmail] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Redirección si ya está autenticado
  useEffect(() => {
    if (!hydrated || !existingToken || !usuario) return;
    const destino =
      usuario.rol === "ADMINISTRADOR"
        ? "/administrador"
        : usuario.rol === "DOCENTE"
        ? "/docente"
        : "/estudiante";
    router.replace(destino);
  }, [hydrated, existingToken, usuario, router]);

  // Manejo del contador de reenvío
  useEffect(() => {
    if (segundosReenvio <= 0) return;
    const t = setInterval(() => setSegundosReenvio((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [segundosReenvio]);

  // Autofoco al cambiar de método
  useEffect(() => {
    if (enPaso2FA && (metodoActivo === "EMAIL" || metodoActivo === "TOTP")) {
      setOtpDigitos(["", "", "", "", "", ""]);
      setError2fa("");
      setMensaje2fa("");
      const f = requestAnimationFrame(() => otpInputsRef.current[0]?.focus());
      return () => cancelAnimationFrame(f);
    }
  }, [enPaso2FA, metodoActivo]);

  async function handleLoginInicial(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCorreoTocado(true);
    const emailNorm = normalizeInstitutionalEmail(correo);
    const err = institutionalEmailError(emailNorm);
    if (err) {
      setErrorLogin(err);
      return;
    }
    if (!pass) {
      setErrorLogin("Ingresa tu contraseña.");
      return;
    }

    setCargandoLogin(true);
    setErrorLogin("");

    try {
      const res = await fetch("/api/auth/2fa/iniciar-sesion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: emailNorm, contrasena: pass }),
      });

      const data = await res.json();

      if (!res.ok || !data.exitoso) {
        throw new Error(data.mensaje || "Correo o contraseña incorrectos.");
      }

      // Caso 1: Usuario no tiene 2FA -> Login inmediato
      if (!data.requiere2fa && data.token && data.usuario) {
        saveAuthToken(data.token);
        saveAuthUser(data.usuario);
        const destino =
          data.usuario.rol === "ADMINISTRADOR"
            ? "/administrador"
            : data.usuario.rol === "DOCENTE"
            ? "/docente"
            : "/estudiante";
        router.replace(destino);
        return;
      }

      // Caso 2: Usuario requiere 2FA
      if (data.requiere2fa && data.dosFactores) {
        const info = data.dosFactores as Metodos2faInfo;
        setInfo2fa(info);
        setEnPaso2FA(true);

        // Determinar método inicial según preferencia y disponibilidad
        let metodoInicial: MetodoActivo = "EMAIL";
        if (info.metodoPreferido === "PASSKEY" && info.passkey.registered) {
          metodoInicial = "PASSKEY";
        } else if (info.metodoPreferido === "TOTP" && info.totp.configured) {
          metodoInicial = "TOTP";
        } else if (info.email.enabled && info.email.available) {
          metodoInicial = "EMAIL";
          setSegundosReenvio(45);
        } else if (info.passkey.registered) {
          metodoInicial = "PASSKEY";
        } else if (info.totp.configured) {
          metodoInicial = "TOTP";
        } else if (info.codigosRecuperacionDisponibles) {
          metodoInicial = "RECOVERY";
        }
        setMetodoActivo(metodoInicial);
      }
    } catch (err: any) {
      setErrorLogin(err.message || "Error al conectar con el servidor.");
    } finally {
      setCargandoLogin(false);
    }
  }

  function handleOtpChange(index: number, val: string) {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const nuevo = [...otpDigitos];
      nuevo[index] = "";
      setOtpDigitos(nuevo);
      return;
    }

    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split("");
      const nuevo = [...otpDigitos];
      chars.forEach((c, i) => {
        if (index + i < 6) nuevo[index + i] = c;
      });
      setOtpDigitos(nuevo);
      const nextIdx = Math.min(5, index + chars.length);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    const nuevo = [...otpDigitos];
    nuevo[index] = clean;
    setOtpDigitos(nuevo);
    setError2fa("");

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigitos[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && otpDigitos.join("").length === 6) {
      if (metodoActivo === "EMAIL") handleVerificarEmailOtp();
      else if (metodoActivo === "TOTP") handleVerificarTotp();
    }
  }

  async function finalizarLoginExitoso(token: string, usuarioDto: UsuarioSesion) {
    saveAuthToken(token);
    saveAuthUser(usuarioDto);
    const destino =
      usuarioDto.rol === "ADMINISTRADOR"
        ? "/administrador"
        : usuarioDto.rol === "DOCENTE"
        ? "/docente"
        : "/estudiante";
    router.replace(destino);
  }

  async function handleVerificarEmailOtp() {
    const code = otpDigitos.join("").trim();
    if (code.length !== 6) {
      setError2fa("Introduce el código de 6 dígitos completo");
      return;
    }

    setVerificando2fa(true);
    setError2fa("");

    try {
      const res = await fetch("/api/auth/2fa/email/verificar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-2FA-Session-Token": info2fa?.sessionToken || "",
        },
        body: JSON.stringify({
          sessionToken: info2fa?.sessionToken,
          codigo: code,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exitoso) {
        throw new Error(data.mensaje || "Código incorrecto.");
      }

      await finalizarLoginExitoso(data.token, data.usuario);
    } catch (err: any) {
      setError2fa(err.message || "Error al verificar código");
    } finally {
      setVerificando2fa(false);
    }
  }

  async function handleReenviarEmailOtp() {
    if (segundosReenvio > 0) return;
    setReenviandoEmail(true);
    setError2fa("");
    setMensaje2fa("");

    try {
      const res = await fetch("/api/auth/2fa/email/enviar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-2FA-Session-Token": info2fa?.sessionToken || "",
        },
        body: JSON.stringify({ sessionToken: info2fa?.sessionToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.exitoso) {
        throw new Error(data.mensaje || "No se pudo reenviar el código");
      }

      setMensaje2fa("Nuevo código enviado a tu correo institucional.");
      setSegundosReenvio(60);
      setOtpDigitos(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } catch (err: any) {
      setError2fa(err.message || "Error al reenviar código");
    } finally {
      setReenviandoEmail(false);
    }
  }

  async function handleVerificarTotp() {
    const code = otpDigitos.join("").trim();
    if (code.length !== 6) {
      setError2fa("Introduce el código de 6 dígitos de tu aplicación");
      return;
    }

    setVerificando2fa(true);
    setError2fa("");

    try {
      const res = await fetch("/api/auth/2fa/totp/verificar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-2FA-Session-Token": info2fa?.sessionToken || "",
        },
        body: JSON.stringify({
          sessionToken: info2fa?.sessionToken,
          codigo: code,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exitoso) {
        throw new Error(data.mensaje || "Código de autenticación incorrecto.");
      }

      await finalizarLoginExitoso(data.token, data.usuario);
    } catch (err: any) {
      setError2fa(err.message || "Código incorrecto");
    } finally {
      setVerificando2fa(false);
    }
  }

  async function handleAutenticarPasskey() {
    if (!isWebAuthnSupported()) {
      setError2fa("Tu dispositivo o navegador no soporta autenticación biométrica.");
      return;
    }

    setVerificando2fa(true);
    setError2fa("");

    try {
      // 1. Obtener opciones del backend
      const resOpciones = await fetch("/api/auth/2fa/passkey/auth/opciones", {
        method: "POST",
        headers: {
          "X-2FA-Session-Token": info2fa?.sessionToken || "",
        },
      });

      if (!resOpciones.ok) {
        const err = await resOpciones.json().catch(() => ({}));
        throw new Error(err.mensaje || "No se pudieron obtener las opciones biométricas");
      }

      const opciones = await resOpciones.json();

      // 2. Invocar WebAuthn en el navegador (huella, rostro, PIN)
      const credencialAssertion = await autenticarPasskeyEnNavegador(opciones);

      // 3. Verificar con el backend
      const resVerificar = await fetch("/api/auth/2fa/passkey/auth/verificar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-2FA-Session-Token": info2fa?.sessionToken || "",
        },
        body: JSON.stringify({
          ...credencialAssertion,
          sessionToken: info2fa?.sessionToken,
        }),
      });

      const data = await resVerificar.json();
      if (!resVerificar.ok || !data.exitoso) {
        throw new Error(data.mensaje || "Autenticación biométrica fallida.");
      }

      await finalizarLoginExitoso(data.token, data.usuario);
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setError2fa(err.message || "Error al verificar con huella/dispositivo");
      }
    } finally {
      setVerificando2fa(false);
    }
  }

  async function handleVerificarRecuperacion() {
    if (!codigoRecuperacion.trim()) {
      setError2fa("Ingresa un código de recuperación");
      return;
    }

    setVerificando2fa(true);
    setError2fa("");

    try {
      const res = await fetch("/api/auth/2fa/recuperacion/verificar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-2FA-Session-Token": info2fa?.sessionToken || "",
        },
        body: JSON.stringify({
          sessionToken: info2fa?.sessionToken,
          codigo: codigoRecuperacion.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.exitoso) {
        throw new Error(data.mensaje || "Código de recuperación inválido");
      }

      await finalizarLoginExitoso(data.token, data.usuario);
    } catch (err: any) {
      setError2fa(err.message || "Error al validar código de recuperación");
    } finally {
      setVerificando2fa(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a1222]/90 p-8 shadow-2xl backdrop-blur-xl">
        <AnimatePresence mode="wait">
          {!enPaso2FA ? (
            /* ─── PASO 1: CREDENCIALES ──────────────────────────────── */
            <motion.div
              key="credenciales"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <span className="section-kicker">Portal Seguro</span>
                <h1 className="mt-2 text-2xl font-extrabold text-white">Iniciar Sesión</h1>
                <p className="mt-1.5 text-xs text-slate-400">
                  Accede a tus proyectos, compilador interactivo y sincronización de realidad mixta.
                </p>
              </div>

              {errorLogin && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{errorLogin}</span>
                </div>
              )}

              <form onSubmit={handleLoginInicial} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Correo Institucional</label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-emerald-400">
                    <Mail className="mr-2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="usuario@campusucc.edu.co"
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Contraseña</label>
                  <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:border-emerald-400">
                    <LockKeyhole className="mr-2 h-4 w-4 text-slate-400" />
                    <input
                      type={verPass ? "text" : "password"}
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setVerPass(!verPass)}
                      className="text-slate-400 hover:text-white"
                    >
                      {verPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cargandoLogin}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-50"
                >
                  {cargandoLogin ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando credenciales...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </button>
              </form>

              <div className="pt-2 text-center text-xs text-slate-400">
                ¿No tienes una cuenta aún?{" "}
                <Link href="/registrarse" className="font-semibold text-emerald-400 hover:underline">
                  Regístrate aquí
                </Link>
              </div>
            </motion.div>
          ) : (
            /* ─── PASO 2: VERIFICA TU IDENTIDAD (2FA) ──────────────── */
            <motion.div
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setEnPaso2FA(false);
                    setError2fa("");
                  }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Volver
                </button>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  2FA Protegido
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-white">Verifica tu identidad</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Elige cómo quieres confirmar que eres tú.
                </p>
              </div>

              {/* Pestañas / Selector de métodos (Prioridad: 1. Correo, 2. Huella, 3. Google Authenticator) */}
              <div className="flex rounded-xl bg-white/5 p-1 border border-white/5">
                {info2fa?.email.enabled && (
                  <button
                    onClick={() => setMetodoActivo("EMAIL")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                      metodoActivo === "EMAIL"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Correo
                  </button>
                )}

                {info2fa?.passkey.registered && (
                  <button
                    onClick={() => setMetodoActivo("PASSKEY")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                      metodoActivo === "PASSKEY"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Fingerprint className="h-3.5 w-3.5" />
                    Huella
                  </button>
                )}

                {info2fa?.totp.configured && (
                  <button
                    onClick={() => setMetodoActivo("TOTP")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                      metodoActivo === "TOTP"
                        ? "bg-emerald-500 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5" />
                    Authenticator
                  </button>
                )}
              </div>

              {error2fa && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{error2fa}</span>
                </div>
              )}

              {mensaje2fa && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{mensaje2fa}</span>
                </div>
              )}

              {/* ─── VISTA: CORREO ELECTRÓNICO ─────────────────── */}
              {metodoActivo === "EMAIL" && (
                <div className="space-y-4">
                  {info2fa?.email.available ? (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-slate-300">
                          Código de seguridad enviado a:
                        </p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-emerald-400">
                          {info2fa.email.destinoEnmascarado}
                        </p>
                      </div>

                      {/* 6 Casillas OTP */}
                      <div className="flex justify-center gap-2 py-2">
                        {otpDigitos.map((digito, idx) => (
                          <input
                            key={idx}
                            ref={(el) => {
                              otpInputsRef.current[idx] = el;
                            }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digito}
                            onChange={(e) => handleOtpChange(idx, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                            className="h-12 w-11 rounded-xl border border-white/15 bg-white/5 text-center font-mono text-lg font-bold text-white focus:border-emerald-400 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            autoFocus={idx === 0}
                          />
                        ))}
                      </div>

                      <button
                        onClick={handleVerificarEmailOtp}
                        disabled={verificando2fa || otpDigitos.join("").length !== 6}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {verificando2fa ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Verificando...
                          </>
                        ) : (
                          "Verificar e Ingresar"
                        )}
                      </button>

                      {/* Botón Reenviar */}
                      <div className="text-center">
                        <button
                          onClick={handleReenviarEmailOtp}
                          disabled={segundosReenvio > 0 || reenviandoEmail}
                          className="text-xs font-semibold text-slate-400 hover:text-emerald-400 disabled:cursor-not-allowed disabled:text-slate-600"
                        >
                          {reenviandoEmail ? (
                            "Reenviando..."
                          ) : segundosReenvio > 0 ? (
                            `Reenviar código en ${segundosReenvio} s`
                          ) : (
                            "Reenviar código"
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-center text-xs text-amber-200">
                      <p className="font-bold">Correo no disponible temporalmente</p>
                      <p className="mt-1 text-[11px] text-amber-300/80">
                        La cuota de correos está agotada. Elige otro método como Huella, Google Authenticator o Código de Recuperación.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── VISTA: HUELLA O DISPOSITIVO (PASSKEYS) ──────── */}
              {metodoActivo === "PASSKEY" && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 shadow-inner">
                    <Fingerprint className="h-8 w-8" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">Huella o Dispositivo</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Confirma tu identidad mediante el sensor biométrico, Face ID o PIN de tu dispositivo.
                    </p>
                  </div>

                  <button
                    onClick={handleAutenticarPasskey}
                    disabled={verificando2fa}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500 py-3.5 text-xs font-bold text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-400 disabled:opacity-50"
                  >
                    {verificando2fa ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Esperando biometría...
                      </>
                    ) : (
                      <>
                        <Fingerprint className="h-4 w-4" />
                        Usar huella o dispositivo
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ─── VISTA: GOOGLE AUTHENTICATOR ─────────────────── */}
              {metodoActivo === "TOTP" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-white">Google Authenticator</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Introduce el código de 6 dígitos que aparece en tu aplicación.
                    </p>
                  </div>

                  <div className="flex justify-center gap-2 py-2">
                    {otpDigitos.map((digito, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digito}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className="h-12 w-11 rounded-xl border border-white/15 bg-white/5 text-center font-mono text-lg font-bold text-white focus:border-emerald-400 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleVerificarTotp}
                    disabled={verificando2fa || otpDigitos.join("").length !== 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {verificando2fa ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Verificar"
                    )}
                  </button>
                </div>
              )}

              {/* ─── VISTA: CÓDIGO DE RECUPERACIÓN ───────────────── */}
              {metodoActivo === "RECOVERY" && (
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-sm font-bold text-white">Código de Recuperación</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Introduce uno de tus códigos de respaldo de 8 caracteres (ej: AB39-KP27).
                    </p>
                  </div>

                  <input
                    type="text"
                    value={codigoRecuperacion}
                    onChange={(e) => setCodigoRecuperacion(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    className="w-full rounded-xl border border-white/15 bg-white/5 py-3 text-center font-mono text-base font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
                    autoFocus
                  />

                  <button
                    onClick={handleVerificarRecuperacion}
                    disabled={verificando2fa || !codigoRecuperacion.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400 disabled:opacity-50"
                  >
                    {verificando2fa ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Acceder con código de respaldo"
                    )}
                  </button>
                </div>
              )}

              {/* Enlace para usar código de recuperación si no está activo */}
              {metodoActivo !== "RECOVERY" && info2fa?.codigosRecuperacionDisponibles && (
                <div className="pt-2 text-center">
                  <button
                    onClick={() => setMetodoActivo("RECOVERY")}
                    className="flex items-center justify-center gap-1.5 mx-auto text-xs text-slate-400 hover:text-amber-400"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    ¿Problemas para acceder? Usar código de recuperación
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
