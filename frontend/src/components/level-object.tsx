import type { ObjetoNivel } from "@/lib/ruta-mr";

/**
 * Ilustraciones ligeras de los objetos de cada nivel (puerta, vehículo,
 * robot, libros y vinilos). SVG puro: sirven en tarjetas, listas y estados.
 */
export function LevelObject({ objeto, size = 96, muted = false }: { objeto: ObjetoNivel; size?: number; muted?: boolean }) {
  const style = { width: size, height: size, filter: muted ? "grayscale(.85) brightness(.75)" : undefined };
  if (objeto === "puerta") {
    return (
      <svg aria-hidden="true" style={style} viewBox="0 0 96 96">
        <rect fill="#3b4644" height="74" rx="4" width="44" x="26" y="12" />
        <rect fill="#ffd796" height="68" rx="2" width="38" x="29" y="15" />
        <path d="M29 15 L50 20 L50 88 L29 83 Z" fill="#2f9e7a" />
        <path d="M33 24 L46 27 L46 47 L33 44 Z" fill="none" stroke="rgb(0 0 0 / .18)" strokeWidth="2" />
        <path d="M33 52 L46 55 L46 78 L33 75 Z" fill="none" stroke="rgb(0 0 0 / .18)" strokeWidth="2" />
        <circle cx="45" cy="52" fill="#f3d27c" r="2.2" />
        <ellipse cx="48" cy="88" fill="rgb(0 0 0 / .3)" rx="30" ry="4" />
      </svg>
    );
  }
  if (objeto === "vehiculo") {
    return (
      <svg aria-hidden="true" style={style} viewBox="0 0 96 96">
        <ellipse cx="48" cy="72" fill="rgb(0 0 0 / .3)" rx="38" ry="4" />
        <path d="M10 62 L10 52 Q12 46 22 45 L32 44 L42 33 Q45 30 50 30 L66 30 Q71 30 74 34 L82 44 Q88 46 88 52 L88 62 Z" fill="#3d8be0" />
        <path d="M36 44 L44 35 Q46 33 50 33 L57 33 L57 44 Z M60 33 L65 33 Q69 33 71 36 L77 44 L60 44 Z" fill="#bfeaf3" />
        <circle cx="28" cy="63" fill="#16201f" r="9" />
        <circle cx="28" cy="63" fill="#c7d2cf" r="4" />
        <circle cx="72" cy="63" fill="#16201f" r="9" />
        <circle cx="72" cy="63" fill="#c7d2cf" r="4" />
      </svg>
    );
  }
  if (objeto === "robot") {
    return (
      <svg aria-hidden="true" style={style} viewBox="0 0 96 96">
        <ellipse cx="48" cy="90" fill="rgb(0 0 0 / .3)" rx="22" ry="3.5" />
        <path d="M48 14V8" stroke="#ccebf0" strokeLinecap="round" strokeWidth="2.5" />
        <circle cx="48" cy="7" fill="#edf8f7" r="3.5" />
        <rect fill="#7ccfe0" height="26" rx="6" width="34" x="31" y="14" />
        <circle cx="41" cy="25" fill="#f7df64" r="4.5" />
        <circle cx="55" cy="25" fill="#f7df64" r="4.5" />
        <rect fill="#eef9f8" height="4" rx="2" width="16" x="40" y="33" />
        <rect fill="#7ccfe0" height="36" rx="7" width="32" x="32" y="43" />
        <rect fill="#19363a" height="16" rx="3" width="18" x="39" y="56" />
        <path d="M43 61h10M43 65h7" stroke="#61e7ba" strokeLinecap="round" strokeWidth="2" />
        <path d="M27 47v20M69 47v20" stroke="#dbe9e8" strokeLinecap="round" strokeWidth="6" />
        <circle cx="27" cy="46" fill="#f2d84f" r="4.5" />
        <circle cx="69" cy="46" fill="#f2d84f" r="4.5" />
        <path d="M41 80v8M55 80v8" stroke="#dceceb" strokeLinecap="round" strokeWidth="6" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" style={style} viewBox="0 0 96 96">
      <ellipse cx="48" cy="84" fill="rgb(0 0 0 / .3)" rx="36" ry="4" />
      <circle cx="60" cy="50" fill="#1b1b1b" r="28" />
      <circle cx="60" cy="50" fill="none" r="21" stroke="#2a2a2a" strokeWidth="2" />
      <circle cx="60" cy="50" fill="#e2574c" r="9" />
      <circle cx="60" cy="50" fill="#111" r="2" />
      <rect fill="#3d8be0" height="46" rx="3" transform="rotate(-8 31 59)" width="30" x="16" y="36" />
      <rect fill="rgb(0 0 0 / .22)" height="46" rx="2" transform="rotate(-8 31 59)" width="5" x="16" y="36" />
      <rect fill="#f3c74f" height="38" rx="3" width="14" x="40" y="44" />
    </svg>
  );
}
