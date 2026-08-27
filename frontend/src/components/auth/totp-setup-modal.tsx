"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, ShieldCheck, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (codigosRecuperacion: string[]) => void;
  token: string;
};

function mensajeDeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function leerTexto(payload: unknown, campo: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    campo in payload &&
    typeof (payload as Record<string, unknown>)[campo] === "string"
  ) {
    return (payload as Record<string, string>)[campo];
  }

  return undefined;
}

function leerCodigos(payload: unknown) {
  if (typeof payload !== "object" || payload === null || !("codigosRecuperacion" in payload)) {
    return [];
  }

  const codigos = (payload as Record<string, unknown>).codigosRecuperacion;
  return Array.isArray(codigos) && codigos.every((codigo) => typeof codigo === "string")
    ? codigos
    : [];
}

export function TotpSetupModal({ isOpen, onClose, onSuccess, token }: Props) {
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [secretManual, setSecretManual] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [codigo, setCodigo] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [mostrarAyuda, setMostrarAyuda] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelado = false;
    queueMicrotask(() => {
      if (cancelado) return;
      setLoading(true);
      setError("");
      setCodigo(["", "", "", "", "", ""]);
    });

    async function cargarSetup() {
      try {
        const res = await fetch("/api/auth/2fa/totp/setup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const payload: unknown = await res.json().catch(() => null);
          throw new Error(leerTexto(payload, "mensaje") || "Error al iniciar configuración");
        }

        const data: unknown = await res.json();
        if (cancelado) return;

        const otpAuthUri = leerTexto(data, "otpAuthUri") || "";
        setSecretManual(leerTexto(data, "secretClaveManual") || "");

        if (otpAuthUri) {
          const url = await QRCode.toDataURL(otpAuthUri, {
            width: 220,
            margin: 2,
            color: {
              dark: "#0b1329",
              light: "#ffffff",
            },
          });
          if (!cancelado) {
            setQrDataUrl(url);
          }
        }
      } catch (err: unknown) {
        if (!cancelado) {
          setError(mensajeDeError(err, "No se pudo generar el código QR"));
        }
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    }

    cargarSetup();

    return () => {
      cancelado = true;
    };
  }, [isOpen, token]);

  if (!isOpen) return null;

  function handleDigitChange(index: number, val: string) {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const nuevo = [...codigo];
      nuevo[index] = "";
      setCodigo(nuevo);
      return;
    }

    if (clean.length > 1) {
      // Manejar pegado de código completo
      const chars = clean.slice(0, 6).split("");
      const nuevo = [...codigo];
      chars.forEach((c, i) => {
        if (index + i < 6) nuevo[index + i] = c;
      });
      setCodigo(nuevo);
      const nextIdx = Math.min(5, index + chars.length);
      inputsRef.current[nextIdx]?.focus();
      return;
    }

    const nuevo = [...codigo];
    nuevo[index] = clean;
    setCodigo(nuevo);
    setError("");

    if (index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !codigo[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && codigo.join("").length === 6) {
      handleVerificar();
    }
  }

  async function handleVerificar() {
    const codeStr = codigo.join("").trim();
    if (codeStr.length !== 6) {
      setError("Introduce el código de 6 dígitos completo");
      return;
    }

    setVerificando(true);
    setError("");

    try {
      const res = await fetch("/api/auth/2fa/totp/confirmar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ codigo: codeStr }),
      });

      const data: unknown = await res.json();
      const exitoso =
        typeof data === "object" &&
        data !== null &&
        "exitoso" in data &&
        data.exitoso === true;
      if (!res.ok || !exitoso) {
        throw new Error(
          leerTexto(data, "mensaje") || "Código incorrecto. Intenta de nuevo.",
        );
      }

      onSuccess(leerCodigos(data));
    } catch (err: unknown) {
      setError(mensajeDeError(err, "Error al verificar código"));
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-[#0d1628] p-6 shadow-2xl">
        {/* Header con botón cerrar */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Aplicación de seguridad</h3>
              <p className="text-xs text-slate-400">Protege tu cuenta con códigos de seguridad</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="mt-3 text-xs text-slate-400">Generando código QR seguro...</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Pasos simplificados */}
            <div className="space-y-1 text-xs text-slate-300">
              <p className="font-medium text-slate-200">1. Abre tu aplicación de autenticación.</p>
              <p className="font-medium text-slate-200">2. Pulsa &ldquo;+&rdquo; y escanea este código:</p>
            </div>

            {/* QR Centrado */}
            <div className="flex flex-col items-center justify-center">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white p-2.5 shadow-md">
                {qrDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={qrDataUrl} alt="Código QR TOTP" className="h-40 w-40" />
                ) : (
                  <div className="flex h-40 w-40 items-center justify-center text-xs text-slate-500">
                    No se pudo cargar el QR
                  </div>
                )}
              </div>
            </div>

            {/* Paso 3 y Casillas de código */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-200">3. Introduce el código que aparece:</p>
              <div className="flex justify-center gap-1.5">
                {codigo.map((digito, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputsRef.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digito}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="h-10 w-9 rounded-lg border border-white/15 bg-white/5 text-center font-mono text-base font-bold text-white focus:border-emerald-400 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-rose-500/10 p-2 text-center text-xs font-medium text-rose-400">
                {error}
              </p>
            )}

            {/* Botón Verificar */}
            <button
              onClick={handleVerificar}
              disabled={verificando || codigo.join("").length !== 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verificando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Verificar y Activar
                </>
              )}
            </button>

            {/* Sección de Ayuda discreta */}
            <div className="border-t border-white/10 pt-3">
              <button
                onClick={() => setMostrarAyuda(!mostrarAyuda)}
                className="flex w-full items-center justify-between text-left text-[11px] text-slate-400 hover:text-slate-200"
              >
                <span>¿No tienes una aplicación de seguridad?</span>
                {mostrarAyuda ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {mostrarAyuda && (
                <div className="mt-2 space-y-2 rounded-lg bg-white/5 p-2.5 text-[11px] text-slate-300">
                  <p>
                    Puedes usar cualquier aplicación compatible con códigos de verificación desde la tienda de tu dispositivo.
                  </p>
                  {secretManual && (
                    <div className="pt-1">
                      <span className="text-slate-400">¿No puedes escanear el QR? Código manual:</span>
                      <p className="mt-0.5 select-all rounded bg-slate-900 px-2 py-1 font-mono text-[10px] text-emerald-300">
                        {secretManual}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
