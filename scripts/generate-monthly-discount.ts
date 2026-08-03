import { generateMonthlyDiscount } from "../src/lib/discounts";
import { prisma } from "../src/lib/prisma";

async function main() {
  const result = await generateMonthlyDiscount();
  console.log(
    result.created
      ? `Nouvelle reduction creee: ${result.discount.percentOff}% (${result.discount.code})`
      : `Reduction deja existante pour ce mois: ${result.discount.percentOff}% (${result.discount.code})`
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
