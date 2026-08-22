/**
 * Recree (ou reutilise) les produits/prix Stripe pour les trois plans
 * ZOVO Builder (weekly_pro, monthly_pro, annual_pro), puis synchronise les tables
 * SubscriptionPlan / PlanPrice en base pour que /pricing, /checkout et
 * /billing fonctionnent immediatement.
 *
 * A executer TOI-MEME (jamais depuis la session Claude), soit en local
 * avec les variables d'environnement STRIPE_SECRET_KEY et DATABASE_URL
 * definies :
 *
 *   STRIPE_SECRET_KEY=sk_live_xxx DATABASE_URL=postgres://... node scripts/setup-stripe-plans.mjs
 *
 * ...soit via le workflow GitHub Actions "Setup Stripe Plans"
 * (.github/workflows/setup-stripe-plans.yml, declenchement manuel
 * workflow_dispatch), qui se connecte en SSH au serveur de prod
 * (secrets EC2_HOST/EC2_USER/EC2_SSH_KEY, deja utilises par deploy.yml)
 * et lance ce script la-bas. DATABASE_URL pointant vers un Postgres en
 * localhost sur ce serveur, le script doit tourner sur la machine
 * elle-meme — STRIPE_SECRET_KEY et DATABASE_URL restent dans le .env
 * du serveur, jamais dans les secrets GitHub.
 *
 * Le script est idempotent : le relancer ne cree pas de doublons, il
 * reutilise le produit/prix Stripe existant s'il le retrouve via son
 * metadata "internalName".
 *
 * Ajuste PLANS ci-dessous (prix, limites, features) avant d'executer
 * si les valeurs ne correspondent pas a ce que tu veux.
 */
import Stripe from "stripe";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("STRIPE_SECRET_KEY manquant dans l'environnement.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant dans l'environnement.");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PLANS = [
  {
    internalName: "weekly_pro",
    name: "ZOVO Pro Hebdomadaire",
    tier: "WEEKLY_PRO",
    currency: "cad",
    generationsLimit: 25,
    priceCents: 1599,
    billingInterval: "week",
    features: {
      agents: ["Architecte", "Développeur", "Testeur"],
      export: ["ZIP"],
      autoFix: "Basique",
      memory: "Session",
      priority: false,
      multiProject: false,
    },
  },
  {
    internalName: "monthly_pro",
    name: "ZOVO Pro Mensuel",
    tier: "MONTHLY_PRO",
    currency: "cad",
    generationsLimit: 120,
    priceCents: 2699,
    billingInterval: "month",
    features: {
      agents: ["Architecte", "Développeur", "Testeur", "Reviewer"],
      export: ["ZIP", "GitHub"],
      autoFix: "Avancé",
      memory: "Persistante",
      priority: true,
      multiProject: true,
    },
  },
  {
    internalName: "annual_pro",
    name: "ZOVO Pro Annuel",
    tier: "ANNUAL_PRO",
    currency: "cad",
    generationsLimit: 120,
    priceCents: 29999,
    billingInterval: "year",
    features: {
      agents: ["Architecte", "Développeur", "Testeur", "Reviewer"],
      export: ["ZIP", "GitHub"],
      autoFix: "Avancé",
      memory: "Persistante",
      priority: true,
      multiProject: true,
    },
  },
];

async function findOrCreateProduct(plan) {
  const existing = await stripe.products.search({
    query: `metadata['internalName']:'${plan.internalName}'`,
  });
  if (existing.data.length > 0) {
    console.log(`  Produit Stripe existant reutilise: ${existing.data[0].id}`);
    return existing.data[0];
  }
  const product = await stripe.products.create({
    name: plan.name,
    metadata: { internalName: plan.internalName },
  });
  console.log(`  Produit Stripe cree: ${product.id}`);
  return product;
}

async function findOrCreatePrice(product, plan) {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const match = prices.data.find(
    (p) =>
      p.currency === plan.currency &&
      p.unit_amount === plan.priceCents &&
      p.recurring?.interval === plan.billingInterval
  );
  if (match) {
    console.log(`  Prix Stripe existant reutilise: ${match.id}`);
    return match;
  }
  const price = await stripe.prices.create({
    product: product.id,
    currency: plan.currency,
    unit_amount: plan.priceCents,
    recurring: { interval: plan.billingInterval },
    metadata: { internalName: plan.internalName },
  });
  console.log(`  Prix Stripe cree: ${price.id} (${(plan.priceCents / 100).toFixed(2)} ${plan.currency.toUpperCase()}/${plan.billingInterval})`);
  return price;
}

async function main() {
  for (const plan of PLANS) {
    console.log(`\n=== ${plan.internalName} ===`);

    const product = await findOrCreateProduct(plan);
    const price = await findOrCreatePrice(product, plan);

    const dbPlan = await prisma.subscriptionPlan.upsert({
      where: { internalName: plan.internalName },
      update: {
        name: plan.name,
        tier: plan.tier,
        currency: plan.currency.toUpperCase(),
        generationsLimit: plan.generationsLimit,
        stripeProductId: product.id,
        features: plan.features,
      },
      create: {
        internalName: plan.internalName,
        name: plan.name,
        tier: plan.tier,
        currency: plan.currency.toUpperCase(),
        generationsLimit: plan.generationsLimit,
        stripeProductId: product.id,
        features: plan.features,
      },
    });

    await prisma.planPrice.upsert({
      where: { stripePriceId: price.id },
      update: {
        planId: dbPlan.id,
        billingInterval: plan.billingInterval,
        priceCents: plan.priceCents,
        isDefault: true,
      },
      create: {
        planId: dbPlan.id,
        billingInterval: plan.billingInterval,
        priceCents: plan.priceCents,
        stripePriceId: price.id,
        isDefault: true,
      },
    });

    console.log(`  ✅ SubscriptionPlan + PlanPrice synchronises pour ${plan.internalName}`);
  }

  console.log("\n✅ Tous les plans sont prets. Verifie /pricing pour confirmer.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
