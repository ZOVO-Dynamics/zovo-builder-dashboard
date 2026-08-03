import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const packs = await prisma.creditPack.findMany();

  for (const pack of packs) {
    if (!pack.stripePriceId) continue;

    const price = await stripe.prices.retrieve(pack.stripePriceId);
    const productId = price.product;

    await stripe.products.update(productId, {
      tax_code: "txcd_10103000",
    });

    console.log(`✅ ${pack.name} → tax_code ajouté sur ${productId}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
