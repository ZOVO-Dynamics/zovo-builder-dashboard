import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

async function main() {
  const destinations = await stripe.webhookEndpoints.list({ limit: 10 });

  console.log("Destinations webhook configurées :");
  for (const d of destinations.data) {
    console.log(`  - ${d.url} (statut: ${d.status}, events: ${d.enabled_events.join(", ")})`);
  }
}

main().catch(console.error);
