"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpen, RotateCcw, Trash2, X } from "lucide-react";

import { apiRequest } from "@/lib/client-api";
import { clearAuthSession, useAuthSession } from "@/lib/use-auth-session";

type Accion = "historial" | "onboarding" | "todo";

const acciones: Record<Accion, { titulo: string; descripcion: string; confirmacion: string }> = {
  historial: {
    titulo: "Borrar historial de datos",
    descripcion: "Elimina tus reportes de aprendizaje del servidor y tus borradores de código de este navegador. Conserva tu perfil, puntaje y niveles superados.",
    confirmacion: "¿Estás seguro de borrar tus reportes y borradores? Esta acción no se puede deshacer.",
  },
  onboarding: {
    titulo: "Reiniciar onboarding",
    descripcion: "Vuelve a ver el recorrido inicial de AlgoLab. No borra tu cuenta ni tu progreso.",
    confirmacion: "¿Estás seguro de reiniciar el recorrido de bienvenida?",
  },
  todo: {
    titulo: "Borrar todos los datos",
    descripcion: "Elimina tu cuenta de estudiante, foto, reportes y progreso del servidor, además de tus datos locales de este navegador. Tendrás que registrarte de nuevo.",
    confirmacion: "¿Estás seguro de eliminar tu cuenta y todos tus datos? Esta acción es permanente.",
  },
};

function borrarClavesLocales(usuarioId: number, todo: boolean) {
  const prefijoBorrador = `oop_draft:${usuarioId}:`;
  for (const clave of Object.keys(localStorage)) {
    if (clave.startsWith(prefijoBorrador) || (todo && [
      `oop_progreso:${usuarioId}`,
      `oop_progreso_sync:${usuarioId}`,
      `algolab_onboarding:${usuarioId}`,
    ].includes(clave))) {
      localStorage.removeItem(clave);
    }
  }
  if (todo) {
    localStorage.removeItem("oop_editor_modo");
    sessionStorage.removeItem("algolab_registro_draft");
  }
}

export default function ConfiguracionEstudiantePage() {
  const router = useRouter();
  const { usuario, token } = useAuthSession();
  const [pendiente, setPendiente] = useState<Accion | null>(null);
  const [confirmacionEscrita, setConfirmacionEscrita] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  async function confirmar() {
    if (!pendiente || !usuario || !token || procesando) return;
    if (pendiente === "todo" && confirmacionEscrita !== "BORRAR") return;
    setProcesando(true);
    setMensaje("");
    try {
      if (pendiente === "onboarding") {
        localStorage.removeItem(`algolab_onboarding:${usuario.id}`);
        router.push("/estudiante/bienvenida");
      } else if (pendiente === "historial") {
        await apiRequest<void>("/api/usuarios/me/historial", token, { method: "DELETE" });
        borrarClavesLocales(usuario.id, false);
        setMensaje("Historial eliminado. Tu cuenta y tu progreso se conservaron.");
      } else {
        await apiRequest<void>("/api/usuarios/me/datos", token, { method: "DELETE" });
        borrarClavesLocales(usuario.id, true);
        clearAuthSession();
        router.replace("/registrarse?datos=eliminados");
      }
      setPendiente(null);
      setConfirmacionEscrita("");
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo completar la acción. No se borraron los datos locales.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[1.75rem] border border-white/10 bg-[#0b1d1b] p-6 sm:p-8">
        <p className="section-kicker">Configuración de la cuenta</p>
        <h2 className="mt-2 text-3xl font-bold text-white">Tus datos, bajo tu control</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">El perfil, los resultados y la foto se guardan en el servidor para sincronizar la web y las gafas. Los borradores de código se guardan en este navegador. Puedes revisar o eliminar cada grupo de datos.</p>
      </section>

      <section className="rounded-[1.75rem] border border-rose-300/25 bg-[#141c1b] p-5 sm:p-7">
        <div className="mb-6 flex items-start gap-3">
          <AlertTriangle className="mt-1 shrink-0 text-rose-300" size={22} />
          <div>
            <h3 className="text-xl font-bold text-rose-200">Zona de datos</h3>
            <p className="mt-1 text-sm text-slate-400">Cada acción pide confirmación. El borrado del historial y de la cuenta no se puede deshacer.</p>
          </div>
        </div>
        <div className="space-y-3">
          {(["historial", "onboarding", "todo"] as Accion[]).map((accion) => (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4 sm:flex-row sm:items-center sm:justify-between" key={accion}>
              <div>
                <h4 className="font-semibold text-white">{acciones[accion].titulo}</h4>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-400">{acciones[accion].descripcion}</p>
              </div>
              <button className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-300/25 bg-rose-300/15 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/25" onClick={() => { setPendiente(accion); setConfirmacionEscrita(""); }} type="button">
                {accion === "onboarding" ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                {accion === "onboarding" ? "Reiniciar" : "Borrar"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[.05] p-5 text-sm leading-6 text-slate-300">
        <div className="flex items-center gap-2 font-semibold text-cyan-100"><BookOpen size={17} /> Nota sobre seguridad</div>
        <p className="mt-2">El acceso a tus datos se restringe mediante una sesión autenticada. ISO/IEC 27004 sirve como referencia para medir y revisar controles de seguridad; esta mención no significa que AlgoLab esté certificado. La eliminación afecta los datos indicados arriba, no los registros que deban conservarse por obligación legal.</p>
      </aside>

      {mensaje && <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white" role="status">{mensaje}</p>}

      {pendiente && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !procesando) setPendiente(null); }}>
          <section aria-labelledby="confirmar-datos" aria-modal="true" className="w-full max-w-lg rounded-3xl border border-rose-300/25 bg-[#0b1919] p-6 shadow-2xl" role="dialog">
            <div className="flex justify-between gap-4"><h3 className="text-xl font-bold text-white" id="confirmar-datos">{acciones[pendiente].titulo}</h3><button aria-label="Cerrar" disabled={procesando} onClick={() => setPendiente(null)} type="button"><X size={20} /></button></div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{acciones[pendiente].confirmacion}</p>
            {pendiente === "todo" && <label className="mt-5 block text-sm text-slate-200">Escribe <strong>BORRAR</strong> para confirmar<input autoFocus className="mt-2 w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-white outline-none focus:border-rose-300" onChange={(event) => setConfirmacionEscrita(event.target.value)} value={confirmacionEscrita} /></label>}
            <div className="mt-6 flex justify-end gap-3"><button className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white" disabled={procesando} onClick={() => setPendiente(null)} type="button">Cancelar</button><button className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={procesando || (pendiente === "todo" && confirmacionEscrita !== "BORRAR")} onClick={confirmar} type="button">{procesando ? "Procesando…" : "Sí, continuar"}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
