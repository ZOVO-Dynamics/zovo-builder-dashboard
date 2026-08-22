import { describe, it, expect } from "vitest";
import { detectDocumentType } from "./documentDetector";

describe("detectDocumentType - cas limites de documents invalides/illisibles", () => {
  it("texte vide (OCR n'a rien extrait) -> aucun type detecte", () => {
    const result = detectDocumentType("");
    expect(result.type).toBeNull();
    expect(result.matchedKeywords).toEqual([]);
  });

  it("texte OCR bruite sans mot-cle reconnu -> aucun type detecte", () => {
    const result = detectDocumentType("xk3 ##@ jd93 ---- illegible garbage 4471");
    expect(result.type).toBeNull();
  });

  it("texte contenant seulement des mots-cles non pertinents -> aucun type detecte", () => {
    const result = detectDocumentType("FACTURE RECU PAIEMENT MERCI");
    expect(result.type).toBeNull();
  });

  it("insensible a la casse (mots-cles en minuscules)", () => {
    const result = detectDocumentType("permis de conduire - classe 5");
    expect(result.type).toBe("DRIVERS_LICENSE");
  });

  it("document ambigu contenant des mots-cles de deux types differents -> retient celui avec le plus de correspondances", () => {
    const result = detectDocumentType("PASSPORT PASSEPORT TYPE P CARTE D'IDENTITE");
    expect(result.type).toBe("PASSPORT");
    expect(result.matchedKeywords.length).toBeGreaterThan(1);
  });

  it("un seul mot-cle correspondant -> type retenu quand meme", () => {
    const result = detectDocumentType("Voici mon RAMQ pour la clinique");
    expect(result.type).toBe("HEALTH_INSURANCE_CARD");
  });
});
