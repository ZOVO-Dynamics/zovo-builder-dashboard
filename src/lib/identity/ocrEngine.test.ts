import { describe, it, expect, vi } from "vitest";

/**
 * Le vrai worker Tesseract est lourd et lent a demarrer - ces tests
 * mockent tesseract.js pour verrouiller le comportement de timeout
 * (celui qui a corrige le hang de /api/register en production, cause
 * d'un 524 systematique cote Cloudflare) sans jamais attendre un vrai
 * traitement OCR.
 */

describe("runOcr - délai dépassé", () => {
  it("recognize() qui ne se termine jamais -> rejette avant le timeout injecté, sans faire pendre l'appelant", async () => {
    vi.resetModules();
    const terminate = vi.fn().mockResolvedValue(undefined);
    vi.doMock("tesseract.js", () => ({
      createWorker: vi.fn().mockResolvedValue({
        recognize: () => new Promise(() => {}), // ne se resout jamais
        terminate,
      }),
    }));

    const { runOcr } = await import("./ocrEngine");
    await expect(runOcr(Buffer.from("fake"), 50)).rejects.toThrow(/délai dépassé/);
    // Le worker est tout de meme termine (en arriere-plan), pas de fuite silencieuse.
    await new Promise((r) => setTimeout(r, 10));
    expect(terminate).toHaveBeenCalled();
  });

  it("recognize() qui reussit avant le timeout -> retourne normalement le resultat", async () => {
    vi.resetModules();
    const terminate = vi.fn().mockResolvedValue(undefined);
    vi.doMock("tesseract.js", () => ({
      createWorker: vi.fn().mockResolvedValue({
        recognize: vi.fn().mockResolvedValue({ data: { text: "PERMIS DE CONDUIRE", confidence: 88 } }),
        terminate,
      }),
    }));

    const { runOcr } = await import("./ocrEngine");
    const result = await runOcr(Buffer.from("fake"), 5000);
    expect(result).toEqual({ rawText: "PERMIS DE CONDUIRE", confidence: 88 });
    expect(terminate).toHaveBeenCalled();
  });
});
