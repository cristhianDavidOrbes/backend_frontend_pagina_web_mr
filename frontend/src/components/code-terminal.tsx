"use client";

import { useEffect, useRef } from "react";

type TerminalLine =
  | { type: "info"; text: string }
  | { type: "output"; text: string }
  | { type: "error"; text: string }
  | { type: "success"; text: string }
  | { type: "pending" };

type Props = {
  lines: TerminalLine[];
  tiempoMs?: number | null;
};

export type { TerminalLine };

export function CodeTerminal({ lines, tiempoMs }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className="code-terminal">
      <div className="code-terminal-header">
        <span className="terminal-dot red" />
        <span className="terminal-dot yellow" />
        <span className="terminal-dot green" />
        <span className="terminal-title">Terminal</span>
        {tiempoMs != null && (
          <span className="terminal-time">{tiempoMs}ms</span>
        )}
      </div>
      <div className="code-terminal-body">
        {lines.length === 0 ? (
          <p className="terminal-empty">
            Presiona <kbd>▶ Ejecutar</kbd> para ver el resultado aquí
          </p>
        ) : (
          lines.map((line, i) => {
            if (line.type === "pending") {
              return (
                <div key={i} className="terminal-line pending">
                  <span className="terminal-spinner" /> Ejecutando…
                </div>
              );
            }
            return (
              <div key={i} className={`terminal-line ${line.type}`}>
                {line.type === "info" && <span className="terminal-prompt">$</span>}
                {line.type === "error" && <span className="terminal-icon">✗</span>}
                {line.type === "success" && <span className="terminal-icon">✓</span>}
                <pre className="terminal-text">{line.text}</pre>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
