import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
});

async function main() {
  const events = await stripe.events.list({
    type: "checkout.session.completed",
    limit: 5,
  });

  for (const event of events.data) {
    console.log(`--- Event ${event.id} (${new Date(event.created * 1000).toISOString()}) ---`);
    console.log("metadata:", event.data.object.metadata);
    console.log("payment_intent:", event.data.object.payment_intent);
  }

  if (events.data.length === 0) {
    console.log("Aucun événement checkout.session.completed trouvé récemment.");
  }
}

main().catch(console.error);
