import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id, revokedAt: null },
    select: { id: true, name: true, keyPrefix: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "Un nom est requis pour la clé" }, { status: 400 });
  }

  const secret = randomBytes(24).toString("hex");
  const keyPrefix = `zvk_${secret.slice(0, 6)}`;
  const rawKey = `zvk_${secret}`;
  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const created = await prisma.apiKey.create({
    data: { userId: session.user.id, name, keyPrefix, keyHash },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });

  // La cle en clair n'est renvoyee qu'une seule fois, a la creation.
  return NextResponse.json({ key: { ...created, rawKey } }, { status: 201 });
}
