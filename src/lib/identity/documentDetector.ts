import type { DocumentType } from "./types";

/**
 * Detection du type de document a partir du texte OCR brut - sert de
 * signal de coherence contre le type declare par l'utilisateur au moment
 * du televersement, pas de source de verite absolue (les formats varient
 * trop d'une juridiction a l'autre pour une detection fiable a 100%).
 */
const KEYWORDS: Record<DocumentType, string[]> = {
  DRIVERS_LICENSE: [
    "PERMIS DE CONDUIRE", "DRIVER", "DRIVING LICENCE", "DRIVING LICENSE",
    "CLASSE", "CLASS", "SAAQ",
  ],
  PASSPORT: [
    "PASSPORT", "PASSEPORT", "PASSPORT NO", "TYPE P", "P<CAN",
  ],
  GOVERNMENT_ID: [
    "CARTE D'IDENTITE", "IDENTITY CARD", "ID CARD", "GOVERNMENT ISSUED",
    "NATIONAL ID", "PIECE D'IDENTITE",
  ],
  HEALTH_INSURANCE_CARD: [
    "ASSURANCE MALADIE", "HEALTH INSURANCE", "CARTE SOLEIL", "RAMQ",
    "MEDICARE", "CARTE SANTE",
  ],
  BIRTH_CERTIFICATE: [
    "CERTIFICAT DE NAISSANCE", "BIRTH CERTIFICATE", "ACTE DE NAISSANCE",
    "DIRECTEUR DE L'ETAT CIVIL", "REGISTRAR",
  ],
};

export function detectDocumentType(rawText: string): { type: DocumentType | null; matchedKeywords: string[] } {
  const upperText = rawText.toUpperCase();

  let bestType: DocumentType | null = null;
  let bestMatches: string[] = [];

  for (const [type, keywords] of Object.entries(KEYWORDS) as [DocumentType, string[]][]) {
    const matches = keywords.filter((kw) => upperText.includes(kw));
    if (matches.length > bestMatches.length) {
      bestMatches = matches;
      bestType = type;
    }
  }

  return { type: bestMatches.length > 0 ? bestType : null, matchedKeywords: bestMatches };
}
