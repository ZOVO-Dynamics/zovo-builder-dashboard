import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

function makeParams(projectId: string) {
  return { params: Promise.resolve({ projectId }) };
}

describe("GET /api/projects/[projectId] — estimation de valeur", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET({} as never, makeParams("p1"));
    expect(res.status).toBe(401);
  });

  it("refuse l'accès à un projet n'appartenant pas à l'utilisateur", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      userId: "another_user",
      versions: [],
    } as never);

    const res = await GET({} as never, makeParams("p1"));
    expect(res.status).toBe(403);
  });

  it("renvoie valueEstimate=null si aucune version n'a de blueprint", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user_1",
      versions: [],
    } as never);

    const res = await GET({} as never, makeParams("p1"));
    const data = await res.json();
    expect(data.valueEstimate).toBeNull();
  });

  it("calcule l'estimation à partir du blueprint de la dernière version", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "p1",
      userId: "user_1",
      versions: [
        {
          versionNumber: 2,
          blueprint: {
            files: Array.from({ length: 15 }, (_, i) => `f${i}.ts`),
            components: ["AuthProvider"],
            dependencies: ["bcryptjs"],
          },
        },
        { versionNumber: 1, blueprint: { files: [], components: [], dependencies: [] } },
      ],
    } as never);

    const res = await GET({} as never, makeParams("p1"));
    const data = await res.json();

    expect(data.valueEstimate).not.toBeNull();
    expect(data.valueEstimate.detectedFeatures).toContain("authentication");
    expect(data.valueEstimate.estimatedValueCents).toBeGreaterThan(0);
  });
});
