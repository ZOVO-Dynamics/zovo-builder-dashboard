import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MarketplaceProductStatus } from "@prisma/client";

const ALLOWED_STATUSES: string[] = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
];

// Réservé aux admins. Permet d'approuver/rejeter/suspendre un produit
// Marketplace. Un vendeur ne peut jamais atteindre cette route lui-même
// (vérification isAdmin obligatoire, jamais optionnelle).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const status = body?.status;

    if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `status invalide. Valeurs acceptées: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const product = await prisma.marketplaceProduct.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    }

    const updated = await prisma.marketplaceProduct.update({
      where: { id },
      data: { status: status as MarketplaceProductStatus },
    });

    console.log(`[ADMIN] Produit ${id} passé au statut ${status} par ${session.user.id}`);

    return NextResponse.json({ product: updated });
  } catch (error: unknown) {
    console.error("ADMIN MARKETPLACE PRODUCT PATCH ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Liste tous les produits pour la modération (tous statuts confondus).
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    return NextResponse.json({ error: "Utilisez GET /api/admin/marketplace/products (sans id)" }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
