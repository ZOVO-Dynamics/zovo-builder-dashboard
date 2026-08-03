import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

async function main() {
  const destinations = await stripe.webhookEndpoints.list({ limit: 10 });
  const old = destinations.data.find(d => d.url.includes("zovo.ca"));

  const created = await stripe.webhookEndpoints.create({
    url: "https://www.zovo.ca/api/webhooks/stripe",
    enabled_events: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ],
  });

  console.log("✅ Nouvelle destination créée:", created.id);
  console.log("✅ NOUVEAU SECRET:", created.secret);

  if (old) {
    await stripe.webhookEndpoints.del(old.id);
    console.log(`✅ Ancienne destination (${old.id}) supprimée`);
  }
}

main().catch(console.error);
