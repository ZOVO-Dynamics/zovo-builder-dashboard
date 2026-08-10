import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MarketplaceProductType } from "@prisma/client";

const VALID_TYPES: string[] = Object.values(MarketplaceProductType);

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "produit";
  let candidate = base;
  let attempt = 0;

  while (true) {
    const exists = await prisma.marketplaceProduct.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;

    attempt += 1;
    candidate = `${base}-${attempt}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const seller = await prisma.marketplaceSeller.findUnique({
      where: { userId: session.user.id },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Créez d'abord votre profil vendeur (POST /api/marketplace/seller)" },
        { status: 403 }
      );
    }

    if (seller.suspended) {
      return NextResponse.json(
        { error: "Votre compte vendeur est suspendu" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const {
      title,
      description,
      priceCents,
      type,
      currency,
      categoryId,
      projectId,
      version,
      changelog,
      techStack,
      compatibility,
      licenseType,
      screenshots,
    } = body ?? {};

    if (typeof title !== "string" || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Le titre doit contenir au moins 3 caractères" },
        { status: 400 }
      );
    }

    if (typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { error: "La description doit contenir au moins 10 caractères" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(priceCents) || priceCents <= 0) {
      return NextResponse.json(
        { error: "priceCents doit être un entier positif (en cents)" },
        { status: 400 }
      );
    }

    if (typeof type !== "string" || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type invalide. Valeurs acceptées: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (categoryId) {
      const category = await prisma.marketplaceCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json({ error: "categoryId invalide" }, { status: 400 });
      }
    }

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, userId: true },
      });
      if (!project || project.userId !== session.user.id) {
        return NextResponse.json(
          { error: "projectId invalide ou n'appartenant pas à cet utilisateur" },
          { status: 400 }
        );
      }
    }

    const slug = await generateUniqueSlug(title);

    const product = await prisma.marketplaceProduct.create({
      data: {
        sellerId: seller.id,
        categoryId: categoryId || null,
        projectId: projectId || null,
        type: type as MarketplaceProductType,
        title: title.trim(),
        slug,
        description: description.trim(),
        priceCents,
        currency: typeof currency === "string" && currency.length === 3 ? currency.toUpperCase() : "CAD",
        version: version || null,
        changelog: changelog || null,
        techStack: techStack ?? null,
        compatibility: compatibility || null,
        licenseType: licenseType || null,
        screenshots: screenshots ?? null,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: unknown) {
    console.error("MARKETPLACE PRODUCT CREATE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Liste publique des produits approuvés, avec l'id du placement sponsorisé
// actif (pas juste un booléen) pour permettre l'attribution correcte des
// événements analytics d'impression/clic sponsorisé.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const type = searchParams.get("type") || undefined;

    const products = await prisma.marketplaceProduct.findMany({
      where: {
        status: "APPROVED",
        ...(categoryId ? { categoryId } : {}),
        ...(type && VALID_TYPES.includes(type) ? { type: type as MarketplaceProductType } : {}),
      },
      include: {
        seller: { select: { displayName: true, ratingAvg: true, tier: true } },
        category: { select: { name: true, slug: true } },
        placements: {
          where: { status: "ACTIVE" },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const withSponsoredFlag = products.map((p) => ({
      ...p,
      isSponsored: p.placements.length > 0,
      activePlacementId: p.placements[0]?.id ?? null,
      placements: undefined,
    }));

    return NextResponse.json({ products: withSponsoredFlag });
  } catch (error: unknown) {
    console.error("MARKETPLACE PRODUCTS LIST ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
