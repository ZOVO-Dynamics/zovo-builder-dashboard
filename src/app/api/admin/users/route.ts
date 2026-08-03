import { NextRequest, NextResponse } from "next/server";
interface SessionUserWithAdmin {
  isAdmin?: boolean;
}
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !(session.user as SessionUserWithAdmin).isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = 20;

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        isAdmin: true,
        creditsBalance: true,
        monthlyUsage: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            cancelAtPeriodEnd: true,
            currentPeriodEnd: true,
            plan: { select: { name: true, internalName: true } },
          },
        },
        _count: { select: { generations: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
