export function normalizeInstitutionalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isInstitutionalEmail(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  return normalized.endsWith("@gmail.com") && normalized.length > 10;
}

export function institutionalEmailError(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  if (!normalized) return "Escribe tu correo electrónico.";
  if (!isInstitutionalEmail(normalized)) {
    return "Solo se permiten cuentas de @gmail.com.";
  }
  return "";
}
