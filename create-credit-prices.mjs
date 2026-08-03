import Stripe from "stripe";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const packs = await prisma.creditPack.findMany();

  for (const pack of packs) {
    if (pack.stripePriceId) {
      console.log(`⏭️  ${pack.name} a déjà un stripePriceId, ignoré.`);
      continue;
    }

    const product = await stripe.products.create({
      name: `ZOVO — Pack ${pack.name} (${pack.credits} crédits)`,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pack.priceCents,
      currency: pack.currency.toLowerCase(),
      // pas de "recurring" ici = paiement unique
    });

    await prisma.creditPack.update({
      where: { id: pack.id },
      data: { stripePriceId: price.id },
    });

    console.log(`✅ ${pack.name} → ${price.id}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
