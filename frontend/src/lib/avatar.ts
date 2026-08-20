export const AVATAR_PRESETS = ["orbita", "codigo", "robot", "nucleo"] as const;

export type AvatarPreset = (typeof AVATAR_PRESETS)[number];

export const AVATAR_MAX_INPUT_BYTES = 12 * 1024 * 1024;
export const AVATAR_MAX_OUTPUT_BYTES = 950 * 1024;
export const AVATAR_MAX_DIMENSION = 512;

const MAX_IMAGE_PIXELS = 40_000_000;

export type AvatarNormalizado = {
  archivo: File;
  previewUrl: string;
  dimension: number;
  base64: string;
};

export function isAvatarPreset(value: unknown): value is AvatarPreset {
  return typeof value === "string" && AVATAR_PRESETS.includes(value as AvatarPreset);
}

export function avatarPresetSeguro(value: unknown): AvatarPreset {
  return isAvatarPreset(value) ? value : "orbita";
}

/**
 * Convierte la URL relativa que entrega el backend en una URL pública del BFF.
 * También acepta URLs absolutas y previews locales creados por el navegador.
 */
export function avatarUrlParaCliente(value?: string | null): string | null {
  const avatarUrl = value?.trim();
  if (!avatarUrl) {
    return null;
  }

  if (
    avatarUrl.startsWith("blob:") ||
    avatarUrl.startsWith("data:image/") ||
    /^https:\/\//i.test(avatarUrl) ||
    /^http:\/\/localhost(?::\d+)?\//i.test(avatarUrl)
  ) {
    return avatarUrl;
  }

  const backendAvatar = avatarUrl.match(/^\/api\/usuarios\/(\d+)\/avatar(?:\?(.+))?$/);
  if (backendAvatar) {
    const params = new URLSearchParams({ id: backendAvatar[1] });
    const backendParams = new URLSearchParams(backendAvatar[2] ?? "");
    const version = backendParams.get("v");
    if (version) {
      params.set("v", version);
    }
    return `/api/avatar?${params.toString()}`;
  }

  return avatarUrl.startsWith("/") ? avatarUrl : null;
}

function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(archivo);
    const imagen = new Image();
    imagen.decoding = "async";
    imagen.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(imagen);
    };
    imagen.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("El navegador no pudo leer esta imagen. Prueba con PNG, JPEG o WebP."));
    };
    imagen.src = objectUrl;
  });
}

function canvasAImagen(
  canvas: HTMLCanvasElement,
  mimeType: "image/png" | "image/jpeg",
  calidad?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("No se pudo preparar la imagen seleccionada."));
        }
      },
      mimeType,
      calidad,
    );
  });
}

function prepararFondoParaJpeg(canvas: HTMLCanvasElement) {
  const contexto = canvas.getContext("2d");
  if (!contexto) {
    throw new Error("El navegador no permite procesar imágenes en este momento.");
  }
  contexto.save();
  contexto.globalCompositeOperation = "destination-over";
  contexto.fillStyle = "#0b1220";
  contexto.fillRect(0, 0, canvas.width, canvas.height);
  contexto.restore();
}

/** Recorta al centro, normaliza a formato cuadrado y limita la salida a 512 px/950 KB. */
export async function normalizarAvatar(archivo: File): Promise<AvatarNormalizado> {
  if (!archivo.type.toLowerCase().startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }
  if (archivo.size <= 0) {
    throw new Error("La imagen seleccionada está vacía.");
  }
  if (archivo.size > AVATAR_MAX_INPUT_BYTES) {
    throw new Error("La imagen original no puede superar 12 MB.");
  }

  const imagen = await cargarImagen(archivo);
  const ancho = imagen.naturalWidth;
  const alto = imagen.naturalHeight;
  if (!ancho || !alto || ancho * alto > MAX_IMAGE_PIXELS) {
    throw new Error("La imagen es demasiado grande para procesarla de forma segura.");
  }

  const ladoOrigen = Math.min(ancho, alto);
  const dimension = Math.max(1, Math.min(AVATAR_MAX_DIMENSION, ladoOrigen));
  const origenX = Math.max(0, (ancho - ladoOrigen) / 2);
  const origenY = Math.max(0, (alto - ladoOrigen) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = dimension;
  canvas.height = dimension;
  const contexto = canvas.getContext("2d", { alpha: true });
  if (!contexto) {
    throw new Error("El navegador no permite procesar imágenes en este momento.");
  }

  contexto.imageSmoothingEnabled = true;
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(
    imagen,
    origenX,
    origenY,
    ladoOrigen,
    ladoOrigen,
    0,
    0,
    dimension,
    dimension,
  );

  const prefierePng = archivo.type.toLowerCase() === "image/png";
  let mimeType: "image/png" | "image/jpeg" = prefierePng ? "image/png" : "image/jpeg";
  let blob = prefierePng
    ? await canvasAImagen(canvas, "image/png")
    : await canvasAImagen(canvas, "image/jpeg", 0.88);

  if (blob.size > AVATAR_MAX_OUTPUT_BYTES) {
    mimeType = "image/jpeg";
    prepararFondoParaJpeg(canvas);
    blob = await canvasAImagen(canvas, "image/jpeg", 0.82);
  }
  if (blob.size > AVATAR_MAX_OUTPUT_BYTES) {
    blob = await canvasAImagen(canvas, "image/jpeg", 0.68);
  }
  if (blob.size > AVATAR_MAX_OUTPUT_BYTES) {
    throw new Error("No se pudo reducir la imagen por debajo de 950 KB.");
  }

  const extension = mimeType === "image/png" ? "png" : "jpg";
  const archivoNormalizado = new File([blob], `avatar.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });

  const base64 = canvas.toDataURL(mimeType, 0.85);

  return {
    archivo: archivoNormalizado,
    previewUrl: URL.createObjectURL(blob),
    dimension,
    base64,
  };
}
