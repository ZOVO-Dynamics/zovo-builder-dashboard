/**
 * Supprime le contenu binaire (fileData) des documents d'identite plus
 * vieux que IDENTITY_DOCUMENT_RETENTION_DAYS jours, en gardant les
 * metadonnees extraites (hashs, champs OCR, statut) pour l'audit et la
 * detection de doublons. purgedAt est renseigne pour tracer l'operation.
 *
 * A executer TOI-MEME (jamais depuis une session Claude) - manuellement,
 * ou via une tache planifiee (cron/systemd timer) :
 *
 *   IDENTITY_DOCUMENT_RETENTION_DAYS=90 DATABASE_URL=postgres://... \
 *     node scripts/purge-identity-document-images.mjs
 *
 * Par defaut : dry-run. Ajoute --apply pour executer la purge.
 * Par defaut la retention est de 90 jours si IDENTITY_DOCUMENT_RETENTION_DAYS
 * n'est pas definie.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant dans l'environnement.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const RETENTION_DAYS = Number(process.env.IDENTITY_DOCUMENT_RETENTION_DAYS ?? "90");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.identityDocument.findMany({
    where: { uploadedAt: { lt: cutoff }, purgedAt: null },
    select: { id: true, userId: true, type: true, uploadedAt: true },
  });

  console.log(`Retention configuree : ${RETENTION_DAYS} jours (avant le ${cutoff.toISOString()})`);
  console.log(`${candidates.length} document(s) a purger.`);

  if (candidates.length === 0) return;

  if (!APPLY) {
    console.log("\nDry-run (aucune suppression effectuee). Relance avec --apply pour purger.");
    return;
  }

  for (const doc of candidates) {
    await prisma.identityDocument.update({
      where: { id: doc.id },
      data: { fileData: Buffer.alloc(0), purgedAt: new Date() },
    });
    await prisma.identityAuditEvent.create({
      data: { userId: doc.userId, type: "DOCUMENT_PURGED", metadata: { documentType: doc.type } },
    });
  }

  console.log(`\nTermine. ${candidates.length} document(s) purge(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
