import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { connectAccount: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    let stripeAccountId = user.connectAccount?.stripeConnectAccountId;

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      await prisma.connectAccount.create({
        data: {
          userId: user.id,
          stripeConnectAccountId: account.id,
        },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: "https://www.zovo.ca/dashboard/sell?onboarding=refresh",
      return_url: "https://www.zovo.ca/dashboard/sell?onboarding=complete",
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });

  } catch (error: unknown) {

    console.error(
      "CONNECT ONBOARD ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      {
        status: 500
      }
    );
  }
}
