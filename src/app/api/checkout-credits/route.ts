import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const { packId } = await req.json();
  if (!packId) {
    return NextResponse.json({ error: "packId manquant" }, { status: 400 });
  }

  const pack = await prisma.creditPack.findUnique({ where: { id: packId } });
  if (!pack || !pack.active || !pack.stripePriceId) {
    return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
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

  return NextResponse.json({ url: checkoutSession.url });
}
