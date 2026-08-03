import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

type PreviewStatus = "installing" | "starting" | "ready" | "error";

interface PreviewInstance {
  process: ChildProcess | null;
  port: number;
  startedAt: number;
  status: PreviewStatus;
  error?: string;
}

const PORT_RANGE_START = 5000;
const PORT_RANGE_END = 5010;
const PREVIEW_TIMEOUT_MS = 15 * 60 * 1000; // 15 min

const activePreviews = new Map<string, PreviewInstance>();

function findFreePort(): number {
  const usedPorts = new Set(Array.from(activePreviews.values()).map((p) => p.port));
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!usedPorts.has(port)) return port;
  }
  throw new Error("Aucun port disponible pour le preview");
}

function installDependencies(projectDir: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: projectDir,
      stdio: "ignore",
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(false);
    }, 180000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code === 0);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function waitForReady(port: number, timeoutMs: number = 60000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.status < 500) return true;
    } catch {
      // pas encore prêt
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

export class PreviewManager {
  async start(projectId: string, projectDir: string): Promise<{ port: number }> {
    this.stop(projectId);

    const port = findFreePort();
    activePreviews.set(projectId, { process: null, port, startedAt: Date.now(), status: "installing" });

    (async () => {
      try {
        if (!fs.existsSync(path.join(projectDir, "node_modules"))) {
          const installed = await installDependencies(projectDir);
          if (!installed) {
            activePreviews.set(projectId, {
              process: null,
              port,
              startedAt: Date.now(),
              status: "error",
              error: "Échec de npm install pour le preview",
            });
            return;
          }
        }

        const entry = activePreviews.get(projectId);
        if (!entry) return;
        entry.status = "starting";

        const child = spawn(
          "systemd-run",
          [
            "--user",
            "--scope",
            "--property=MemoryMax=300M",
            "npx",
            "next",
            "dev",
            "-p",
            String(port),
            "-H",
            "0.0.0.0",
          ],
          {
            cwd: projectDir,
            detached: true,
            stdio: "ignore",
          }
        );
        child.unref();
        entry.process = child;

        setTimeout(() => this.stop(projectId), PREVIEW_TIMEOUT_MS);

        const ready = await waitForReady(port);
        const current = activePreviews.get(projectId);
        if (current) {
          current.status = ready ? "ready" : "error";
          if (!ready) current.error = "Le serveur de preview n'a pas démarré à temps";
        }
      } catch (err: unknown) {
        activePreviews.set(projectId, {
          process: null,
          port,
          startedAt: Date.now(),
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();

    return { port };
  }

  stop(projectId: string): void {
    const existing = activePreviews.get(projectId);
    if (existing?.process) {
      try {
        process.kill(-existing.process.pid!, "SIGTERM");
      } catch {
        // process déjà terminé
      }
    }
    activePreviews.delete(projectId);
  }

  getStatus(projectId: string): { port: number; startedAt: number; status: PreviewStatus; error?: string } | null {
    const existing = activePreviews.get(projectId);
    if (!existing) return null;
    return {
      port: existing.port,
      startedAt: existing.startedAt,
      status: existing.status,
      error: existing.error,
    };
  }
}

const previewmanagerInstance = new PreviewManager();
export default previewmanagerInstance;
