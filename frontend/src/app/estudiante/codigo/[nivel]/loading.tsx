export default function RetoPooLoading() {
  return (
    <main className="oop-route-loading" role="status" aria-live="polite">
      <div className="oop-route-loading-card">
        <span className="oop-route-loading-icon" aria-hidden="true">{"{ }"}</span>
        <strong>Cargando laboratorio</strong>
        <p>Preparando la guía, el editor y tu último avance…</p>
        <span className="oop-route-loading-track" aria-hidden="true"><i /></span>
      </div>
    </main>
  );
}
