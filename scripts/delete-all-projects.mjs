/**
 * Supprime TOUS les projets (table Project) et tout ce qui en depend en
 * cascade : ProjectVersion, RepairJob, AgencyOffer. Les Generation et
 * MarketplaceProduct lies ne sont pas supprimes, seulement detaches
 * (projectId mis a NULL), conformement au schema Prisma.
 *
 * A executer TOI-MEME (jamais depuis une session Claude), avec
 * DATABASE_URL defini dans l'environnement :
 *
 *   DATABASE_URL=postgres://... node scripts/delete-all-projects.mjs
 *
 * Par defaut le script tourne en mode "dry-run" et affiche seulement ce
 * qu'il supprimerait. Ajoute --apply pour executer la suppression.
 *
 *   DATABASE_URL=postgres://... node scripts/delete-all-projects.mjs --apply
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant dans l'environnement.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [projectCount, versionCount, repairJobCount, agencyOfferCount, generationCount, marketplaceProductCount] =
    await Promise.all([
      prisma.project.count(),
      prisma.projectVersion.count(),
      prisma.repairJob.count(),
      prisma.agencyOffer.count(),
      prisma.generation.count({ where: { projectId: { not: null } } }),
      prisma.marketplaceProduct.count({ where: { projectId: { not: null } } }),
    ]);

  console.log("Etat actuel :");
  console.log(`  Project              : ${projectCount}`);
  console.log(`  ProjectVersion       : ${versionCount} (sera supprime en cascade)`);
  console.log(`  RepairJob            : ${repairJobCount} (sera supprime en cascade)`);
  console.log(`  AgencyOffer          : ${agencyOfferCount} (sera supprime en cascade)`);
  console.log(`  Generation liee      : ${generationCount} (sera detachee, pas supprimee)`);
  console.log(`  MarketplaceProduct liee : ${marketplaceProductCount} (sera detachee, pas supprimee)`);

  if (projectCount === 0) {
    console.log("\nAucun projet a supprimer.");
    return;
  }

  if (!APPLY) {
    console.log("\nDry-run (aucune suppression effectuee). Relance avec --apply pour supprimer.");
    return;
  }

  console.log("\nSuppression en cours...");
  const result = await prisma.project.deleteMany({});
  console.log(`\nTermine. ${result.count} projet(s) supprime(s) (et leurs versions/repairJobs/agencyOffers en cascade).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
