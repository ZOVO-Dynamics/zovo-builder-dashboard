/**
 * Corrige automatiquement les lignes PlanPrice dont le billingInterval ne
 * correspond pas a l'intervalle canonique du plan (ex: un prix "year" sur
 * le plan monthly_pro), qui causent l'affichage de plusieurs cartes avec
 * le meme prix sur /pricing quand on bascule le toggle de facturation.
 *
 * A executer TOI-MEME (jamais depuis une session Claude), avec DATABASE_URL
 * defini dans l'environnement :
 *
 *   DATABASE_URL=postgres://... node scripts/fix-duplicate-plan-prices.mjs
 *
 * Par defaut le script tourne en mode "dry-run" et affiche seulement ce
 * qu'il supprimerait. Ajoute --apply pour executer les suppressions.
 *
 *   DATABASE_URL=postgres://... node scripts/fix-duplicate-plan-prices.mjs --apply
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant dans l'environnement.");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

// Intervalle canonique attendu pour chaque plan connu.
const EXPECTED_INTERVAL = {
  weekly_pro: "week",
  monthly_pro: "month",
  annual_pro: "year",
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const plans = await prisma.subscriptionPlan.findMany({ include: { prices: true } });

  let toDelete = [];

  for (const plan of plans) {
    const expected = EXPECTED_INTERVAL[plan.internalName];
    if (!expected) {
      console.log(`  (i) Plan inconnu "${plan.internalName}", ignore (pas dans EXPECTED_INTERVAL).`);
      continue;
    }

    const badPrices = plan.prices.filter((p) => p.billingInterval !== expected);
    for (const bad of badPrices) {
      toDelete.push({ plan, price: bad, expected });
    }
  }

  if (toDelete.length === 0) {
    console.log("Aucune ligne PlanPrice incoherente trouvee. Rien a faire.");
    return;
  }

  console.log(`\n${toDelete.length} ligne(s) PlanPrice incoherente(s) detectee(s):\n`);
  for (const { plan, price, expected } of toDelete) {
    console.log(
      `  - Plan "${plan.internalName}" (${plan.name}): attendu billingInterval="${expected}", ` +
        `trouve id=${price.id} billingInterval="${price.billingInterval}" priceCents=${price.priceCents} stripePriceId=${price.stripePriceId}`
    );
  }

  if (!APPLY) {
    console.log("\nDry-run (aucune suppression effectuee). Relance avec --apply pour supprimer ces lignes.");
    return;
  }

  console.log("\nSuppression en cours...");
  for (const { plan, price } of toDelete) {
    await prisma.planPrice.delete({ where: { id: price.id } });
    console.log(`  Supprime: PlanPrice ${price.id} (plan ${plan.internalName})`);
  }

  console.log("\nTermine. Verifie /pricing pour confirmer que chaque plan n'affiche plus qu'une seule carte par intervalle.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
