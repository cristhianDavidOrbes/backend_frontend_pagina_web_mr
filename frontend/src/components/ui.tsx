"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, LoaderCircle, X, XCircle } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { EASE_OUT } from "@/components/reveal";

/* ---------- Encabezado de página ---------- */
export function PageHead({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/* ---------- Métrica ---------- */
export function Stat({
  label,
  value,
  note,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  icon?: ReactNode;
  tone?: "action" | "info" | "progress";
}) {
  const color = tone === "info" ? "text-info" : tone === "progress" ? "text-progress" : tone === "action" ? "text-action" : "";
  return (
    <article className="stat">
      <span className="stat-label">
        {label}
        {icon}
      </span>
      <strong className={`stat-value ${color}`}>{value}</strong>
      {note ? <small className="stat-note">{note}</small> : null}
    </article>
  );
}

/* ---------- Barra de progreso ---------- */
export function ProgressBar({
  value,
  label,
  tone = "progress",
  size,
}: {
  value: number;
  label: string;
  tone?: "progress" | "action";
  size?: "sm";
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safe}
      className={`progress ${tone === "action" ? "progress-action" : ""} ${size === "sm" ? "progress-sm" : ""}`}
      role="progressbar"
    >
      <motion.span
        animate={{ width: `${safe}%` }}
        initial={{ width: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
      />
    </div>
  );
}

/* ---------- Mensajes de estado ---------- */
export type Tone = "success" | "error" | "warning" | "info";

const toneIcon: Record<Tone, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function Notice({
  tone = "info",
  children,
  action,
  onDismiss,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`notice notice-${tone} ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {toneIcon[tone]}
      <div className="min-w-0 flex-1">{children}</div>
      {action ? <div className="notice-action">{action}</div> : null}
      {onDismiss ? (
        <button aria-label="Cerrar mensaje" className="btn btn-ghost btn-icon btn-sm -my-1" onClick={onDismiss} type="button">
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}

/** Mensaje que aparece y desaparece con suavidad sin desplazar el contexto bruscamente. */
export function AnimatedNotice({
  message,
  tone,
  onDismiss,
  action,
  className = "",
}: {
  message: string;
  tone: Tone;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {message ? (
        <motion.div
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
          exit={{ opacity: 0, height: 0 }}
          initial={{ opacity: 0, height: 0 }}
          key={`${tone}-${message}`}
          transition={{ duration: 0.25, ease: EASE_OUT }}
        >
          <div className={className}>
            <Notice action={action} onDismiss={onDismiss} tone={tone}>{message}</Notice>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title?: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      {icon}
      {title ? <strong>{title}</strong> : null}
      {children ? <p className="max-w-md">{children}</p> : null}
    </div>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <LoaderCircle aria-hidden="true" className="animate-spin" size={size} />;
}

/* ---------- Segmentos con indicador deslizante ---------- */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size,
}: {
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm";
}) {
  const id = useId();
  return (
    <div aria-label={label} className={`segmented ${size === "sm" ? "text-sm" : ""}`} role="group">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button aria-pressed={active} key={String(option.value)} onClick={() => onChange(option.value)} type="button">
            {active ? (
              <motion.i className="segmented-pill" layoutId={`seg-${id}`} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            ) : null}
            <span>
              {option.icon}
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Diálogo modal ---------- */
export function Dialog({
  open,
  onClose,
  title,
  children,
  busy = false,
  labelledBy,
  width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  busy?: boolean;
  labelledBy?: string;
  width?: number;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const target = panel?.querySelector<HTMLElement>("[data-autofocus], input, button:not([aria-label='Cerrar'])");
      (target ?? panel)?.focus();
    });

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="modal-backdrop"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) onClose();
          }}
          role="presentation"
          transition={{ duration: 0.2 }}
        >
          <motion.section
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
            aria-modal="true"
            className="modal"
            exit={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
            initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.98 }}
            ref={panelRef}
            role="dialog"
            style={{ width: `min(100%, ${width}px)` }}
            tabIndex={-1}
            transition={{ duration: 0.26, ease: EASE_OUT }}
          >
            {title ? (
              <div className="mb-3 flex items-start justify-between gap-4">
                <h2 className="text-xl" id={titleId}>{title}</h2>
                <button aria-label="Cerrar" className="btn btn-ghost btn-icon btn-sm -mr-2 -mt-1" disabled={busy} onClick={onClose} type="button">
                  <X size={18} />
                </button>
              </div>
            ) : null}
            {children}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Confirmación explícita para acciones destructivas o irreversibles. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
  tone = "danger",
  children,
  confirmDisabled,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "danger" | "primary";
  children?: ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <Dialog busy={busy} onClose={onCancel} open={open} title={title}>
      <div className="muted text-[.95rem] leading-relaxed">{description}</div>
      {children}
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button className="btn btn-secondary" data-autofocus disabled={busy} onClick={onCancel} type="button">
          Cancelar
        </button>
        <button
          className={`btn ${tone === "danger" ? "btn-danger-solid" : "btn-primary"}`}
          disabled={busy || confirmDisabled}
          onClick={onConfirm}
          type="button"
        >
          {busy ? <Spinner /> : null}
          {busy ? "Procesando…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
