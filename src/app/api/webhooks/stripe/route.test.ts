import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    repairJob: { findUnique: vi.fn(), create: vi.fn() },
    project: { findUnique: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    subscription: { upsert: vi.fn() },
    creditTransaction: { create: vi.fn() },
    connectAccount: { updateMany: vi.fn() },
  },
}));

vi.mock("@/core/RepairEngine", () => ({
  runRepairJob: vi.fn().mockResolvedValue({ ranAtAll: true }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn() };
  },
}));

import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { runRepairJob } from "@/core/RepairEngine";
import { POST } from "./route";

function makeCheckoutCompletedEvent(session: Record<string, unknown>) {
  return {
    type: "checkout.session.completed",
    data: { object: session },
  } as never;
}

function makeRequest(rawBody: string) {
  return {
    text: async () => rawBody,
    headers: { get: () => "fake-signature" },
  } as never;
}

describe("POST /api/webhooks/stripe — branche ZOVO Correction & Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("crée un RepairJob PAID et lance la réparation lors d'un premier paiement confirmé", async () => {
    const session = {
      id: "cs_test_1",
      payment_intent: "pi_1",
      amount_total: 2999,
      currency: "cad",
      metadata: { kind: "repair", userId: "user_1", repairProjectId: "project_1" },
    };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeCheckoutCompletedEvent(session));
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: "project_1", userId: "user_1" } as never);
    vi.mocked(prisma.repairJob.create).mockResolvedValue({ id: "job_new" } as never);

    const res = await POST(makeRequest("{}"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.received).toBe(true);
    expect(prisma.repairJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user_1",
          projectId: "project_1",
          stripeCheckoutSessionId: "cs_test_1",
          status: "PAID",
        }),
      })
    );
    expect(runRepairJob).toHaveBeenCalledWith("job_new");
  });

  it("ignore une re-livraison du même événement (idempotence) sans créer de doublon", async () => {
    const session = {
      id: "cs_test_1",
      payment_intent: "pi_1",
      metadata: { kind: "repair", userId: "user_1", repairProjectId: "project_1" },
    };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeCheckoutCompletedEvent(session));
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue({ id: "job_existing" } as never);

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(prisma.repairJob.create).not.toHaveBeenCalled();
    expect(runRepairJob).not.toHaveBeenCalled();
  });

  it("ignore silencieusement si le projet référencé n'appartient pas à l'utilisateur du paiement", async () => {
    const session = {
      id: "cs_test_2",
      metadata: { kind: "repair", userId: "user_1", repairProjectId: "project_1" },
    };
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(makeCheckoutCompletedEvent(session));
    vi.mocked(prisma.repairJob.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: "project_1", userId: "someone_else" } as never);

    const res = await POST(makeRequest("{}"));

    expect(res.status).toBe(200);
    expect(prisma.repairJob.create).not.toHaveBeenCalled();
  });

  it("refuse une signature Stripe manquante", async () => {
    const req = { text: async () => "{}", headers: { get: () => null } } as never;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
