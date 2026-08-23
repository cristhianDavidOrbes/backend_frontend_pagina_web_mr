"use client";

import { useRef, type KeyboardEvent, type ChangeEvent } from "react";

export type ModoEditor = "normal" | "dificil";

type Props = {
  codigo: string;
  onChange: (codigo: string) => void;
  lenguaje: "python" | "java";
  disabled?: boolean;
  modo?: ModoEditor;
  onModoChange?: (modo: ModoEditor) => void;
};

const FONT_MONO = "var(--font-geist-mono, 'Courier New', monospace)";

// Pairs for auto-closing in Modo Normal
const PAIRS: Record<string, string> = {
  "(": ")",
  "[": "]",
  "{": "}",
  '"': '"',
  "'": "'",
};

const CLOSING_CHARS = new Set([")", "]", "}", '"', "'"]);

// Quick symbols for Python and Java (Modo Normal)
const PYTHON_SYMBOLS = [
  { label: "( )", insert: "()", cursorOffset: 1 },
  { label: "{ }", insert: "{}", cursorOffset: 1 },
  { label: "[ ]", insert: "[]", cursorOffset: 1 },
  { label: '" "', insert: '""', cursorOffset: 1 },
  { label: ":", insert: ":", cursorOffset: 1 },
  { label: "print()", insert: "print()", cursorOffset: 6 },
  { label: "def ", insert: "def ", cursorOffset: 4 },
  { label: "class ", insert: "class ", cursorOffset: 6 },
  { label: "self", insert: "self", cursorOffset: 4 },
  { label: "return ", insert: "return ", cursorOffset: 7 },
];

const JAVA_SYMBOLS = [
  { label: "( )", insert: "()", cursorOffset: 1 },
  { label: "{ }", insert: "{}", cursorOffset: 1 },
  { label: "[ ]", insert: "[]", cursorOffset: 1 },
  { label: '" "', insert: '""', cursorOffset: 1 },
  { label: ";", insert: ";", cursorOffset: 1 },
  { label: "sout", insert: "System.out.println();", cursorOffset: 19 },
  { label: "public ", insert: "public ", cursorOffset: 7 },
  { label: "class ", insert: "class ", cursorOffset: 6 },
  { label: "void ", insert: "void ", cursorOffset: 5 },
  { label: "this.", insert: "this.", cursorOffset: 5 },
];

