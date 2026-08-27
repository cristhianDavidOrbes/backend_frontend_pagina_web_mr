"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  MousePointer2,
  Workflow,
} from "lucide-react";

const EXPERIENCIAS = [
  {
    nombre: "Puerta",
    concepto: "Clase y objeto",
    accion: "Giras la manija",
    modelo: "abrir() cambia el estado",
    evidencia: "El diagrama muestra el método utilizado",
  },
  {
    nombre: "Robot",
    concepto: "Encapsulamiento",
    accion: "Conectas el cargador",
    modelo: "cargar() protege la batería",
    evidencia: "La IA explica por qué no se modifica directamente",
  },
  {
    nombre: "Libro",
    concepto: "Abstracción",
    accion: "Clasificas una característica",
    modelo: "Conservas solo lo esencial",
    evidencia: "La clase se completa frente a ti",
  },
] as const;

export function WorkshopSimulator() {
  const [activo, setActivo] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(
      () => setActivo((actual) => (actual + 1) % EXPERIENCIAS.length),
      5200,
    );
    return () => window.clearInterval(id);
  }, []);

  const experiencia = EXPERIENCIAS[activo];

  return (
    <div className="concept-journey" aria-label="Cómo AlgoLab convierte una acción física en aprendizaje">
      <div className="concept-journey-grid" aria-hidden="true" />
      <header className="concept-journey-header">
        <span className="concept-live"><i /> EXPERIENCIA EN TIEMPO REAL</span>
        <span className="concept-level">MISIÓN // {String(activo + 1).padStart(2, "0")}</span>
      </header>

      <div className="concept-journey-title">
        <div className="concept-journey-icon"><BrainCircuit size={24} /></div>
        <div>
          <span>Del objeto al concepto</span>
          <strong>{experiencia.concepto}</strong>
        </div>
      </div>

      <div className="concept-flow">
        <article className="concept-step">
          <span className="concept-step-number">01</span>
          <MousePointer2 size={22} />
          <small>ACCIÓN FÍSICA</small>
          <strong>{experiencia.accion}</strong>
        </article>
        <ArrowRight className="concept-arrow" aria-hidden="true" />
        <article className="concept-step is-primary">
          <span className="concept-step-number">02</span>
          <Boxes size={22} />
          <small>LÓGICA POO</small>
          <strong>{experiencia.modelo}</strong>
        </article>
        <ArrowRight className="concept-arrow" aria-hidden="true" />
        <article className="concept-step">
          <span className="concept-step-number">03</span>
          <Workflow size={22} />
          <small>EVIDENCIA VISIBLE</small>
          <strong>{experiencia.evidencia}</strong>
        </article>
      </div>

      <div className="concept-result">
        <CheckCircle2 size={18} />
        <span><strong>Resultado:</strong> entiendes la causa, ves el cambio y recibes una explicación.</span>
      </div>

      <div className="concept-tabs" role="tablist" aria-label="Ejemplos de aprendizaje">
        {EXPERIENCIAS.map((item, index) => (
          <button
            aria-selected={activo === index}
            className={activo === index ? "is-active" : ""}
            key={item.nombre}
            onClick={() => setActivo(index)}
            role="tab"
            type="button"
          >
            <BookOpenCheck size={15} />
            <span>{item.nombre}</span>
            <small>{item.concepto}</small>
          </button>
        ))}
      </div>
    </div>
  );
}
