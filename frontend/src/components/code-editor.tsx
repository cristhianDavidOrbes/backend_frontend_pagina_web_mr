"use client";

import { useRef } from "react";

type Props = {
  codigo: string;
  onChange: (codigo: string) => void;
  lenguaje: "python" | "java";
  disabled?: boolean;
};

const FONT_MONO = "var(--font-geist-mono, 'Courier New', monospace)";

export function CodeEditor({ codigo, onChange, lenguaje, disabled }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Derived directly from prop — no useEffect / useState needed
  const lineCount = Math.max(codigo.split("\n").length, 1);

  // Handle Tab key for indentation
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const spaces = "  ";
      const newCode = codigo.substring(0, start) + spaces + codigo.substring(end);
      onChange(newCode);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + spaces.length;
      });
    }
  }

  return (
    <div className="code-editor-shell">
      {/* Line numbers */}
      <div className="code-line-numbers" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className="code-line-num">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Textarea */}
      <div className="code-editor-area">
        <textarea
          ref={textareaRef}
          value={codigo}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          disabled={disabled}
          className="code-textarea"
          style={{ fontFamily: FONT_MONO }}
          aria-label={`Editor de código ${lenguaje}`}
          placeholder={`// Escribe tu código ${lenguaje === "python" ? "Python" : "Java"} aquí...`}
        />
      </div>
    </div>
  );
}
