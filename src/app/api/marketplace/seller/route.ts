import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Crée le profil vendeur (MarketplaceSeller) pour l'utilisateur connecté.
// Idempotent : si le profil existe déjà, on le retourne simplement.
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const existing = await prisma.marketplaceSeller.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json({ seller: existing });
    }

    let body: { displayName?: string; bio?: string } = {};
    try {
      body = await req.json();
    } catch {
      // corps optionnel, on continue avec les valeurs par défaut
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    const seller = await prisma.marketplaceSeller.create({
      data: {
        userId: session.user.id,
        displayName: body.displayName?.trim() || user?.name || null,
        bio: body.bio?.trim() || null,
      },
    });

    return NextResponse.json({ seller }, { status: 201 });
  } catch (error: unknown) {
    console.error("MARKETPLACE SELLER CREATE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Récupère le profil vendeur de l'utilisateur connecté (ou null s'il n'existe pas).
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const seller = await prisma.marketplaceSeller.findUnique({
      where: { userId: session.user.id },
      include: {
        products: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({ seller });
  } catch (error: unknown) {
    console.error("MARKETPLACE SELLER GET ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
