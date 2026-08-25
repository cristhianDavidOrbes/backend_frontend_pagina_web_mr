"use client";

import { useRef, useState, type KeyboardEvent, type ChangeEvent } from "react";

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

type CodeSuggestion = {
  label: string;
  detail: string;
  insert: string;
  cursorOffset: number;
  aliases?: string[];
};

type SuggestionState = {
  start: number;
  end: number;
  selected: number;
  items: CodeSuggestion[];
};

const PYTHON_SUGGESTIONS: CodeSuggestion[] = [
  { label: "print()", detail: "Mostrar un resultado", insert: "print()", cursorOffset: 6 },
  { label: "input()", detail: "Leer un valor", insert: "input()", cursorOffset: 6 },
  { label: "len()", detail: "Obtener longitud", insert: "len()", cursorOffset: 4 },
  { label: "range()", detail: "Crear un rango", insert: "range()", cursorOffset: 6 },
  { label: "def funcion():", detail: "Nueva función", insert: "def funcion():\n  pass", cursorOffset: 4 },
  { label: "class Clase:", detail: "Nueva clase", insert: "class Clase:\n  pass", cursorOffset: 6 },
  { label: "return", detail: "Devolver un valor", insert: "return ", cursorOffset: 7 },
];

const JAVA_SUGGESTIONS: CodeSuggestion[] = [
  {
    label: "System.out.println()",
    detail: "Mostrar un resultado",
    insert: "System.out.println();",
    cursorOffset: 19,
    aliases: ["sout", "system"],
  },
  { label: "class Clase", detail: "Nueva clase", insert: "class Clase {\n  \n}", cursorOffset: 6 },
  { label: "public", detail: "Acceso público", insert: "public ", cursorOffset: 7 },
  { label: "private", detail: "Acceso privado", insert: "private ", cursorOffset: 8 },
  { label: "public static void main", detail: "Método principal", insert: "public static void main(String[] args) {\n  \n}", cursorOffset: 42, aliases: ["main"] },
  { label: "return", detail: "Devolver un valor", insert: "return ", cursorOffset: 7 },
];

export function CodeEditor({
  codigo,
  onChange,
  lenguaje,
  disabled,
  modo = "normal",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<SuggestionState | null>(null);
  const lineCount = Math.max(codigo.split("\n").length, 1);

  function refreshSuggestions(value: string, cursor: number) {
    if (modo !== "normal") {
      setSuggestions(null);
      return;
    }

    const token = value.slice(0, cursor).match(/([A-Za-z][A-Za-z0-9_.]*)$/)?.[1] ?? "";
    if (token.length < 2) {
      setSuggestions(null);
      return;
    }

    const normalized = token.toLowerCase();
    const source = lenguaje === "python" ? PYTHON_SUGGESTIONS : JAVA_SUGGESTIONS;
    const items = source.filter((item) =>
      [item.label, ...(item.aliases ?? [])].some((term) => term.toLowerCase().startsWith(normalized)),
    ).slice(0, 4);

    setSuggestions(items.length > 0 ? {
      start: cursor - token.length,
      end: cursor,
      selected: 0,
      items,
    } : null);
  }

  function applySuggestion(item: CodeSuggestion) {
    const ta = textareaRef.current;
    if (!ta || !suggestions) return;
    const newCode = codigo.substring(0, suggestions.start) + item.insert + codigo.substring(suggestions.end);
    const targetPos = suggestions.start + item.cursorOffset;
    onChange(newCode);
    setSuggestions(null);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = targetPos;
    });
  }

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

    if (isNormal && suggestions) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestions((current) => current ? {
          ...current,
          selected: (current.selected + (e.key === "ArrowDown" ? 1 : -1) + current.items.length) % current.items.length,
        } : current);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSuggestions(null);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        applySuggestion(suggestions.items[suggestions.selected]);
        return;
      }
    }

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

  return (
    <div className="code-editor-shell flex flex-col flex-1 min-h-0 overflow-hidden">
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
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              onChange(e.target.value);
              refreshSuggestions(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => refreshSuggestions(e.currentTarget.value, e.currentTarget.selectionStart)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            disabled={disabled}
            className="code-textarea"
            style={{ fontFamily: FONT_MONO }}
            aria-label={`Editor de código ${lenguaje} (${modo === "normal" ? "Modo Normal" : "Modo Difícil"})`}
            placeholder={`// Escribe tu código ${lenguaje === "python" ? "Python" : "Java"} aquí...`}
          />
          {modo === "normal" && suggestions ? (
            <div className="code-suggestion-popover" role="listbox" aria-label="Sugerencias del editor">
              <div className="code-suggestion-title">Sugerencias · Tab para completar</div>
              {suggestions.items.map((item, index) => (
                <button
                  key={`${item.label}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={suggestions.selected === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applySuggestion(item)}
                >
                  <code>{item.label}</code>
                  <span>{item.detail}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
