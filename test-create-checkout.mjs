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
  const email = process.argv[2];
  const packId = process.argv[3];

  const user = await prisma.user.findUnique({ where: { email } });
  const pack = await prisma.creditPack.findUnique({ where: { id: packId } });

  if (!user || !pack) {
    console.error("Utilisateur ou pack introuvable.");
    process.exit(1);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [{ price: pack.stripePriceId, quantity: 1 }],
    success_url: "https://www.zovo.ca/dashboard?credits=success",
    cancel_url: "https://www.zovo.ca/pricing?credits=cancelled",
    metadata: {
      userId: user.id,
      creditPackId: pack.id,
      credits: String(pack.credits),
    },
  });

  console.log("Lien de paiement de test :");
  console.log(session.url);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
