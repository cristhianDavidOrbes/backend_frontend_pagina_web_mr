"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type ChangeEvent, type UIEvent } from "react";

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
  kind?: "estructura" | "funcion" | "variable" | "tipo" | "palabra";
};

type SuggestionState = {
  start: number;
  end: number;
  selected: number;
  items: CodeSuggestion[];
};

const PYTHON_SUGGESTIONS: CodeSuggestion[] = [
  { label: "if condición:", detail: "Decisión", insert: "if condicion:\n  pass", cursorOffset: 3, aliases: ["if", "si"], kind: "estructura" },
  { label: "elif condición:", detail: "Otra condición", insert: "elif condicion:\n  pass", cursorOffset: 5, aliases: ["elif"], kind: "estructura" },
  { label: "else:", detail: "Caso alternativo", insert: "else:\n  pass", cursorOffset: 8, aliases: ["else"], kind: "estructura" },
  { label: "while condición:", detail: "Repetir mientras", insert: "while condicion:\n  pass", cursorOffset: 6, aliases: ["while", "mientras"], kind: "estructura" },
  { label: "for elemento in colección:", detail: "Recorrer valores", insert: "for elemento in coleccion:\n  pass", cursorOffset: 4, aliases: ["for", "para"], kind: "estructura" },
  { label: "def función():", detail: "Nueva función", insert: "def funcion():\n  pass", cursorOffset: 4, aliases: ["def", "funcion"], kind: "estructura" },
  { label: "class Clase:", detail: "Nueva clase", insert: "class Clase:\n  pass", cursorOffset: 6, aliases: ["class", "clase"], kind: "estructura" },
  { label: "try / except", detail: "Controlar errores", insert: "try:\n  pass\nexcept Exception:\n  pass", cursorOffset: 7, aliases: ["try", "except"], kind: "estructura" },
  { label: "print()", detail: "Mostrar un resultado", insert: "print()", cursorOffset: 6, kind: "funcion" },
  { label: "input()", detail: "Leer un valor", insert: "input()", cursorOffset: 6, kind: "funcion" },
  { label: "len()", detail: "Obtener longitud", insert: "len()", cursorOffset: 4, kind: "funcion" },
  { label: "range()", detail: "Crear un rango", insert: "range()", cursorOffset: 6, kind: "funcion" },
  { label: "return", detail: "Devolver un valor", insert: "return ", cursorOffset: 7, kind: "palabra" },
  { label: "True", detail: "Valor verdadero", insert: "True", cursorOffset: 4, kind: "palabra" },
  { label: "False", detail: "Valor falso", insert: "False", cursorOffset: 5, kind: "palabra" },
];

const JAVA_SUGGESTIONS: CodeSuggestion[] = [
  {
    label: "System.out.println()",
    detail: "Mostrar un resultado",
    insert: "System.out.println();",
    cursorOffset: 19,
    aliases: ["sout", "system"],
    kind: "funcion",
  },
  { label: "if (condición)", detail: "Decisión", insert: "if (condicion) {\n  \n}", cursorOffset: 4, aliases: ["if", "si"], kind: "estructura" },
  { label: "else", detail: "Caso alternativo", insert: "else {\n  \n}", cursorOffset: 9, aliases: ["else"], kind: "estructura" },
  { label: "while (condición)", detail: "Repetir mientras", insert: "while (condicion) {\n  \n}", cursorOffset: 7, aliases: ["while", "mientras"], kind: "estructura" },
  { label: "for (...) ", detail: "Bucle contado", insert: "for (int i = 0; i < limite; i++) {\n  \n}", cursorOffset: 9, aliases: ["for", "para"], kind: "estructura" },
  { label: "class Clase", detail: "Nueva clase", insert: "class Clase {\n  \n}", cursorOffset: 6, kind: "estructura" },
  { label: "public método", detail: "Nuevo método", insert: "public void metodo() {\n  \n}", cursorOffset: 12, aliases: ["metodo", "method"], kind: "estructura" },
  { label: "public", detail: "Acceso público", insert: "public ", cursorOffset: 7, kind: "palabra" },
  { label: "private", detail: "Acceso privado", insert: "private ", cursorOffset: 8, kind: "palabra" },
  { label: "public static void main", detail: "Método principal", insert: "public static void main(String[] args) {\n  \n}", cursorOffset: 42, aliases: ["main"], kind: "estructura" },
  { label: "return", detail: "Devolver un valor", insert: "return ", cursorOffset: 7, kind: "palabra" },
  { label: "String", detail: "Tipo de texto", insert: "String ", cursorOffset: 7, kind: "tipo" },
  { label: "int", detail: "Tipo entero", insert: "int ", cursorOffset: 4, kind: "tipo" },
  { label: "double", detail: "Tipo decimal", insert: "double ", cursorOffset: 7, kind: "tipo" },
];

