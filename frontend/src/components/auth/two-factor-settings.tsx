"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Shield,
  Smartphone,
  Trash2,
} from "lucide-react";

import { isWebAuthnSupported, registrarPasskeyEnNavegador } from "@/lib/webauthn-client";
import { RecoveryCodesModal } from "./recovery-codes-modal";
import { TotpSetupModal } from "./totp-setup-modal";

type Configuracion2fa = {
  emailHabilitado: boolean;
  emailDisponible: boolean;
  emailDestino: string;
  totpHabilitado: boolean;
  totpConfigurado: boolean;
  passkeyHabilitado: boolean;
  passkeys: { id: number; nombreDispositivo: string; creadoEn: string; ultimoUsoEn?: string }[];
  metodoPreferido: "EMAIL" | "PASSKEY" | "TOTP";
  codigosRecuperacionRestantes: number;
};

type Props = {
  token: string;
};

export function TwoFactorSettings({ token }: Props) {
  const [config, setConfig] = useState<Configuracion2fa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Modales
  const [modalTotpAbierto, setModalTotpAbierto] = useState(false);
  const [modalCodigosAbierto, setModalCodigosAbierto] = useState(false);
  const [nuevosCodigos, setNuevosCodigos] = useState<string[]>([]);

  // Password confirmation modal for sensitive actions
  const [accionSensible, setAccionSensible] = useState<{
    tipo: "desactivar" | "regenerar";
    metodo?: "EMAIL" | "TOTP" | "PASSKEY";
    credencialId?: number;
  } | null>(null);
  const [contrasenaConfirmacion, setContrasenaConfirmacion] = useState("");
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [errorPassword, setErrorPassword] = useState("");

  const [registrandoPasskey, setRegistrandoPasskey] = useState(false);

  async function cargarConfiguracion() {
    try {
      setCargando(true);
      const res = await fetch("/api/auth/2fa/configuracion", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo cargar la configuración 2FA" });
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarConfiguracion();
  }, [token]);

  async function handleCambiarMetodoPreferido(nuevoMetodo: "EMAIL" | "PASSKEY" | "TOTP") {
    try {
      const res = await fetch("/api/auth/2fa/preferido", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ metodo: nuevoMetodo }),
      });
      if (res.ok) {
        setConfig((prev) => (prev ? { ...prev, metodoPreferido: nuevoMetodo } : null));
        setMensaje({ tipo: "exito", texto: "Método preferido actualizado correctamente" });
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error al actualizar método preferido" });
    }
  }

  async function handleConfigurarPasskey() {
    if (!isWebAuthnSupported()) {
      setMensaje({
        tipo: "error",
        texto: "Tu navegador o dispositivo no soporta autenticación biométrica (Passkeys).",
      });
      return;
    }

    setRegistrandoPasskey(true);
    setMensaje(null);

    try {
      // 1. Obtener opciones del backend
      const resOpciones = await fetch("/api/auth/2fa/passkey/registro/opciones", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resOpciones.ok) {
        throw new Error("No se pudieron generar las opciones para Passkey");
      }

      const opciones = await resOpciones.json();

      // 2. Ejecutar WebAuthn en el navegador
      const nombreDisp = window.navigator.userAgent.includes("Windows")
        ? "Windows Hello / Dispositivo"
        : window.navigator.userAgent.includes("Android")
        ? "Biometría Android"
        : window.navigator.userAgent.includes("iPhone") || window.navigator.userAgent.includes("Mac")
        ? "Touch ID / Face ID"
        : "Dispositivo biométrico";

      const credencial = await registrarPasskeyEnNavegador(opciones, nombreDisp);

      // 3. Enviar credencial al backend
      const resVerificar = await fetch("/api/auth/2fa/passkey/registro/verificar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(credencial),
      });

      const data = await resVerificar.json();
      if (!resVerificar.ok || !data.exitoso) {
        throw new Error(data.mensaje || "Error al verificar la credencial");
      }

      setMensaje({ tipo: "exito", texto: "¡Dispositivo biométrico registrado exitosamente!" });
      await cargarConfiguracion();

      if (data.codigosRecuperacion && data.codigosRecuperacion.length > 0) {
        setNuevosCodigos(data.codigosRecuperacion);
        setModalCodigosAbierto(true);
      }
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        setMensaje({ tipo: "error", texto: err.message || "Error al registrar dispositivo biométrico" });
      }
    } finally {
      setRegistrandoPasskey(false);
    }
  }

  async function handleConfirmarAccionSensible() {
    if (!contrasenaConfirmacion) {
      setErrorPassword("Ingresa tu contraseña actual");
      return;
    }

    setProcesandoAccion(true);
    setErrorPassword("");

    try {
      if (accionSensible?.tipo === "desactivar" && accionSensible.metodo) {
        const res = await fetch("/api/auth/2fa/desactivar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            metodo: accionSensible.metodo,
            contrasena: contrasenaConfirmacion,
            credencialId: accionSensible.credencialId,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.exitoso) {
          throw new Error(data.mensaje || "Contraseña incorrecta");
        }

        setMensaje({ tipo: "exito", texto: "Método desactivado correctamente" });
        setAccionSensible(null);
        setContrasenaConfirmacion("");
        await cargarConfiguracion();
      } else if (accionSensible?.tipo === "regenerar") {
        const res = await fetch("/api/auth/2fa/recuperacion/regenerar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ contrasena: contrasenaConfirmacion }),
        });

        const data = await res.json();
        if (!res.ok || !data.exitoso) {
          throw new Error(data.mensaje || "Contraseña incorrecta");
        }

        setAccionSensible(null);
        setContrasenaConfirmacion("");
        await cargarConfiguracion();
        setNuevosCodigos(data.codigosRecuperacion || []);
        setModalCodigosAbierto(true);
      }
    } catch (err: any) {
      setErrorPassword(err.message || "Error al procesar la solicitud");
    } finally {
      setProcesandoAccion(false);
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-12 text-xs text-slate-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-emerald-400" />
        Cargando configuración de seguridad...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Autenticación de Dos Factores (2FA)</h2>
          <p className="text-xs text-slate-400">
            Añade una capa de seguridad adicional a tu cuenta eligiendo tus métodos de verificación.
          </p>
        </div>
      </div>

      {mensaje && (
        <div
          className={`flex items-center gap-2 rounded-xl p-3 text-xs ${
            mensaje.tipo === "exito"
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border border-rose-500/20 bg-rose-500/10 text-rose-300"
          }`}
        >
          {mensaje.tipo === "exito" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Grid de Métodos 2FA */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 1. Huella / Passkey */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d1628]/80 p-5 backdrop-blur-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Fingerprint className="h-5 w-5" />
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  config?.passkeys && config.passkeys.length > 0
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-slate-700/40 text-slate-400"
                }`}
              >
                {config?.passkeys && config.passkeys.length > 0
                  ? `${config.passkeys.length} Registrado(s)`
                  : "No configurado"}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Huella o Dispositivo</h3>
              <p className="mt-1 text-xs text-slate-400">
                Usa Windows Hello, Touch ID, Face ID o la biometría de tu celular.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2 pt-3 border-t border-white/5">
            {config?.passkeys && config.passkeys.length > 0 && (
              <div className="space-y-1.5 pb-2">
                {config.passkeys.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-2 py-1.5 text-[11px]"
                  >
                    <span className="truncate text-slate-200">{p.nombreDispositivo}</span>
                    <button
                      onClick={() =>
                        setAccionSensible({
                          tipo: "desactivar",
                          metodo: "PASSKEY",
                          credencialId: p.id,
                        })
                      }
                      className="ml-2 text-rose-400 hover:text-rose-300"
                      title="Eliminar este dispositivo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleConfigurarPasskey}
              disabled={registrandoPasskey}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 py-2 text-xs font-semibold text-purple-200 transition-all hover:bg-purple-500/20 disabled:opacity-50"
            >
              {registrandoPasskey ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {config?.passkeys && config.passkeys.length > 0
                ? "Añadir otro dispositivo"
                : "Configurar Passkey"}
            </button>
          </div>
        </div>

        {/* 2. Google Authenticator */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d1628]/80 p-5 backdrop-blur-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <Smartphone className="h-5 w-5" />
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  config?.totpConfigurado
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-slate-700/40 text-slate-400"
                }`}
              >
                {config?.totpConfigurado ? "Configurado" : "No configurado"}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Google Authenticator</h3>
              <p className="mt-1 text-xs text-slate-400">
                Genera códigos de 6 dígitos cada 30s sin necesidad de conexión.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5">
            {config?.totpConfigurado ? (
              <button
                onClick={() => setAccionSensible({ tipo: "desactivar", metodo: "TOTP" })}
                className="w-full rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-semibold text-rose-300 transition-all hover:bg-rose-500/20"
              >
                Desactivar TOTP
              </button>
            ) : (
              <button
                onClick={() => setModalTotpAbierto(true)}
                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-500/20"
              >
                Configurar con QR
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sección Inferior: Método Preferido & Códigos de Recuperación */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Selector de Método Preferido */}
        <div className="rounded-2xl border border-white/10 bg-[#0d1628]/80 p-5 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Método 2FA Prioritario</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            El método seleccionado se mostrará en primer lugar al iniciar sesión.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { id: "PASSKEY", label: "Huella" },
              { id: "TOTP", label: "Authenticator" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleCambiarMetodoPreferido(m.id as any)}
                className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                  config?.metodoPreferido === m.id
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Códigos de Recuperación */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0d1628]/80 p-5 backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Códigos de Recuperación</h3>
              </div>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                {config?.codigosRecuperacionRestantes || 0} Disponibles
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Útiles si pierdes acceso a tu correo o dispositivo de autenticación.
            </p>
          </div>

          <div className="mt-3">
            <button
              onClick={() => setAccionSensible({ tipo: "regenerar" })}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-white/10 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerar códigos de respaldo
            </button>
          </div>
        </div>
      </div>

      {/* Modal TOTP Setup */}
      <TotpSetupModal
        isOpen={modalTotpAbierto}
        onClose={() => setModalTotpAbierto(false)}
        onSuccess={(codigos) => {
          setModalTotpAbierto(false);
          setMensaje({ tipo: "exito", texto: "¡Google Authenticator configurado con éxito!" });
          cargarConfiguracion();
          if (codigos && codigos.length > 0) {
            setNuevosCodigos(codigos);
            setModalCodigosAbierto(true);
          }
        }}
        token={token}
      />

      {/* Modal Códigos de Recuperación */}
      <RecoveryCodesModal
        isOpen={modalCodigosAbierto}
        onClose={() => setModalCodigosAbierto(false)}
        codigos={nuevosCodigos}
      />

      {/* Modal de Confirmación de Contraseña para acciones sensibles */}
      {accionSensible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1628] p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Confirmar con tu contraseña</h3>
            <p className="mt-1 text-xs text-slate-400">
              Por tu seguridad, introduce tu contraseña actual para continuar con esta acción.
            </p>

            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={contrasenaConfirmacion}
                onChange={(e) => setContrasenaConfirmacion(e.target.value)}
                placeholder="Tu contraseña actual"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                autoFocus
              />

              {errorPassword && (
                <p className="text-[11px] font-medium text-rose-400">{errorPassword}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setAccionSensible(null);
                    setContrasenaConfirmacion("");
                    setErrorPassword("");
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarAccionSensible}
                  disabled={procesandoAccion || !contrasenaConfirmacion}
                  className="flex-1 rounded-xl bg-emerald-500 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {procesandoAccion ? "Confirmando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
