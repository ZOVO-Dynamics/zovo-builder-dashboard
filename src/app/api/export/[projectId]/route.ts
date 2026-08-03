import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { auth } from "@/lib/auth";
import generationHistory from "@/core/GenerationHistory";

const require = createRequire(import.meta.url);
const archiver = require("archiver");

const GENERATED_ROOT = "/home/ubuntu/zovo-generated-projects";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { projectId } = await params;
  const safeName = path.basename(projectId);
  const projectDir = path.join(GENERATED_ROOT, safeName);

  if (!fs.existsSync(projectDir) || !fs.statSync(projectDir).isDirectory()) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const history = generationHistory.getAll();
  const owns = history.some(
    (entry) => path.basename(entry.projectPath) === safeName && entry.userId === session.user!.id
  );

  if (!owns) {
    return NextResponse.json({ error: "Accès refusé à ce projet" }, { status: 403 });
  }

  const zipBuffer: Buffer = await new Promise((resolve, reject) => {
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    archive.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    archive.on("error", (err: Error) => {
      reject(err);
    });

    archive.directory(projectDir, false);
    archive.finalize();
  });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}.zip"`,
    },
  });
}
