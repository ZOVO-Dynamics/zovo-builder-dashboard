import { execSync } from "child_process";

export function runTypeCheck(projectDir: string): { ok: boolean; output: string } {
  try {
    execSync("./node_modules/.bin/tsc --noEmit --skipLibCheck", {
      cwd: projectDir,
      stdio: "pipe",
      timeout: 60000,
    });
    return { ok: true, output: "" };
  } catch (err: unknown) {
    const e = err as { stdout?: { toString(): string }; stderr?: { toString(): string } };
    const output = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
    return { ok: false, output };
  }
}

export function runNextBuild(projectDir: string): { ok: boolean; output: string } {
  try {
    execSync(
      `docker run --rm --network=host -v "${projectDir}:/app" -w /app -e DATABASE_URL="${process.env.DATABASE_URL || ""}" node:22 npx prisma generate`,
      { stdio: "pipe", timeout: 60000 }
    );
  } catch {
    // on laisse next build échouer et remonter l'erreur Prisma si generate échoue encore
  }
  try {
    execSync(
      `docker run --rm --network=host --memory=2g --memory-swap=2g --user "$(id -u):$(id -g)" -v "${projectDir}:/app" -w /app -e DATABASE_URL="${process.env.DATABASE_URL || ""}" node:22 npm run build`,
      { stdio: "pipe", timeout: 180000 }
    );
    return { ok: true, output: "" };
  } catch (err: unknown) {
    const e = err as { stdout?: { toString(): string }; stderr?: { toString(): string } };
    const output = (e.stdout?.toString() || "") + (e.stderr?.toString() || "");
    return { ok: false, output };
  }
}
