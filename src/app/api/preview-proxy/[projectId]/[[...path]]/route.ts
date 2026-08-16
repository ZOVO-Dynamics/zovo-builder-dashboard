import { NextRequest, NextResponse } from "next/server";
import path from "path";
import previewManager from "@/core/PreviewManager";
import { auth } from "@/lib/auth";
import generationHistory from "@/core/GenerationHistory";

async function verifyOwnership(safeName: string): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return { ok: false, response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  const history = generationHistory.getAll();
  const owns = history.some(
    (entry) => path.basename(entry.projectPath) === safeName && entry.userId === session.user!.id
  );
  if (!owns) {
    return { ok: false, response: NextResponse.json({ error: "Accès refusé à ce projet" }, { status: 403 }) };
  }
  return { ok: true };
}

async function proxy(req: NextRequest, projectId: string, pathSegments: string[] = []) {
  const safeName = path.basename(projectId);
  const check = await verifyOwnership(safeName);
  if (!check.ok) return check.response;

  const status = previewManager.getStatus(projectId);
  if (!status || status.status !== "ready") {
    return new NextResponse("Preview non disponible", { status: 502 });
  }

  const port = status.port;
  const subPath = pathSegments.join("/");
  const search = req.nextUrl.search || "";
  const targetUrl = `http://localhost:${port}/${subPath}${search}`;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers: { accept: req.headers.get("accept") || "*/*" },
      redirect: "manual",
    });
  } catch {
    return new NextResponse("Impossible de contacter le serveur de preview", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "";
  const basePrefix = `/api/preview-proxy/${projectId}`;

  if (contentType.includes("text/html") || contentType.includes("javascript") || contentType.includes("text/css")) {
    let text = await upstream.text();
    // Réécrit les chemins absolus /_next/... et /__nextjs... pour repasser par le proxy
    text = text.replace(/(["'(])\/(_next|__nextjs)\//g, `$1${basePrefix}/$2/`);
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": contentType },
    });
  }

  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    status: upstream.status,
    headers: { "content-type": contentType },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  const { projectId, path } = await params;
  return proxy(req, projectId, path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; path?: string[] }> }
) {
  const { projectId, path } = await params;
  return proxy(req, projectId, path);
}
