import { prisma } from "@/lib/prisma";

export type AuditEventType =
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_ANALYZED"
  | "VERIFICATION_COMPLETED"
  | "ADMIN_DECISION"
  | "DOCUMENT_PURGED"
  | "UPLOAD_REJECTED_SECURITY";

/**
 * Journalise un evenement de verification d'identite. `metadata` ne doit
 * jamais contenir le contenu du fichier ni le texte OCR brut - uniquement
 * des faits structures (type de document, statut resultant, etc.).
 */
export async function logIdentityAuditEvent(
  userId: string,
  type: AuditEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.identityAuditEvent.create({
    data: { userId, type, metadata: (metadata ?? undefined) as never },
  });
}
