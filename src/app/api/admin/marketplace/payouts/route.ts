import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Liste toutes les demandes de retrait pour traitement admin.
export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const payouts = await prisma.sellerPayout.findMany({
      where: status ? { status: status as never } : undefined,
      include: {
        seller: { select: { displayName: true, userId: true } },
      },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ payouts });
  } catch (error: unknown) {
    console.error("ADMIN PAYOUTS LIST ERROR:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
