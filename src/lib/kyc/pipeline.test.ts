import { describe, it, expect, vi, beforeEach } from "vitest";
import sharp from "sharp";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    identityDocument: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@/lib/prisma";
import { runKycPipeline } from "./pipeline";

async function makeDocImage(name: string, dob: string, label: string) {
  const svg = `
  <svg width="600" height="380" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="380" fill="white"/>
    <text x="30" y="60" font-size="28" font-family="Arial" fill="black">${label}</text>
    <text x="30" y="150" font-size="34" font-family="Arial" fill="black">${name}</text>
    <text x="30" y="200" font-size="22" font-family="Arial" fill="black">DATE DE NAISSANCE</text>
    <text x="30" y="230" font-size="26" font-family="Arial" fill="black">${dob}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

describe("runKycPipeline (bout en bout, OCR + hash reels)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("PASSED : deux documents coherents, nom du compte concordant, pas de doublon", async () => {
    vi.mocked(prisma.identityDocument.findMany).mockResolvedValue([]);

    const driversLicense = await makeDocImage("JEAN DUPONT", "1990-01-15", "PERMIS DE CONDUIRE");
    const healthInsuranceCard = await makeDocImage("JEAN DUPONT", "1990-01-15", "CARTE ASSURANCE MALADIE");

    const output = await runKycPipeline({
      driversLicense,
      healthInsuranceCard,
      accountName: "Jean Dupont",
    });

    expect(output.result.status).toBe("PASSED");
    expect(output.result.riskScore).toBeLessThan(20);
  }, 15000);

  it("FLAGGED : noms differents entre les deux documents", async () => {
    vi.mocked(prisma.identityDocument.findMany).mockResolvedValue([]);

    const driversLicense = await makeDocImage("JEAN DUPONT", "1990-01-15", "PERMIS DE CONDUIRE");
    const healthInsuranceCard = await makeDocImage("MARIE TREMBLAY", "1990-01-15", "CARTE ASSURANCE MALADIE");

    const output = await runKycPipeline({
      driversLicense,
      healthInsuranceCard,
      accountName: "Jean Dupont",
    });

    expect(output.result.status).toBe("FLAGGED");
    expect(output.result.signals.some((s) => s.type === "NAME_MISMATCH_CROSS_DOCUMENT")).toBe(true);
  }, 15000);

  it("FLAGGED : document deja utilise par un autre compte (doublon)", async () => {
    const driversLicense = await makeDocImage("JEAN DUPONT", "1990-01-15", "PERMIS DE CONDUIRE");
    const healthInsuranceCard = await makeDocImage("JEAN DUPONT", "1990-01-15", "CARTE ASSURANCE MALADIE");

    // On calcule le vrai dHash du document pour simuler un doublon exact
    // deja present en base, appartenant a un autre utilisateur.
    const { computeDHash, computePHash } = await import("./imageHash");
    const existingHash = await computeDHash(driversLicense);
    const existingPHash = await computePHash(driversLicense);

    vi.mocked(prisma.identityDocument.findMany).mockResolvedValue([
      { userId: "another-user", dHash: existingHash, pHash: existingPHash },
    ] as never);

    const output = await runKycPipeline({
      driversLicense,
      healthInsuranceCard,
      accountName: "Jean Dupont",
      excludeUserId: "current-user",
    });

    expect(output.result.status).toBe("FLAGGED");
    expect(output.result.signals.some((s) => s.type === "DUPLICATE_DOCUMENT")).toBe(true);
  }, 15000);

  it("REJECTED_QUALITY : document illisible (flou extreme), rien d'autre n'est calcule", async () => {
    vi.mocked(prisma.identityDocument.findMany).mockResolvedValue([]);

    const sharpDoc = await makeDocImage("JEAN DUPONT", "1990-01-15", "PERMIS DE CONDUIRE");
    const blurryDoc = await sharp(sharpDoc).blur(30).toBuffer();

    const output = await runKycPipeline({
      driversLicense: blurryDoc,
      healthInsuranceCard: sharpDoc,
      accountName: "Jean Dupont",
    });

    expect(output.result.status).toBe("REJECTED_QUALITY");
    expect(output.result.riskScore).toBe(100);
    // Le document flou individuellement n'est pas passe a l'OCR (cout evite).
    expect(output.driversLicenseAnalysis.extractedName).toBeNull();
  }, 15000);
});
