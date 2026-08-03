import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const packId = searchParams.get("packId");

  if (!email || !packId) {
    return NextResponse.json({ error: "email et packId requis en paramètres" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const pack = await prisma.creditPack.findUnique({ where: { id: packId } });

  if (!user || !pack || !pack.stripePriceId) {
    return NextResponse.json({ error: "Utilisateur ou pack introuvable" }, { status: 404 });
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

  return NextResponse.redirect(session.url!, { status: 303 });
}
