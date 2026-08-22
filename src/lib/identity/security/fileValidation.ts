export const ALLOWED_DOCUMENT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_DOCUMENT_SIZE_BYTES = 8 * 1024 * 1024; // 8 Mo

const EXTENSION_BY_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

/**
 * Verifie que les octets reels du fichier correspondent bien au type MIME
 * declare (protection contre un fichier renomme/deguise - ex: un .exe
 * renomme en .jpg avec un Content-Type falsifie).
 */
function magicBytesMatchMime(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  switch (mimeType) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    case "image/webp":
      return (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      );
    case "application/pdf":
      return buffer.toString("ascii", 0, 4) === "%PDF";
    default:
      return false;
  }
}

export interface FileValidationInput {
  file: File | null;
  buffer: Buffer;
}

/** Retourne un message d'erreur, ou null si le fichier est valide. */
export function validateUploadedFile({ file, buffer }: FileValidationInput): string | null {
  if (!file || buffer.length === 0) {
    return "Document manquant";
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type)) {
    return "Format non supporte (JPEG, PNG, WEBP ou PDF uniquement)";
  }
  if (buffer.length > MAX_DOCUMENT_SIZE_BYTES) {
    return "Fichier trop volumineux (8 Mo maximum)";
  }

  const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  const expectedExtensions = EXTENSION_BY_MIME[file.type] ?? [];
  if (extension && !expectedExtensions.includes(extension)) {
    return "L'extension du fichier ne correspond pas a son type declare";
  }

  if (!magicBytesMatchMime(buffer, file.type)) {
    return "Le contenu du fichier ne correspond pas au type de document declare";
  }

  return null;
}
