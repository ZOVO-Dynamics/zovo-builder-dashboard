import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

async function main() {
  const destinations = await stripe.webhookEndpoints.list({ limit: 10 });
  const dest = destinations.data.find(d => d.url.includes("zovo.ca"));
  console.log("Destination ID:", dest.id);
  console.log("Secret local (.env.local):", process.env.STRIPE_WEBHOOK_SECRET);
  // Stripe ne renvoie jamais le secret complet via l'API après création,
  // donc on ne peut que vérifier l'ID de la destination correspond bien.
}

main().catch(console.error);
