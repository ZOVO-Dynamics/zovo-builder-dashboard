import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SellerTier } from "@prisma/client";

const VALID_TIERS: string[] = Object.values(SellerTier);

// Réservé aux admins. Permet de suspendre/réactiver un vendeur et de
// changer son palier de commission (STANDARD/PRO/ENTERPRISE).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { suspended, tier } = body ?? {};

    const data: { suspended?: boolean; tier?: SellerTier } = {};

    if (typeof suspended === "boolean") {
      data.suspended = suspended;
    }

    if (typeof tier === "string") {
      if (!VALID_TIERS.includes(tier)) {
        return NextResponse.json(
          { error: `tier invalide. Valeurs acceptées: ${VALID_TIERS.join(", ")}` },
          { status: 400 }
        );
      }
      data.tier = tier as SellerTier;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Aucun champ valide fourni (suspended et/ou tier)" },
        { status: 400 }
      );
    }

    const seller = await prisma.marketplaceSeller.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!seller) {
      return NextResponse.json({ error: "Vendeur introuvable" }, { status: 404 });
    }

    const updated = await prisma.marketplaceSeller.update({
      where: { id },
      data,
    });

    console.log(`[ADMIN] Vendeur ${id} mis à jour par ${session.user.id}:`, data);

    return NextResponse.json({ seller: updated });
  } catch (error: unknown) {
    console.error("ADMIN SELLER PATCH ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
