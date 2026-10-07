"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BookOpen, RotateCcw, Trash2 } from "lucide-react";

import { AnimatedNotice, ConfirmDialog, PageHead, type Tone } from "@/components/ui";

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
  const [mensaje, setMensajeTexto] = useState("");
  const [mensajeTono, setMensajeTono] = useState<Tone>("success");
  function setMensaje(texto: string, tono: Tone = "success") {
    setMensajeTexto(texto);
    setMensajeTono(tono);
  }

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
      setMensaje(error instanceof Error ? error.message : "No se pudo completar la acción. No se borraron los datos locales.", "error");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHead
        description="Tu perfil, tus resultados y tu foto se guardan en el servidor para sincronizar la web y las gafas. Los borradores de código se guardan en este navegador."
        title="Configuración"
      />

      <AnimatedNotice message={mensaje} tone={mensajeTono} />

      <section className="card overflow-hidden">
        <header className="flex items-start gap-3 border-b border-line/10 p-5">
          <AlertTriangle className="mt-1 shrink-0 text-danger" size={20} />
          <div>
            <h2 className="title-md">Tus datos</h2>
            <p className="muted mt-1 text-sm">Cada acción pide confirmación. Borrar el historial o la cuenta no se puede deshacer.</p>
          </div>
        </header>
        <ul className="settings-list">
          {(["onboarding", "historial", "todo"] as Accion[]).map((accion) => (
            <li key={accion}>
              <div className="min-w-0">
                <h3>{acciones[accion].titulo}</h3>
                <p>{acciones[accion].descripcion}</p>
              </div>
              <button
                className={`btn ${accion === "onboarding" ? "btn-secondary" : "btn-danger"}`}
                onClick={() => { setPendiente(accion); setConfirmacionEscrita(""); }}
                type="button"
              >
                {accion === "onboarding" ? <RotateCcw size={16} /> : <Trash2 size={16} />}
                {accion === "onboarding" ? "Reiniciar" : "Borrar"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <aside className="notice notice-info">
        <BookOpen size={18} />
        <p>El acceso a tus datos requiere una sesión autenticada. ISO/IEC 27004 sirve como referencia para medir y revisar controles de seguridad; esta mención no significa que AlgoLab esté certificado. La eliminación afecta los datos indicados arriba, no los registros que deban conservarse por obligación legal.</p>
      </aside>

      <ConfirmDialog
        busy={procesando}
        confirmDisabled={pendiente === "todo" && confirmacionEscrita !== "BORRAR"}
        confirmLabel={pendiente === "onboarding" ? "Sí, reiniciar" : "Sí, borrar"}
        description={pendiente ? acciones[pendiente].confirmacion : ""}
        onCancel={() => setPendiente(null)}
        onConfirm={() => void confirmar()}
        open={pendiente !== null}
        title={pendiente ? acciones[pendiente].titulo : ""}
        tone={pendiente === "onboarding" ? "primary" : "danger"}
      >
        {pendiente === "todo" ? (
          <label className="field-label mt-5">
            <span>Escribe <strong className="text-danger">BORRAR</strong> para confirmar</span>
            <input autoComplete="off" className="field-input" data-autofocus onChange={(event) => setConfirmacionEscrita(event.target.value)} value={confirmacionEscrita} />
          </label>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
