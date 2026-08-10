// Fait expirer automatiquement les SponsoredPlacement dont endsAt est dépassé.
// Prévu pour être lancé par cron toutes les 15-30 minutes.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || "postgresql://localhost:5432/zovo_builder" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const result = await prisma.sponsoredPlacement.updateMany({
    where: {
      status: "ACTIVE",
      endsAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  console.log(`[${new Date().toISOString()}] ${result.count} placement(s) sponsorisé(s) expiré(s).`);
}

main()
  .catch((err) => {
    console.error("expire-sponsored-placements ERROR:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
