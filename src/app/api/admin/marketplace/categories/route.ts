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

export async function GET() {
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

    const categories = await prisma.marketplaceCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error: unknown) {
    console.error("ADMIN CATEGORIES LIST ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name } = body ?? {};

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "name doit contenir au moins 2 caractères" },
        { status: 400 }
      );
    }

    const slug = slugify(name);

    const existing = await prisma.marketplaceCategory.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Une catégorie avec un nom équivalent existe déjà" },
        { status: 409 }
      );
    }

    const category = await prisma.marketplaceCategory.create({
      data: { name: name.trim(), slug },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error: unknown) {
    console.error("ADMIN CATEGORY CREATE ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
