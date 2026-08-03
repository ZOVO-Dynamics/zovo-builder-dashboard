import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2];
  const user = await prisma.user.findUnique({ where: { email } });

  console.log(`Solde AVANT : ${user.creditsBalance} crédits`);

  // Import dynamique pour utiliser la vraie logique de entitlements.ts
  const { checkGenerationEntitlement, recordGeneration } = await import("./src/lib/entitlements.ts");

  const check = await checkGenerationEntitlement(user.id);
  console.log("Vérification d'accès:", check);

  if (check.allowed) {
    await recordGeneration(user.id, "test prompt debit crédit");
    const updated = await prisma.user.findUnique({ where: { email } });
    console.log(`Solde APRÈS : ${updated.creditsBalance} crédits`);
  } else {
    console.log("Génération refusée, pas de débit.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
