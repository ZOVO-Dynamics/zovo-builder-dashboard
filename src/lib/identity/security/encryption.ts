import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer | null {
  const raw = process.env.IDENTITY_DOCUMENT_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    console.error(
      "IDENTITY_DOCUMENT_ENCRYPTION_KEY doit decoder en exactement 32 octets (base64 d'une cle AES-256) - chiffrement desactive."
    );
    return null;
  }
  return key;
}

/**
 * Chiffre au repos "lorsque disponible" : si IDENTITY_DOCUMENT_ENCRYPTION_KEY
 * n'est pas configuree, retourne le buffer tel quel (log d'avertissement).
 * Format stocke : [iv(12)][authTag(16)][ciphertext].
 */
export function encryptDocument(buffer: Buffer): Buffer {
  const key = getKey();
  if (!key) {
    console.warn("IDENTITY_DOCUMENT_ENCRYPTION_KEY non configuree - document stocke sans chiffrement applicatif.");
    return buffer;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]);
}

export function decryptDocument(stored: Buffer): Buffer {
  const key = getKey();
  if (!key) return stored;

  // Format non chiffre (cle absente au moment du televersement) : rendu tel quel.
  if (stored.length < IV_LENGTH + 16) return stored;

  const iv = stored.subarray(0, IV_LENGTH);
  const authTag = stored.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = stored.subarray(IV_LENGTH + 16);

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    // Donnee non chiffree ou cle incorrecte - retourne tel quel plutot que
    // de faire planter l'affichage admin.
    return stored;
  }
}
