import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 300; // 5 minutes

function getSecret(): string {
  const secret = process.env.IDENTITY_DOCUMENT_URL_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("IDENTITY_DOCUMENT_URL_SECRET (ou NEXTAUTH_SECRET) doit etre defini pour signer les URLs de documents.");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Jeton signe, a courte duree de vie, pour l'affichage temporaire d'un document par un admin. */
export function generateDocumentViewToken(verificationId: string, documentType: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload = `${verificationId}:${documentType}:${expiresAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyDocumentViewToken(token: string, verificationId: string, documentType: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [tokenVerificationId, tokenDocumentType, expiresAtStr, signature] = decoded.split(":");

    if (tokenVerificationId !== verificationId || tokenDocumentType !== documentType) return false;

    const expiresAt = Number(expiresAtStr);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

    const expectedPayload = `${tokenVerificationId}:${tokenDocumentType}:${expiresAtStr}`;
    const expectedSignature = sign(expectedPayload);

    const a = Buffer.from(signature);
    const b = Buffer.from(expectedSignature);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
