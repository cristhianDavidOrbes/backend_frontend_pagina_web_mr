export function normalizeInstitutionalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isInstitutionalEmail(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  return /^[^@\s]+@campusucc\.edu\.co$/.test(normalized);
}

export function institutionalEmailError(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  if (!normalized) return "Escribe tu correo electrónico.";
  if (!isValidEmail(normalized)) {
    return "Ingresa un correo electrónico válido (ej: usuario@gmail.com o usuario@campusucc.edu.co).";
  }
  return "";
}

