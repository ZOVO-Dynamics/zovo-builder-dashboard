import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    repairJob: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: { create: vi.fn() },
    },
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 9, resetAt: Date.now() + 1000 })),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

function makeRequest(body: unknown) {
  return { json: async () => body } as never;
}

describe("POST /api/repair/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockReturnValue({ success: true, remaining: 9, resetAt: Date.now() + 1000 });
  });

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const res = await POST(makeRequest({ projectId: "p1" }));
    expect(res.status).toBe(401);
  });

  it("refuse si projectId est manquant", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("refuse un projet n'appartenant pas à l'utilisateur", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: "p1", userId: "another_user" } as never);

    const res = await POST(makeRequest({ projectId: "p1" }));
    expect(res.status).toBe(403);
  });

  it("refuse si un job de réparation est déjà en attente/en cours sur ce projet", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: "p1", userId: "user_1", name: "X" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user_1", email: "a@b.com" } as never);
    vi.mocked(prisma.repairJob.findFirst).mockResolvedValue({ id: "job_existing" } as never);

    const res = await POST(makeRequest({ projectId: "p1" }));
    expect(res.status).toBe(409);
  });

  it("crée une session Stripe en mode paiement unique (jamais un abonnement) pour un propriétaire valide", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: "p1", userId: "user_1", name: "X" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user_1", email: "a@b.com" } as never);
    vi.mocked(prisma.repairJob.findFirst).mockResolvedValue(null as never);
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({ url: "https://checkout.stripe.com/xyz" } as never);

    const res = await POST(makeRequest({ projectId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.url).toBe("https://checkout.stripe.com/xyz");

    const createArgs = vi.mocked(stripe.checkout.sessions.create).mock.calls[0]?.[0] as {
      mode?: string;
      metadata?: { kind?: string; repairProjectId?: string };
    };
    expect(createArgs.mode).toBe("payment");
    expect(createArgs.metadata?.kind).toBe("repair");
    expect(createArgs.metadata?.repairProjectId).toBe("p1");
  });

  it("applique le rate limiting", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user_1" } } as never);
    vi.mocked(rateLimit).mockReturnValue({ success: false, remaining: 0, resetAt: Date.now() });

    const res = await POST(makeRequest({ projectId: "p1" }));
    expect(res.status).toBe(429);
  });
});
