import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const packs = await prisma.creditPack.findMany({
    where: { active: true },
    orderBy: { priceCents: "asc" },
  });

  return NextResponse.json({ packs });
}
