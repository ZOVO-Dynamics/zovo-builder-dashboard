import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("autorise les requêtes sous la limite", () => {
    const key = `test-${Date.now()}-1`;
    const result = rateLimit(key, 3, 60_000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("bloque une fois la limite atteinte", () => {
    const key = `test-${Date.now()}-2`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    const third = rateLimit(key, 2, 60_000);
    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("réinitialise après expiration de la fenêtre", async () => {
    const key = `test-${Date.now()}-3`;
    rateLimit(key, 1, 50);
    const blocked = rateLimit(key, 1, 50);
    expect(blocked.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const afterReset = rateLimit(key, 1, 50);
    expect(afterReset.success).toBe(true);
  });

  it("gère des clés différentes indépendamment", () => {
    const keyA = `test-${Date.now()}-a`;
    const keyB = `test-${Date.now()}-b`;
    rateLimit(keyA, 1, 60_000);
    const resultA = rateLimit(keyA, 1, 60_000);
    const resultB = rateLimit(keyB, 1, 60_000);

    expect(resultA.success).toBe(false);
    expect(resultB.success).toBe(true);
  });
});
