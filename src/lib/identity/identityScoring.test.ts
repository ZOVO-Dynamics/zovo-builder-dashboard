import { describe, it, expect } from "vitest";
import { computeIdentityEvidence } from "./identityScoring";
import type { DocumentAnalysis } from "./types";

function makeAnalysis(overrides: Partial<DocumentAnalysis> = {}): DocumentAnalysis {
  return {
    detectedType: "DRIVERS_LICENSE",
    documentStatus: "VALID",
    expired: false,
    qualityScore: 80,
    ocrConfidence: 90,
    dHash: "abc123",
    pHash: "def456",
    fields: {
      firstName: "Jean",
      lastName: "Dupont",
      fullName: "Jean Dupont",
      dateOfBirth: new Date("1990-01-15"),
      documentNumber: "A1234567",
      issuedDate: new Date("2020-01-01"),
      expirationDate: new Date("2030-01-01"),
      countryCode: "CA",
      region: "QC",
    },
    ...overrides,
  };
}

describe("computeIdentityEvidence", () => {
  it("document valide, coherent avec le compte -> VERIFIED, score eleve", () => {
    const doc = makeAnalysis();
    const result = computeIdentityEvidence([doc], "Jean Dupont", null);

    expect(result.identityStatus).toBe("VERIFIED");
    expect(result.expired).toBe(false);
    expect(result.identityEvidenceScore).toBeGreaterThanOrEqual(70);
  });

  it("document expire mais par ailleurs solide -> VERIFIED_EXPIRED_DOCUMENT, JAMAIS REJECTED, score non penalise", () => {
    const doc = makeAnalysis({
      documentStatus: "EXPIRED",
      expired: true,
      fields: { ...makeAnalysis().fields, expirationDate: new Date("2020-01-01") },
    });
    const result = computeIdentityEvidence([doc], "Jean Dupont", null);

    expect(result.identityStatus).toBe("VERIFIED_EXPIRED_DOCUMENT");
    expect(result.expired).toBe(true);
    expect(result.identityEvidenceScore).toBeGreaterThanOrEqual(70);
    // Le signal d'expiration ne retire jamais de points.
    const expirySignal = result.signals.find((s) => s.type === "DOCUMENT_EXPIRED");
    expect(expirySignal?.points).toBe(0);
  });

  it("tous les documents illisibles -> REJECTED (0 preuve exploitable)", () => {
    const doc = makeAnalysis({ documentStatus: "UNREADABLE", ocrConfidence: 0 });
    const result = computeIdentityEvidence([doc], "Jean Dupont", null);

    expect(result.identityStatus).toBe("REJECTED");
    expect(result.identityEvidenceScore).toBe(0);
  });

  it("aucun document fourni -> REJECTED", () => {
    const result = computeIdentityEvidence([], "Jean Dupont", null);
    expect(result.identityStatus).toBe("REJECTED");
  });

  it("informations incompatibles entre deux documents (score faible) -> REJECTED, jamais juste pour expiration", () => {
    const doc1 = makeAnalysis({ fields: { ...makeAnalysis().fields, fullName: "Jean Dupont" }, qualityScore: 55, ocrConfidence: 40 });
    const doc2 = makeAnalysis({ fields: { ...makeAnalysis().fields, fullName: "Marie Tremblay" }, qualityScore: 55, ocrConfidence: 40 });
    const result = computeIdentityEvidence([doc1, doc2], "Jean Dupont", null);

    expect(result.signals.some((s) => s.type === "NAME_MISMATCH_CROSS_DOCUMENT")).toBe(true);
    expect(result.reviewRequired).toBe(true);
  });

  it("informations partielles/incompletes (dates non extraites) -> pas de penalite injustifiee, NEEDS_REVIEW plutot que REJECTED", () => {
    const doc = makeAnalysis({
      documentStatus: "VALID",
      ocrConfidence: 55, // sous le seuil de fiabilite (60), mais document lisible
      fields: { ...makeAnalysis().fields, documentNumber: null, issuedDate: null },
    });
    const result = computeIdentityEvidence([doc], "Jean Dupont", null);

    expect(result.identityStatus).not.toBe("REJECTED");
  });

  it("deuxieme document renforce ou egale la preuve (jamais moins bien qu'un seul document)", () => {
    const expiredDoc = makeAnalysis({
      documentStatus: "EXPIRED",
      expired: true,
      qualityScore: 55,
      ocrConfidence: 55,
      fields: { ...makeAnalysis().fields, expirationDate: new Date("2020-01-01") },
    });
    const soloResult = computeIdentityEvidence([expiredDoc], "Jean Dupont", null);

    const secondDoc = makeAnalysis({ detectedType: "GOVERNMENT_ID" });
    const combinedResult = computeIdentityEvidence([expiredDoc, secondDoc], "Jean Dupont", null);

    expect(combinedResult.identityEvidenceScore).toBeGreaterThanOrEqual(soloResult.identityEvidenceScore);
    expect(combinedResult.identityStatus).toBe("VERIFIED_EXPIRED_DOCUMENT");
  });

  it("document suspecte falsifie -> REJECTED, revision requise", () => {
    const doc = makeAnalysis({ documentStatus: "SUSPECTED_FAKE" });
    const result = computeIdentityEvidence([doc], "Jean Dupont", null);

    expect(result.identityStatus).toBe("REJECTED");
    expect(result.reviewRequired).toBe(true);
  });

  it("nom du compte different des documents -> signal de mismatch, pas de credit +10", () => {
    const doc = makeAnalysis();
    const result = computeIdentityEvidence([doc], "Quelqu'un d'autre", null);

    expect(result.signals.some((s) => s.type === "NAME_MISMATCH_ACCOUNT")).toBe(true);
    expect(result.signals.some((s) => s.type === "NAME_MATCH_ACCOUNT")).toBe(false);
  });
});
