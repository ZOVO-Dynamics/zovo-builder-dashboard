import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  try {
    const users = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    console.log("Connexion PostgreSQL OK ✅");
    console.log(users);
  } catch (error) {
    console.error("Erreur DB ❌");
    console.error(error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
