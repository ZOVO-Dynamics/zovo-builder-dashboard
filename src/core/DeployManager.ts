import fs from "fs";
import path from "path";

const VERCEL_API = "https://api.vercel.com";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

const EXCLUDED_DIRS = new Set(["node_modules", ".next", ".git"]);

interface DeployState {
  deploymentId: string;
  url?: string;
  status: "queued" | "building" | "ready" | "error";
  error?: string;
}

interface CollectedFile {
  file: string;
  data: string;
}

class DeployManager {
  private deployments = new Map<string, DeployState>();

  private collectFiles(dir: string, baseDir: string, files: CollectedFile[] = []): CollectedFile[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.collectFiles(fullPath, baseDir, files);
      } else {
        const relPath = path.relative(baseDir, fullPath).split(path.sep).join("/");
        const content = fs.readFileSync(fullPath);
        files.push({ file: relPath, data: content.toString("base64") });
      }
    }
    return files;
  }

  async deploy(safeName: string, projectDir: string): Promise<{ deploymentId: string }> {
    if (!VERCEL_TOKEN) {
      throw new Error("VERCEL_TOKEN manquant");
    }

    const files = this.collectFiles(projectDir, projectDir);

    if (files.length === 0) {
      throw new Error("Aucun fichier trouvé pour ce projet");
    }

    const deployName = safeName.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50);

    const response = await fetch(`${VERCEL_API}/v13/deployments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: deployName,
        files: files.map((f) => ({ file: f.file, data: f.data, encoding: "base64" })),
        target: "production",
        projectSettings: {
          framework: "nextjs",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[DeployManager] Vercel deploy error:", JSON.stringify(data).slice(0, 1000));
      throw new Error(data?.error?.message || `Vercel HTTP ${response.status}`);
    }

    this.deployments.set(safeName, {
      deploymentId: data.id,
      status: "queued",
    });

    return { deploymentId: data.id };
  }

  async getStatus(safeName: string): Promise<DeployState | null> {
    const cached = this.deployments.get(safeName);
    if (!cached) return null;

    if (cached.status === "ready" || cached.status === "error") {
      return cached;
    }

    try {
      const response = await fetch(`${VERCEL_API}/v13/deployments/${cached.deploymentId}`, {
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      });
      const data = await response.json();

      if (!response.ok) {
        cached.status = "error";
        cached.error = data?.error?.message || `Vercel HTTP ${response.status}`;
        this.deployments.set(safeName, cached);
        return cached;
      }

      if (data.readyState === "READY") {
        cached.status = "ready";
        cached.url = `https://${data.url}`;
      } else if (data.readyState === "ERROR") {
        cached.status = "error";
        cached.error = "Le déploiement a échoué sur Vercel";
      } else {
        cached.status = "building";
      }

      this.deployments.set(safeName, cached);
      return cached;
    } catch (err) {
      cached.status = "error";
      cached.error = err instanceof Error ? err.message : String(err);
      this.deployments.set(safeName, cached);
      return cached;
    }
  }
}

const deployManagerInstance = new DeployManager();
export default deployManagerInstance;
