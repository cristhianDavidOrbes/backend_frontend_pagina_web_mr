"use client";

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined" && window.PublicKeyCredential !== undefined;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  if (!window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export async function registrarPasskeyEnNavegador(opciones: {
  challenge: string;
  rpName: string;
  rpId: string;
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: string; alg: number }[];
  authenticatorSelection?: { userVerification?: UserVerificationRequirement; residentKey?: ResidentKeyRequirement };
  excludeCredentials?: { type: string; id: string }[];
  timeout?: number;
  attestation?: string;
}, nombreDispositivo?: string) {
  if (!isWebAuthnSupported()) {
    throw new Error("Tu navegador o dispositivo no soporta autenticación biométrica WebAuthn.");
  }

  const challengeBuffer = base64UrlToBuffer(opciones.challenge);
  const userIdBuffer = base64UrlToBuffer(opciones.user.id);

  const excludeCreds: PublicKeyCredentialDescriptor[] = (opciones.excludeCredentials || []).map(c => ({
    type: "public-key",
    id: base64UrlToBuffer(c.id),
  }));

  const publicKeyOptions: PublicKeyCredentialCreationOptions = {
    challenge: challengeBuffer,
    rp: {
      name: opciones.rpName || "AlgoLab UCC",
      id: opciones.rpId || window.location.hostname,
    },
    user: {
      id: userIdBuffer,
      name: opciones.user.name,
      displayName: opciones.user.displayName,
    },
    pubKeyCredParams: (opciones.pubKeyCredParams || [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ]) as PublicKeyCredentialParameters[],
    authenticatorSelection: {
      userVerification: (opciones.authenticatorSelection?.userVerification || "preferred") as UserVerificationRequirement,
      residentKey: (opciones.authenticatorSelection?.residentKey || "preferred") as ResidentKeyRequirement,
    },
    excludeCredentials: excludeCreds,
    timeout: opciones.timeout || 60000,
    attestation: (opciones.attestation || "none") as AttestationConveyancePreference,
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyOptions,
  }) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("No se pudo registrar la credencial biométrica en tu dispositivo.");
  }

  const rawAttestation = (credential.response as AuthenticatorAttestationResponse).attestationObject;
  const rawClientData = credential.response.clientDataJSON;

  return {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    clientDataJSON: bufferToBase64Url(rawClientData),
    attestationObject: rawAttestation ? bufferToBase64Url(rawAttestation) : "",
    nombreDispositivo: nombreDispositivo || "Dispositivo biométrico",
  };
}

export async function autenticarPasskeyEnNavegador(opciones: {
  challenge: string;
  rpId?: string;
  allowCredentials?: { type: string; id: string }[];
  userVerification?: string;
  timeout?: number;
}) {
  if (!isWebAuthnSupported()) {
    throw new Error("Tu navegador o dispositivo no soporta autenticación biométrica WebAuthn.");
  }

  const challengeBuffer = base64UrlToBuffer(opciones.challenge);
  const allowList: PublicKeyCredentialDescriptor[] = (opciones.allowCredentials || []).map(c => ({
    type: "public-key",
    id: base64UrlToBuffer(c.id),
  }));

  const publicKeyRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge: challengeBuffer,
    rpId: opciones.rpId || window.location.hostname,
    allowCredentials: allowList.length > 0 ? allowList : undefined,
    userVerification: (opciones.userVerification || "preferred") as UserVerificationRequirement,
    timeout: opciones.timeout || 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyRequestOptions,
  }) as PublicKeyCredential | null;

  if (!assertion) {
    throw new Error("No se recibió respuesta del dispositivo biométrico.");
  }

  const response = assertion.response as AuthenticatorAssertionResponse;

  return {
    id: assertion.id,
    rawId: bufferToBase64Url(assertion.rawId),
    clientDataJSON: bufferToBase64Url(response.clientDataJSON),
    authenticatorData: bufferToBase64Url(response.authenticatorData),
    signature: bufferToBase64Url(response.signature),
    userHandle: response.userHandle ? bufferToBase64Url(response.userHandle) : undefined,
  };
}
