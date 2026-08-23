export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeInstitutionalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isInstitutionalEmail(value: string) {
  return EMAIL_PATTERN.test(normalizeInstitutionalEmail(value));
}

export function institutionalEmailError(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  if (!normalized) return "Escribe tu correo electrónico.";
  if (!isInstitutionalEmail(normalized)) {
    return "Ingresa un correo electrónico válido (ej: usuario@gmail.com).";
  }
  return "";
}
