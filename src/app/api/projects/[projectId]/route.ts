import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { estimateProjectValue } from "@/core/ValueEstimator";

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

  // Estimation dérivée du blueprint de la dernière version — aucun appel IA,
  // calcul déterministe à partir de données déjà persistées.
  const latestBlueprint = project.versions[0]?.blueprint as
    | { files?: string[]; components?: string[]; dependencies?: string[] }
    | null
    | undefined;

  const valueEstimate = latestBlueprint
    ? estimateProjectValue({
        files: latestBlueprint.files ?? [],
        components: latestBlueprint.components ?? [],
        dependencies: latestBlueprint.dependencies ?? [],
      })
    : null;

  return NextResponse.json({ project, valueEstimate });
}
