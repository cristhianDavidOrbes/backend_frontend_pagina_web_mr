export const INSTITUTIONAL_EMAIL_DOMAIN = "@campusucc.edu.co";

const INSTITUTIONAL_EMAIL_PATTERN = /^[^\s@]+@campusucc\.edu\.co$/i;

export function normalizeInstitutionalEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isInstitutionalEmail(value: string) {
  return INSTITUTIONAL_EMAIL_PATTERN.test(normalizeInstitutionalEmail(value));
}

export function institutionalEmailError(value: string) {
  const normalized = normalizeInstitutionalEmail(value);
  if (!normalized) return "Escribe tu correo institucional.";
  if (!isInstitutionalEmail(normalized)) {
    return `Usa una cuenta que termine exactamente en ${INSTITUTIONAL_EMAIL_DOMAIN}.`;
  }
  return "";
}
