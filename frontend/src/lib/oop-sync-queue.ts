import type { LenguajeOOP } from "@/lib/oop-niveles";

export type OopNivelSync = {
  completado: boolean;
  puntos: number;
  intentos: number;
  usoPista: boolean;
};

export type OopSyncPayload = {
  nivel: number;
  lenguaje: LenguajeOOP;
  completado: boolean;
  puntaje: number;
  intentos: number;
  usoPista: boolean;
};

export type OopSyncItem = {
  id: string;
  creadoEn: number;
  intentosSync: number;
  ultimoError?: string;
  payload: OopSyncPayload;
};

function crearId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function payloadIgual(a: OopSyncPayload, b: OopSyncPayload) {
  return (
    a.nivel === b.nivel &&
    a.lenguaje === b.lenguaje &&
    a.completado === b.completado &&
    a.puntaje === b.puntaje &&
    a.intentos === b.intentos &&
    a.usoPista === b.usoPista
  );
}

function itemCubreProgreso(item: OopSyncItem, nivel: number, progreso: OopNivelSync) {
  const payload = item.payload;
  return (
    payload.nivel === nivel &&
    (!progreso.completado || payload.completado) &&
    payload.puntaje >= progreso.puntos &&
    payload.intentos >= progreso.intentos &&
    (!progreso.usoPista || payload.usoPista)
  );
}

export function progresoNecesitaSync(
  local: OopNivelSync,
  remoto?: OopNivelSync,
) {
  if (!remoto) {
    return local.completado || local.puntos > 0 || local.intentos > 0 || local.usoPista;
  }

  return (
    (local.completado && !remoto.completado) ||
    local.puntos > remoto.puntos ||
    local.intentos > remoto.intentos ||
    (local.usoPista && !remoto.usoPista)
  );
}

export function encolarCambioSync(
  cola: OopSyncItem[],
  payload: OopSyncPayload,
  creadoEn = Date.now(),
  id = crearId(),
) {
  if (cola.some((item) => payloadIgual(item.payload, payload))) return cola;
  return [...cola, { id, creadoEn, intentosSync: 0, payload }].sort(
    (a, b) => a.payload.nivel - b.payload.nivel || a.creadoEn - b.creadoEn,
  );
}

/**
 * Migra progreso local previo a la cola offline. Los niveles se agregan en orden
 * para respetar los prerrequisitos del backend al recuperar la conexión.
 */
export function asegurarRecuperacionLocal(
  colaInicial: OopSyncItem[],
  nivelesLocales: Record<string, OopNivelSync>,
  nivelesRemotos: Record<string, OopNivelSync>,
  lenguaje: LenguajeOOP,
) {
  let cola = [...colaInicial];
  const nivelesOrdenados = Object.entries(nivelesLocales).sort(
    ([a], [b]) => Number(a) - Number(b),
  );

  for (const [clave, local] of nivelesOrdenados) {
    const nivel = Number(clave);
    if (!Number.isFinite(nivel) || !progresoNecesitaSync(local, nivelesRemotos[clave])) {
      continue;
    }
    if (cola.some((item) => itemCubreProgreso(item, nivel, local))) continue;

    cola = encolarCambioSync(cola, {
      nivel,
      lenguaje,
      completado: local.completado,
      puntaje: local.puntos,
      intentos: local.intentos,
      usoPista: local.usoPista,
    });
  }

  return cola.sort(
    (a, b) => a.payload.nivel - b.payload.nivel || a.creadoEn - b.creadoEn,
  );
}
