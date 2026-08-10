import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Réservé aux admins. Renomme une catégorie (régénère le slug).
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
    const { name } = body ?? {};

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "name doit contenir au moins 2 caractères" },
        { status: 400 }
      );
    }

    const category = await prisma.marketplaceCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
    }

    const updated = await prisma.marketplaceCategory.update({
      where: { id },
      data: { name: name.trim(), slug: slugify(name) },
    });

    return NextResponse.json({ category: updated });
  } catch (error: unknown) {
    console.error("ADMIN CATEGORY PATCH ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Réservé aux admins. Supprime une catégorie, refuse si des produits
// l'utilisent encore (évite de casser des produits déjà publiés).
export async function DELETE(
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

    const productCount = await prisma.marketplaceProduct.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer : ${productCount} produit(s) utilisent encore cette catégorie` },
        { status: 409 }
      );
    }

    await prisma.marketplaceCategory.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("ADMIN CATEGORY DELETE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
