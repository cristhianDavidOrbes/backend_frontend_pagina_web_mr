export function normalizeInstitutionalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isInstitutionalEmail(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  return /^[^@\s]+@campusucc\.edu\.co$/.test(normalized);
}

export function institutionalEmailError(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  if (!normalized) return "Escribe tu correo electrónico.";
  if (!isInstitutionalEmail(normalized)) {
    return "Usa tu correo institucional terminado en @campusucc.edu.co.";
  }
  return "";
}
