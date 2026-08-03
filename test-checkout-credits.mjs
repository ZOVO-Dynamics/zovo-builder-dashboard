import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Remplace par l'email de ton compte de test existant
  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error("Usage: node test-checkout-credits.mjs <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: testEmail } });
  if (!user) {
    console.error("Utilisateur introuvable pour cet email.");
    process.exit(1);
  }

  console.log(`Utilisateur trouvé : ${user.email}, solde actuel : ${user.creditsBalance} crédits`);

  const packs = await prisma.creditPack.findMany();
  console.log("Packs disponibles :");
  packs.forEach(p => console.log(`  - ${p.name} (id: ${p.id}) : ${p.credits} crédits, ${p.priceCents / 100} ${p.currency}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
