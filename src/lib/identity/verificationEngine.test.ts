import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    identityDocument: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@/lib/prisma";
import { runVerification } from "./verificationEngine";

/**
 * Tests d'integration legers : confirment que le vrai OCR (tesseract.js)
 * et les vrais hashs perceptuels sont correctement branches dans le
 * pipeline. La logique de decision (statuts, score, expiration) est
 * testee unitairement et de facon fiable dans identityScoring.test.ts -
 * un fond d'image synthetique n'imite pas assez bien la texture d'une
 * vraie photo pour que les seuils de qualite y soient representatifs.
 */
async function makeDocImage(name: string, label = "PERMIS DE CONDUIRE") {
  const svg = `
  <svg width="600" height="380" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="380" fill="white"/>
    <text x="30" y="60" font-size="28" font-family="Arial" fill="black">${label}</text>
    <text x="30" y="150" font-size="34" font-family="Arial" fill="black">${name}</text>
    <text x="30" y="200" font-size="22" font-family="Arial" fill="black">DATE DE NAISSANCE</text>
    <text x="30" y="230" font-size="26" font-family="Arial" fill="black">1990-01-15</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

describe("runVerification - integration OCR/hash reels", () => {
  beforeEach(() => vi.clearAllMocks());

  it("extrait correctement le type de document et le nom via l'OCR reel", async () => {
    vi.mocked(prisma.identityDocument.findMany).mockResolvedValue([]);
    const buffer = await makeDocImage("JEAN DUPONT");

    const { documentAnalyses } = await runVerification({
      documents: [{ buffer, declaredType: "DRIVERS_LICENSE" }],
      accountName: "Jean Dupont",
      accountDob: null,
    });

    expect(documentAnalyses[0].detectedType).toBe("DRIVERS_LICENSE");
    expect(documentAnalyses[0].fields.fullName).toBe("JEAN DUPONT");
    expect(documentAnalyses[0].fields.dateOfBirth?.toISOString().slice(0, 10)).toBe("1990-01-15");
  }, 15000);

  it("document extremement flou -> UNREADABLE, court-circuite l'OCR", async () => {
    const sharpDoc = await makeDocImage("JEAN DUPONT");
    const blurry = await sharp(sharpDoc).blur(30).toBuffer();

    const { documentAnalyses } = await runVerification({
      documents: [{ buffer: blurry, declaredType: "DRIVERS_LICENSE" }],
      accountName: "Jean Dupont",
      accountDob: null,
    });

    expect(documentAnalyses[0].documentStatus).toBe("UNREADABLE");
    expect(documentAnalyses[0].fields.fullName).toBeNull();
  }, 15000);

  it("detection de doublon reelle via dHash/pHash entre deux comptes", async () => {
    const buffer = await makeDocImage("JEAN DUPONT");
    const { computeDHash, computePHash } = await import("./imageHash");
    const dHash = await computeDHash(buffer);
    const pHash = await computePHash(buffer);

    vi.mocked(prisma.identityDocument.findMany).mockResolvedValue([
      { userId: "another-user", dHash, pHash },
    ] as never);

    const { result } = await runVerification({
      documents: [{ buffer, declaredType: "DRIVERS_LICENSE" }],
      accountName: "Jean Dupont",
      accountDob: null,
      excludeUserId: "current-user",
    });

    expect(result.signals.some((s) => s.type === "DUPLICATE_DOCUMENT")).toBe(true);
    expect(result.reviewRequired).toBe(true);
  }, 15000);
});
