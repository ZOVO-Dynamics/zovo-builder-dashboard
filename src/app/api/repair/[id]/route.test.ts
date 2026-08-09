import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repairJob: { findFirst: vi.fn() },
  },
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/repair/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await GET({} as never, makeParams("job_1"));
    expect(res.status).toBe(401);
  });

  it("renvoie 202 PENDING_WEBHOOK si le job n'existe pas encore (webhook pas encore traité)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.repairJob.findFirst).mockResolvedValue(null as never);

    const res = await GET({} as never, makeParams("cs_test_123"));
    expect(res.status).toBe(202);
  });

  it("refuse l'accès si le job n'appartient pas à l'utilisateur courant", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.repairJob.findFirst).mockResolvedValue({ id: "job_1", userId: "another_user", status: "FIXING" } as never);

    const res = await GET({} as never, makeParams("job_1"));
    expect(res.status).toBe(403);
  });

  it("renvoie le statut pour le propriétaire du job", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.repairJob.findFirst).mockResolvedValue({
      id: "job_1",
      userId: "user_1",
      status: "FIXING",
      validationStatus: "PENDING",
      attempts: 1,
      errorsDetected: 5,
      errorsFixed: 2,
      failureReason: null,
      startedAt: new Date(),
      completedAt: null,
    } as never);

    const res = await GET({} as never, makeParams("job_1"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("FIXING");
  });
});
