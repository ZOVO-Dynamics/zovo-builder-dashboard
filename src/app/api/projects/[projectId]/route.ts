import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      versions: { orderBy: { versionNumber: "desc" } },
    },
  });

  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Projet introuvable ou accès refusé" }, { status: 403 });
  }

  return NextResponse.json({ project });
}