const PYTHON_KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else",
  "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not",
  "or", "pass", "raise", "return", "try", "while", "with", "yield", "True", "False", "None",
]);
const PYTHON_BUILTINS = new Set([
  "print", "input", "len", "range", "str", "int", "float", "list", "dict", "set", "tuple", "bool", "super",
  "isinstance", "enumerate", "zip", "min", "max", "sum", "abs", "round", "open",
]);
const JAVA_KEYWORDS = new Set([
  "abstract", "assert", "break", "case", "catch", "class", "const", "continue", "default", "do", "else", "enum",
  "extends", "final", "finally", "for", "if", "implements", "import", "instanceof", "interface", "native", "new",
  "package", "private", "protected", "public", "return", "static", "strictfp", "super", "switch", "synchronized",
  "this", "throw", "throws", "transient", "try", "volatile", "while", "true", "false", "null",
]);
const JAVA_TYPES = new Set([
  "boolean", "byte", "char", "double", "float", "int", "long", "short", "void", "String", "Integer", "Double",
  "Boolean", "Object", "List", "ArrayList", "Map", "HashMap", "Set", "HashSet",
]);

type SyntaxToken = { value: string; type: string };

function dynamicSuggestions(code: string, language: "python" | "java"): CodeSuggestion[] {
  const results = new Map<string, CodeSuggestion>();
  const add = (name: string, kind: "variable" | "funcion", detail: string) => {
    if (!name || results.has(`${kind}:${name}`)) return;
    results.set(`${kind}:${name}`, {
      label: kind === "funcion" ? `${name}()` : name,
      detail,
      insert: kind === "funcion" ? `${name}()` : name,
      cursorOffset: kind === "funcion" ? name.length + 1 : name.length,
      aliases: [name],
      kind,
    });
  };

  if (language === "python") {
    for (const match of code.matchAll(/(?:^|\n)\s*def\s+([A-Za-z_]\w*)\s*\(/g)) add(match[1], "funcion", "Función de tu código");
    for (const match of code.matchAll(/(?:^|\n)\s*([A-Za-z_]\w*)\s*(?::[^=\n]+)?=/g)) add(match[1], "variable", "Variable de tu código");
    for (const match of code.matchAll(/\bfor\s+([A-Za-z_]\w*)\s+in\b/g)) add(match[1], "variable", "Variable del recorrido");
    for (const match of code.matchAll(/\bdef\s+[A-Za-z_]\w*\s*\(([^)]*)\)/g)) {
      match[1].split(",").map((part) => part.trim().split(/[=:]/)[0].trim()).forEach((name) => add(name, "variable", "Parámetro de función"));
    }
  } else {
    for (const match of code.matchAll(/\b(?:public|private|protected|static|final|synchronized|abstract|\s)*\s*(?:void|int|double|float|boolean|String|[A-Z]\w*)\s+([a-zA-Z_]\w*)\s*\(/g)) add(match[1], "funcion", "Método de tu código");
    for (const match of code.matchAll(/\b(?:int|double|float|long|short|byte|boolean|char|String|[A-Z]\w*(?:<[^>]+>)?)\s+([a-zA-Z_]\w*)\b(?!\s*\()/g)) add(match[1], "variable", "Variable de tu código");
  }
  return [...results.values()];
}

function tokenizeCode(code: string, language: "python" | "java"): SyntaxToken[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  let expectDeclaration: "function" | "class" | null = null;

  while (index < code.length) {
    const rest = code.slice(index);
    const whitespace = rest.match(/^\s+/)?.[0];
    if (whitespace) {
      tokens.push({ value: whitespace, type: "plain" });
      index += whitespace.length;
      continue;
    }

    if ((language === "python" && rest.startsWith("#")) || (language === "java" && rest.startsWith("//"))) {
      const value = rest.match(/^[^\n]*/)?.[0] ?? rest;
      tokens.push({ value, type: "comment" });
      index += value.length;
      continue;
    }
    if (language === "java" && rest.startsWith("/*")) {
      const end = rest.indexOf("*/", 2);
      const value = end >= 0 ? rest.slice(0, end + 2) : rest;
      tokens.push({ value, type: "comment" });
      index += value.length;
      continue;
    }

    const string = rest.match(/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/)?.[0];
    if (string) {
      tokens.push({ value: string, type: "string" });
      index += string.length;
      continue;
    }
    const number = rest.match(/^\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?)\b/)?.[0];
    if (number) {
      tokens.push({ value: number, type: "number" });
      index += number.length;
      continue;
    }
    const identifier = rest.match(/^[A-Za-z_]\w*/)?.[0];
    if (identifier) {
      const nextNonSpace = code.slice(index + identifier.length).match(/^\s*(.)/)?.[1] ?? "";
      const previous = tokens.length ? tokens[tokens.length - 1].value : "";
      let type = "variable";
      if (language === "python" && PYTHON_KEYWORDS.has(identifier)) type = "keyword";
      else if (language === "java" && JAVA_KEYWORDS.has(identifier)) type = "keyword";
      else if (language === "python" && PYTHON_BUILTINS.has(identifier)) type = "builtin";
      else if (language === "java" && JAVA_TYPES.has(identifier)) type = "type";
      else if (expectDeclaration === "class" || /^[A-Z]/.test(identifier)) type = "class-name";
      else if (expectDeclaration === "function" || nextNonSpace === "(") type = "function";
      else if (previous === ".") type = nextNonSpace === "(" ? "function" : "property";
      tokens.push({ value: identifier, type });
      expectDeclaration = identifier === "def" ? "function" : identifier === "class" ? "class" : null;
      index += identifier.length;
      continue;
    }

    const char = code[index];
    const type = char === "{" || char === "}" ? "brace-curly"
      : char === "(" || char === ")" ? "brace-round"
        : char === "[" || char === "]" ? "brace-square"
          : /[+\-*/%=!<>:&|.?]/.test(char) ? "operator" : "plain";
    tokens.push({ value: char, type });
    index += 1;
  }
  return tokens;
}

export function CodeEditor({
  codigo,
  onChange,
  lenguaje,
  disabled,
  modo = "normal",
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<SuggestionState | null>(null);
  const lineCount = Math.max(codigo.split("\n").length, 1);
  const highlightedTokens = useMemo(() => tokenizeCode(codigo, lenguaje), [codigo, lenguaje]);
  const discoveredSuggestions = useMemo(() => dynamicSuggestions(codigo, lenguaje), [codigo, lenguaje]);

  function refreshSuggestions(value: string, cursor: number) {
    if (modo !== "normal") {
      setSuggestions(null);
      return;
    }

    const token = value.slice(0, cursor).match(/([A-Za-z_][A-Za-z0-9_.]*)$/)?.[1] ?? "";
    if (token.length < 1) {
      setSuggestions(null);
      return;
    }

    const normalized = token.toLowerCase();
    const source = [...discoveredSuggestions, ...(lenguaje === "python" ? PYTHON_SUGGESTIONS : JAVA_SUGGESTIONS)];
    const unique = new Map<string, CodeSuggestion>();
    source.filter((item) =>
      [item.label, ...(item.aliases ?? [])].some((term) => term.toLowerCase().startsWith(normalized)),
    ).forEach((item) => unique.has(item.label) || unique.set(item.label, item));
    const items = [...unique.values()].slice(0, 6);

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

    // ─── TAB KEY (basic editor behavior in both modes) ───
    if (e.key === "Tab") {
      e.preventDefault();
      const spaces = "  ";
      const selected = codigo.substring(start, end);
      if (selected.includes("\n")) {
        const selectionLineStart = codigo.lastIndexOf("\n", start - 1) + 1;
        const selectedBlock = codigo.substring(selectionLineStart, end);
        const lines = selectedBlock.split("\n");
        const transformed = e.shiftKey
          ? lines.map((line) => line.startsWith(spaces) ? line.slice(spaces.length) : line.replace(/^ /, "")).join("\n")
          : lines.map((line) => spaces + line).join("\n");
        const newCode = codigo.substring(0, selectionLineStart) + transformed + codigo.substring(end);
        const deltaStart = e.shiftKey ? Math.min(spaces.length, codigo.substring(selectionLineStart, start).match(/^ */)?.[0].length ?? 0) : spaces.length;
        onChange(newCode);
        requestAnimationFrame(() => {
          ta.focus();
          ta.selectionStart = Math.max(selectionLineStart, start + (e.shiftKey ? -deltaStart : deltaStart));
          ta.selectionEnd = selectionLineStart + transformed.length;
        });
      } else if (e.shiftKey) {
        const lineStart = codigo.lastIndexOf("\n", start - 1) + 1;
        const beforeCursor = codigo.substring(lineStart, start);
        const remove = beforeCursor.match(/^ {1,2}/)?.[0].length ?? 0;
        if (remove > 0) {
          const newCode = codigo.substring(0, lineStart) + codigo.substring(lineStart + remove);
          onChange(newCode);
          requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = Math.max(lineStart, start - remove); });
        }
      } else {
        insertAtCursor(spaces, 2);
      }
      return;
    }

    // If in Dificil mode, skip all auto-completion logic
    if (!isNormal) {
      return;
    }

    // ─── MODO NORMAL: AUTO-PAIRING & AUTO-CLOSING ───

    // Dedent a closing Java brace when it is typed on an indented empty line.
    if (lenguaje === "java" && e.key === "}" && start === end) {
      const lineStart = codigo.lastIndexOf("\n", start - 1) + 1;
      const beforeCursor = codigo.substring(lineStart, start);
      if (/^\s+$/.test(beforeCursor)) {
        e.preventDefault();
        const newIndent = beforeCursor.slice(0, Math.max(0, beforeCursor.length - 2));
        const newCode = codigo.substring(0, lineStart) + newIndent + "}" + codigo.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart + newIndent.length + 1; });
        return;
      }
    }

    // Python continuation clauses align with their matching block automatically.
    if (lenguaje === "python" && e.key === ":" && start === end) {
      const lineStart = codigo.lastIndexOf("\n", start - 1) + 1;
      const beforeCursor = codigo.substring(lineStart, start);
      const match = beforeCursor.match(/^(\s{2,})(elif\b.*|else|except\b.*|finally)$/);
      if (match) {
        e.preventDefault();
        const aligned = match[1].slice(0, -2) + match[2] + ":";
        const newCode = codigo.substring(0, lineStart) + aligned + codigo.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = lineStart + aligned.length; });
        return;
      }
    }

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

      // A terminating Python statement closes the current block on the next line.
      if (lenguaje === "python" && /^(return|break|continue|pass|raise)\b/.test(currentLine.trim()) && currentIndent.length >= 2) {
        e.preventDefault();
        const nextIndent = currentIndent.slice(0, -2);
        const insertText = "\n" + nextIndent;
        const newCode = codigo.substring(0, start) + insertText + codigo.substring(end);
        onChange(newCode);
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + insertText.length; });
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

  function handleScroll(event: UIEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = target.scrollTop;
      highlightRef.current.scrollLeft = target.scrollLeft;
    }
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = target.scrollTop;
  }

  return (
    <div className="code-editor-shell flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Editor Body: Line numbers + Textarea */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* Line numbers */}
        <div ref={lineNumbersRef} className="code-line-numbers" aria-hidden="true">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="code-line-num">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <div className="code-editor-area flex-1 min-h-0">
          {modo === "normal" ? (
            <div ref={highlightRef} className="code-highlight-layer" aria-hidden="true">
              <pre style={{ fontFamily: FONT_MONO }}>
                {highlightedTokens.map((token, index) => (
                  <span key={`${index}-${token.type}`} className={`syntax-${token.type}`}>{token.value}</span>
                ))}
                {codigo.endsWith("\n") ? "\u200b" : null}
              </pre>
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={codigo}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
              onChange(e.target.value);
              refreshSuggestions(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onClick={(e) => refreshSuggestions(e.currentTarget.value, e.currentTarget.selectionStart)}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            disabled={disabled}
            className={`code-textarea ${modo === "normal" ? "syntax-enabled" : ""}`}
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
                  <span className={`suggestion-kind suggestion-kind-${item.kind ?? "palabra"}`}>{item.kind ?? "palabra"}</span>
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
