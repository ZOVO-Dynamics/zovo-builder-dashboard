import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repairJob: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    projectVersion: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("./Validator", () => ({
  default: {
    validate: vi.fn(),
  },
}));

vi.mock("./BuildRunner", () => ({
  runTypeCheck: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import validator from "./Validator";
import { runTypeCheck } from "./BuildRunner";
import { runRepairJob, summarizeActions } from "./RepairEngine";

type UpdateCallArg = { data: Record<string, unknown> };
function updateCalls(): UpdateCallArg[] {
  return vi.mocked(prisma.repairJob.update).mock.calls.map((c: unknown[]) => c[0] as UpdateCallArg);
}

const TEST_PROJECT_DIR = path.join("/tmp", "zovo-test-repair-project");

function makeJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "job_1",
    userId: "user_1",
    projectId: "project_1",
    status: "PAID",
    startedAt: null,
    project: { id: "project_1", projectPath: TEST_PROJECT_DIR, name: "Mon Projet" },
    ...overrides,
  };
}

describe("RepairEngine.runRepairJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (fs.existsSync(TEST_PROJECT_DIR)) fs.rmSync(TEST_PROJECT_DIR, { recursive: true, force: true });
    fs.mkdirSync(path.join(TEST_PROJECT_DIR, "src"), { recursive: true });
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, "src", "page.tsx"), "export default function Page() { return null; }");
  });

  afterEach(() => {
    // Nettoie aussi les éventuels dossiers de sauvegarde/échec créés par le moteur
    const parent = path.dirname(TEST_PROJECT_DIR);
    for (const entry of fs.readdirSync(parent)) {
      if (entry.startsWith(path.basename(TEST_PROJECT_DIR))) {
        fs.rmSync(path.join(parent, entry), { recursive: true, force: true });
      }
    }
  });

  it("refuse de relancer un job qui n'est pas dans un statut reparable", async () => {
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(makeJob({ status: "COMPLETED" }) as never);

    const result = await runRepairJob("job_1");

    expect(result.ranAtAll).toBe(false);
    expect(validator.validate).not.toHaveBeenCalled();
  });

  it("échoue proprement si le job est introuvable", async () => {
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(null as never);

    const result = await runRepairJob("unknown");

    expect(result.ranAtAll).toBe(false);
    expect(result.reason).toContain("introuvable");
  });

  it("échoue proprement si le dossier projet n'existe pas sur disque", async () => {
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(
      makeJob({ project: { id: "project_1", projectPath: "/tmp/zovo-does-not-exist", name: "X" } }) as never
    );

    const result = await runRepairJob("job_1");

    expect(result.ranAtAll).toBe(false);
    expect(prisma.repairJob.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) })
    );
  });

  it("marque COMPLETED/OK quand la validation réussit (build réussi => OK)", async () => {
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(makeJob() as never);
    vi.mocked(prisma.projectVersion.findFirst).mockResolvedValue({ prompt: "Un blog" } as never);
    vi.mocked(runTypeCheck).mockReturnValue({ ok: false, output: "src/page.tsx(1,1): error TS0001: faux positif initial" });
    vi.mocked(validator.validate).mockResolvedValue({
      valid: true,
      errors: [],
      fixedFiles: ["src/page.tsx"],
      attempts: 1,
    });

    const result = await runRepairJob("job_1");

    expect(result.ranAtAll).toBe(true);
    const completedCall = updateCalls().find((d) => d.data.status === "COMPLETED");
    expect(completedCall).toBeDefined();
    expect(completedCall!.data.validationStatus).toBe("OK");
  });

  it("ne marque jamais OK quand la validation échoue (build échoué => jamais OK)", async () => {
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(makeJob() as never);
    vi.mocked(prisma.projectVersion.findFirst).mockResolvedValue({ prompt: "Un blog" } as never);
    vi.mocked(runTypeCheck).mockReturnValue({ ok: false, output: "src/page.tsx(1,1): error TS0001: erreur persistante" });
    vi.mocked(validator.validate).mockResolvedValue({
      valid: false,
      errors: ["src/page.tsx: erreur persistante"],
      fixedFiles: [],
      attempts: 5,
    });

    const result = await runRepairJob("job_1");

    expect(result.ranAtAll).toBe(true);
    const calls = updateCalls();
    expect(calls.some((d) => d.data.status === "COMPLETED")).toBe(false);
    const failedCall = calls.find((d) => d.data.status === "FAILED");
    expect(failedCall?.data.validationStatus).toBe("FAILED");
  });

  it("restaure l'état stable quand la réparation échoue sans aucun progrès", async () => {
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, "src", "marker-original.txt"), "original");

    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(makeJob() as never);
    vi.mocked(prisma.projectVersion.findFirst).mockResolvedValue({ prompt: "Un blog" } as never);
    vi.mocked(runTypeCheck).mockReturnValue({ ok: false, output: "src/page.tsx(1,1): error TS0001: erreur persistante" });
    vi.mocked(validator.validate).mockResolvedValue({
      valid: false,
      errors: ["src/page.tsx: erreur persistante"],
      fixedFiles: [], // aucun progrès du tout
      attempts: 5,
    });

    await runRepairJob("job_1");

    // Le marqueur du snapshot doit être de nouveau présent après restauration
    expect(fs.existsSync(path.join(TEST_PROJECT_DIR, "src", "marker-original.txt"))).toBe(true);
    // Un dossier d'archive de l'état échoué doit avoir été créé pour le support
    const parent = path.dirname(TEST_PROJECT_DIR);
    const failedArchive = fs.readdirSync(parent).find((e) => e.includes("repair-failed-"));
    expect(failedArchive).toBeDefined();
  });

  it("attempts=0 par défaut si validator ne renvoie rien pour ce champ", async () => {
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(makeJob() as never);
    vi.mocked(prisma.projectVersion.findFirst).mockResolvedValue(null as never);
    vi.mocked(runTypeCheck).mockReturnValue({ ok: true, output: "" });
    vi.mocked(validator.validate).mockResolvedValue({
      valid: true,
      errors: [],
      fixedFiles: [],
    });

    await runRepairJob("job_1");

    const completedCall = updateCalls().find((d) => d.data.status === "COMPLETED");
    expect(completedCall!.data.attempts).toBe(0);
  });
});

describe("summarizeActions", () => {
  it("traduit les fichiers techniques en résumé compréhensible pour un client non technique", () => {
    const summary = summarizeActions(
      ["src/app/api/items/route.ts", "src/components/Foo.tsx", "prisma/schema.prisma"],
      true
    );

    expect(summary).toContain("Correction du schéma de base de données");
    expect(summary).toContain("Création ou correction de routes API manquantes");
    expect(summary).toContain("Correction de composants React");
    expect(summary).toContain("Validation finale réussie");
  });

  it("ne prétend jamais que la validation a réussi si valid=false", () => {
    const summary = summarizeActions(["src/page.tsx"], false);
    expect(summary).toContain("Validation finale non concluante");
    expect(summary).not.toContain("Validation finale réussie");
  });
});
