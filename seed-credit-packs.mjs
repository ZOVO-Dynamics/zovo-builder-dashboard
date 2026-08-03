import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const packs = [
    { name: "Starter", priceCents: 500, credits: 25 },
    { name: "Standard", priceCents: 1500, credits: 85 },
    { name: "Pro", priceCents: 3000, credits: 200 },
  ];

  for (const pack of packs) {
    await prisma.creditPack.upsert({
      where: { name: pack.name },
      update: pack,
      create: pack,
    });
  }

  console.log("✅ Packs de crédits créés/mis à jour :", packs.map(p => p.name).join(", "));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