export function CodeEditor({
  codigo,
  onChange,
  lenguaje,
  disabled,
  modo = "normal",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineCount = Math.max(codigo.split("\n").length, 1);

  // Insert helper with cursor positioning
  function insertAtCursor(text: string, cursorOffset?: number) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newCode = codigo.substring(0, start) + text + codigo.substring(end);
    onChange(newCode);
    const targetPos = start + (cursorOffset !== undefined ? cursorOffset : text.length);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = targetPos;
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const isNormal = modo === "normal";

    // ─── TAB KEY (always active for clean indent) ───
    if (e.key === "Tab") {
      e.preventDefault();
      const spaces = "  ";
      insertAtCursor(spaces, 2);
      return;
    }

    // If in Dificil mode, skip all auto-completion logic
    if (!isNormal) {
      return;
    }

    // ─── MODO NORMAL: AUTO-PAIRING & AUTO-CLOSING ───

    // 1. Auto-closing quotes & brackets
    if (PAIRS[e.key]) {
      const open = e.key;
      const close = PAIRS[open];
      const selected = codigo.substring(start, end);

      // If text is selected, wrap the selection: e.g. "texto" -> ("texto")
      if (selected.length > 0) {
        e.preventDefault();
        const wrapped = open + selected + close;
        const newCode = codigo.substring(0, start) + wrapped + codigo.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = start + 1;
          ta.selectionEnd = start + 1 + selected.length;
        });
        return;
      }

      // If typing quote when next character is already that quote, skip over it
      if ((open === '"' || open === "'") && codigo[start] === open) {
        e.preventDefault();
        ta.selectionStart = ta.selectionEnd = start + 1;
        return;
      }

      // Auto-insert pair and place cursor inside
      e.preventDefault();
      const newCode = codigo.substring(0, start) + open + close + codigo.substring(end);
      onChange(newCode);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 1;
      });
      return;
    }

    // 2. Auto-skip closing character if already in front of cursor
    if (CLOSING_CHARS.has(e.key)) {
      if (codigo[start] === e.key) {
        e.preventDefault();
        ta.selectionStart = ta.selectionEnd = start + 1;
        return;
      }
    }

    // 3. Smart Backspace: delete matching pair if cursor is between them
    if (e.key === "Backspace" && start === end && start > 0) {
      const prevChar = codigo[start - 1];
      const nextChar = codigo[start];
      if (PAIRS[prevChar] && PAIRS[prevChar] === nextChar) {
        e.preventDefault();
        const newCode = codigo.substring(0, start - 1) + codigo.substring(start + 1);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start - 1;
        });
        return;
      }
    }

    // 4. Smart Enter / Indentation
    if (e.key === "Enter") {
      const lineStart = codigo.lastIndexOf("\n", start - 1) + 1;
      const currentLine = codigo.substring(lineStart, start);
      const matchIndent = currentLine.match(/^(\s*)/);
      const currentIndent = matchIndent ? matchIndent[1] : "";

      // In Java: if pressing Enter between { and }
      if (codigo[start - 1] === "{" && codigo[start] === "}") {
        e.preventDefault();
        const extraIndent = "  ";
        const insertText = "\n" + currentIndent + extraIndent + "\n" + currentIndent;
        const newCode = codigo.substring(0, start) + insertText + codigo.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 1 + currentIndent.length + extraIndent.length;
        });
        return;
      }

      // In Python: if line ends with ':', indent extra 2 spaces
      if (lenguaje === "python" && currentLine.trimEnd().endsWith(":")) {
        e.preventDefault();
        const extraIndent = "  ";
        const insertText = "\n" + currentIndent + extraIndent;
        const newCode = codigo.substring(0, start) + insertText + codigo.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + insertText.length;
        });
        return;
      }

      // Default: preserve current line's indentation on next line
      if (currentIndent.length > 0) {
        e.preventDefault();
        const insertText = "\n" + currentIndent;
        const newCode = codigo.substring(0, start) + insertText + codigo.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + insertText.length;
        });
        return;
      }
    }
  }

  const quickSymbols = lenguaje === "python" ? PYTHON_SYMBOLS : JAVA_SYMBOLS;

  return (
    <div className="code-editor-shell flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Quick Snippet/Symbol Bar in Modo Normal (Ideal for mobile & desktop) */}
      {modo === "normal" && (
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto border-b border-white/[0.07] bg-white/[0.02] flex-shrink-0 scrollbar-none"
          role="toolbar"
          aria-label="Atajos de autocompletado"
        >
          <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
            <span>⚡</span> Atajos:
          </span>
          {quickSymbols.map((s) => (
            <button
              key={s.label}
              type="button"
              disabled={disabled}
              onClick={() => insertAtCursor(s.insert, s.cursorOffset)}
              className="px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 border border-white/[0.08] transition active:scale-95 flex-shrink-0"
              title={`Insertar ${s.label}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Editor Body: Line numbers + Textarea */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Line numbers */}
        <div className="code-line-numbers" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="code-line-num">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <div className="code-editor-area flex-1 min-h-0">
          <textarea
            ref={textareaRef}
            value={codigo}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            disabled={disabled}
            className="code-textarea"
            style={{ fontFamily: FONT_MONO }}
            aria-label={`Editor de código ${lenguaje} (${modo === "normal" ? "Modo Normal" : "Modo Difícil"})`}
            placeholder={`// Escribe tu código ${lenguaje === "python" ? "Python" : "Java"} aquí...`}
          />
        </div>
      </div>
    </div>
  );
}
