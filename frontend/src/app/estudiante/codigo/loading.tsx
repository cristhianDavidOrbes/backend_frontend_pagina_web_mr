export default function ProgramarPooLoading() {
  return (
    <main className="oop-route-loading" role="status" aria-live="polite">
      <div className="oop-route-loading-card">
        <span className="oop-route-loading-icon" aria-hidden="true">{"</>"}</span>
        <strong>Cargando Programar POO</strong>
        <p>Preparando tus retos y recuperando el progreso…</p>
        <span className="oop-route-loading-track" aria-hidden="true"><i /></span>
      </div>
    </main>
  );
}
