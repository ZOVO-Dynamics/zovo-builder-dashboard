import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

async function main() {
  const eventId = "evt_1TyM7VCPWmsvwVohljPRAGdP";
  // Utilise l'API de test webhook pour voir le statut de livraison
  const destinations = await stripe.webhookEndpoints.list({ limit: 10 });
  const dest = destinations.data.find(d => d.url.includes("zovo.ca"));

  console.log("Destination:", dest.url, dest.id);

  const event = await stripe.events.retrieve(eventId);
  console.log("Event livré (pending_webhooks):", event.pending_webhooks);
}

main().catch(console.error);
