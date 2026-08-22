export const ALLOWED_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024; // 8 Mo

// Comptes crees avant le lancement de la verification d'identite : pas de
// verification retroactive, pour ne pas bloquer les comptes existants
// (dont les comptes admin/test) qui n'ont jamais eu a fournir ces documents.
export const IDENTITY_VERIFICATION_LAUNCH_DATE = new Date("2026-08-22T16:00:00.000Z");

export function validateDocumentFile(file: File | null): string | null {
  if (!file || file.size === 0) {
    return "Document manquant";
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
    return "Format non supporte (JPEG, PNG, WEBP ou PDF uniquement)";
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "Fichier trop volumineux (8 Mo maximum)";
  }
  return null;
}
