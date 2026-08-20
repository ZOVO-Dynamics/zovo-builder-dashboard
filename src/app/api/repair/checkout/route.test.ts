import { describe, it, expect } from "vitest";
import { POST } from "./route";

function makeRequest(body: unknown) {
  return { json: async () => body } as never;
}

describe("POST /api/repair/checkout", () => {
  it("renvoie 403 : fonctionnalité désactivée temporairement (décision produit du 15 août 2026)", async () => {
    const res = await POST(makeRequest({ projectId: "p1" }));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.success).toBe(false);
  });
});
