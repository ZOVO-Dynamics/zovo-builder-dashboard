import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface SessionUserWithAdmin {
  isAdmin?: boolean;
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 20;

  const where = statusFilter ? { status: statusFilter as "PASSED" | "FLAGGED" | "REJECTED_QUALITY" | "REJECTED_FRAUD" } : {};

  const [verifications, total] = await Promise.all([
    prisma.identityVerification.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
      },
    }),
    prisma.identityVerification.count({ where }),
  ]);

  return NextResponse.json({
    verifications,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  });
}
