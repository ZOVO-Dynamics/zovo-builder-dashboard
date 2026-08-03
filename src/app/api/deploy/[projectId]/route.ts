import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import deployManager from "@/core/DeployManager";
import { auth } from "@/lib/auth";
import generationHistory from "@/core/GenerationHistory";

const GENERATED_ROOT = "/home/ubuntu/zovo-generated-projects";

async function verifyOwnership(safeName: string): Promise<{ ok: true; userId: string } | { ok: false; response: NextResponse }> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }

  const history = generationHistory.getAll();
  const owns = history.some(
    (entry) => path.basename(entry.projectPath) === safeName && entry.userId === session.user!.id
  );

  if (!owns) {
    return { ok: false, response: NextResponse.json({ error: "Accès refusé à ce projet" }, { status: 403 }) };
  }

  return { ok: true, userId: session.user.id };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const safeName = path.basename(projectId);

  const check = await verifyOwnership(safeName);
  if (!check.ok) return check.response;

  const status = await deployManager.getStatus(safeName);
  if (!status) {
    return NextResponse.json({ deployed: false });
  }

  return NextResponse.json({
    deployed: true,
    status: status.status,
    url: status.url,
    error: status.error,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const safeName = path.basename(projectId);

  const check = await verifyOwnership(safeName);
  if (!check.ok) return check.response;

  const projectDir = path.join(GENERATED_ROOT, safeName);

  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  try {
    const { deploymentId } = await deployManager.deploy(safeName, projectDir);
    return NextResponse.json({ success: true, deploymentId });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
