import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";
import {
  ZOVO_REPAIR_PRICE_CENTS,
  ZOVO_REPAIR_CURRENCY,
  ZOVO_REPAIR_PRICE_ID,
  ZOVO_REPAIR_PRODUCT_NAME,
  ZOVO_REPAIR_PRODUCT_DESCRIPTION,
} from "@/lib/repairConfig";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const limitResult = rateLimit(`repair-checkout:${session.user.id}`, 10, 5 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans quelques minutes." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const projectId = body?.projectId as string | undefined;

    if (!projectId) {
      return NextResponse.json({ error: "projectId manquant" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Projet introuvable ou accès refusé" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // Un seul job de réparation "en attente/en cours" à la fois par projet,
    // pour éviter les doubles paiements accidentels sur le même projet.
    const activeJob = await prisma.repairJob.findFirst({
      where: {
        projectId,
        status: { in: ["PENDING_PAYMENT", "PAID", "QUEUED", "ANALYZING", "FIXING", "VALIDATING"] },
      },
    });
    if (activeJob) {
      return NextResponse.json(
        { error: "Une réparation est déjà en attente ou en cours sur ce projet", repairJobId: activeJob.id },
        { status: 409 }
      );
    }

    const lineItem = ZOVO_REPAIR_PRICE_ID
      ? { price: ZOVO_REPAIR_PRICE_ID, quantity: 1 }
      : {
          price_data: {
            currency: ZOVO_REPAIR_CURRENCY,
            unit_amount: ZOVO_REPAIR_PRICE_CENTS,
            product_data: {
              name: ZOVO_REPAIR_PRODUCT_NAME,
              description: ZOVO_REPAIR_PRODUCT_DESCRIPTION,
            },
          },
          quantity: 1,
        };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      managed_payments: { enabled: false },
      customer_email: user.email,
      line_items: [lineItem],
      success_url: `${process.env.AUTH_URL}/dashboard?repairProjectId=${project.id}&repairSession={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.AUTH_URL}/dashboard?repairCancelled=true`,
      metadata: {
        kind: "repair",
        userId: user.id,
        repairProjectId: project.id,
      },
    });

    return NextResponse.json({ success: true, url: checkoutSession.url });
  } catch (error: unknown) {
    console.error("ZOVO REPAIR CHECKOUT ERROR:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
