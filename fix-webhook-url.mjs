import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

async function main() {
  const destinations = await stripe.webhookEndpoints.list({ limit: 10 });
  const old = destinations.data.find(d => d.url.includes("builder.zovo.ca"));

  if (!old) {
    console.log("Aucune destination avec builder.zovo.ca trouvée.");
    return;
  }

  const updated = await stripe.webhookEndpoints.update(old.id, {
    url: "https://www.zovo.ca/api/webhooks/stripe",
  });

  console.log(`✅ URL mise à jour : ${updated.url}`);
}

main().catch(console.error);
