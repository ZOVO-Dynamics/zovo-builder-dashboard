import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
    usageLimit: {
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      create: vi.fn(),
    },
    generation: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "./prisma";
import { checkGenerationEntitlement } from "./entitlements";

describe("checkGenerationEntitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("autorise la génération si l'abonnement actif a des générations restantes", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub_1",
      status: "active",
      currentPeriodEnd: future,
      currentPeriodStart: now,
      plan: { billingInterval: "month", generationsLimit: 10 },
      usageLimits: [
        {
          periodStart: new Date(now.getTime() - 1000),
          periodEnd: future,
          generationsUsed: 3,
          generationsCap: 10,
        },
      ],
    } as never);

    const result = await checkGenerationEntitlement("user_1");

    expect(result.allowed).toBe(true);
    expect(result.source).toBe("subscription");
    expect(result.remaining).toBe(7);
  });

  it("bloque la génération si le quota de l'abonnement est épuisé", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 10);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub_1",
      status: "active",
      currentPeriodEnd: future,
      currentPeriodStart: now,
      plan: { billingInterval: "month", generationsLimit: 10 },
      usageLimits: [
        {
          periodStart: new Date(now.getTime() - 1000),
          periodEnd: future,
          generationsUsed: 10,
          generationsCap: 10,
        },
      ],
    } as never);

    const result = await checkGenerationEntitlement("user_1");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Limite de générations atteinte pour cette période");
    expect(result.remaining).toBe(0);
  });

  it("bascule sur les crédits si aucun abonnement actif, et autorise si le solde est positif", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      creditsBalance: 5,
    } as never);

    const result = await checkGenerationEntitlement("user_2");

    expect(result.allowed).toBe(true);
    expect(result.source).toBe("credits");
    expect(result.remaining).toBe(5);
  });

  it("bloque si aucun abonnement actif et solde de crédits épuisé", async () => {
    vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      creditsBalance: 0,
    } as never);

    const result = await checkGenerationEntitlement("user_3");

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("Solde de crédits insuffisant");
  });

  it("traite un abonnement expiré (currentPeriodEnd dans le passé) comme inactif, bascule sur les crédits", async () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);

    vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
      id: "sub_1",
      status: "active",
      currentPeriodEnd: past,
      plan: { billingInterval: "month", generationsLimit: 10 },
      usageLimits: [],
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      creditsBalance: 2,
    } as never);

    const result = await checkGenerationEntitlement("user_4");

    expect(result.source).toBe("credits");
    expect(result.allowed).toBe(true);
  });
});
