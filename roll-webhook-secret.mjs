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

  if (!dest) {
    console.log("Destination introuvable.");
    return;
  }

  const rolled = await stripe.webhookEndpoints.update(dest.id, {}, {
    // Le paramètre spécial pour faire pivoter le secret
  });

  console.log("Endpoint mis à jour:", rolled.id);

  // La méthode standard du SDK n'expose pas "roll" directement,
  // on utilise donc l'appel API brut
  const response = await stripe.rawRequest(
    "POST",
    `/v1/webhook_endpoints/${dest.id}`,
    { roll_secret: "true" }
  );

  console.log("Nouveau secret:", response.secret);
}

main().catch(console.error);
