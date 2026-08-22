import type { ExtractedFields } from "./types";

/**
 * Extraction de champs a partir du texte OCR brut - best-effort par
 * heuristiques/regex, pas un parseur de documents officiels robuste (les
 * gabarits varient trop d'une juridiction a l'autre). Sert de signal
 * d'entree a la coherence et au score, jamais de source de verite unique.
 */

const DATE_PATTERN = /\b(\d{4})[-/.](\d{2})[-/.](\d{2})\b|\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/g;

const DOB_LABELS = ["NAISSANCE", "BIRTH", "DOB", "NE(E) LE", "NÉ(E) LE"];
const ISSUED_LABELS = ["DELIVRE", "DÉLIVRÉ", "ISSUED", "ISSUE DATE", "DATE OF ISSUE", "EMIS"];
const EXPIRY_LABELS = ["EXPIRE", "EXPIRY", "EXPIRATION", "VALID UNTIL", "VALIDE JUSQU"];

const COUNTRY_KEYWORDS: Record<string, string> = {
  CANADA: "CA",
  "ÉTATS-UNIS": "US",
  "UNITED STATES": "US",
  USA: "US",
  FRANCE: "FR",
};

const REGION_KEYWORDS: Record<string, string> = {
  QUEBEC: "QC",
  QUÉBEC: "QC",
  ONTARIO: "ON",
  "COLOMBIE-BRITANNIQUE": "BC",
  ALBERTA: "AB",
  MANITOBA: "MB",
  "NOUVEAU-BRUNSWICK": "NB",
  "NOUVELLE-ECOSSE": "NS",
};

const NAME_LABEL_WORDS = new Set([
  "NOM", "PRENOM", "PRÉNOM", "NAME", "GIVEN", "SURNAME", "LICENSE", "PERMIS",
  "CONDUIRE", "ASSURANCE", "MALADIE", "QUEBEC", "QUÉBEC", "CANADA", "SEXE",
  "SEX", "CLASSE", "CLASS", "SIGNATURE", "EXP", "EXPIRY", "EXPIRATION",
  "NAISSANCE", "BIRTH", "HEIGHT", "TAILLE", "YEUX", "EYES", "PASSPORT",
  "PASSEPORT", "CERTIFICATE", "CERTIFICAT", "REGISTRAR", "GOVERNMENT",
]);

function parseDateToken(match: RegExpMatchArray): Date | null {
  const [, y1, m1, d1, d2, m2, y2] = match;
  const isYearFirst = Boolean(y1);
  const year = Number(isYearFirst ? y1 : y2);
  const month = Number(isYearFirst ? m1 : m2);
  const day = Number(isYearFirst ? d1 : d2);

  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Trouve la date la plus proche (meme ligne, puis lignes voisines) d'un des labels donnes. */
function findLabeledDate(lines: string[], labels: string[]): Date | null {
  const upperLabels = labels.map((l) => l.toUpperCase());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (!upperLabels.some((l) => line.includes(l))) continue;

    // Cherche une date sur la meme ligne, sinon la ligne suivante.
    for (const candidate of [lines[i], lines[i + 1] ?? ""]) {
      const matches = [...candidate.matchAll(DATE_PATTERN)];
      if (matches.length > 0) {
        const date = parseDateToken(matches[0]);
        if (date) return date;
      }
    }
  }
  return null;
}

function parseName(text: string): { fullName: string | null; firstName: string | null; lastName: string | null } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  let best: string | null = null;
  let bestScore = 0;

  for (const line of lines) {
    if (!/^[A-ZÀ-Ÿ\s'-]+$/.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) continue;
    if (words.some((w) => NAME_LABEL_WORDS.has(w))) continue;

    if (line.length > bestScore) {
      bestScore = line.length;
      best = line;
    }
  }

  if (!best) return { fullName: null, firstName: null, lastName: null };

  const parts = best.split(/\s+/);
  return {
    fullName: best,
    firstName: parts.length > 1 ? parts.slice(1).join(" ") : null,
    lastName: parts[0],
  };
}

function findDocumentNumber(text: string): string | null {
  const lines = text.split("\n");
  const labelPattern = /(N[OÚ°]|NUMERO|NUMÉRO|NUMBER|LICEN[CS]E N[OÚ°]?)\s*[:.]?\s*([A-Z0-9-]{5,20})/i;

  for (const line of lines) {
    const match = line.match(labelPattern);
    if (match?.[2]) return match[2];
  }

  // Repli : un token alphanumerique isole, majoritairement des chiffres,
  // de longueur plausible pour un numero de document.
  const fallback = text.match(/\b(?=[A-Z0-9-]{6,20}\b)(?=[A-Z0-9-]*\d)[A-Z0-9-]{6,20}\b/);
  return fallback?.[0] ?? null;
}

function findCountryAndRegion(text: string): { countryCode: string | null; region: string | null } {
  const upperText = text.toUpperCase();

  let countryCode: string | null = null;
  for (const [keyword, code] of Object.entries(COUNTRY_KEYWORDS)) {
    if (upperText.includes(keyword)) {
      countryCode = code;
      break;
    }
  }

  let region: string | null = null;
  for (const [keyword, code] of Object.entries(REGION_KEYWORDS)) {
    if (upperText.includes(keyword)) {
      region = code;
      if (!countryCode) countryCode = "CA";
      break;
    }
  }

  return { countryCode, region };
}

export function parseDocumentFields(rawText: string): ExtractedFields {
  const lines = rawText.split("\n");
  const { fullName, firstName, lastName } = parseName(rawText);
  const { countryCode, region } = findCountryAndRegion(rawText);

  return {
    firstName,
    lastName,
    fullName,
    dateOfBirth: findLabeledDate(lines, DOB_LABELS),
    documentNumber: findDocumentNumber(rawText),
    issuedDate: findLabeledDate(lines, ISSUED_LABELS),
    expirationDate: findLabeledDate(lines, EXPIRY_LABELS),
    countryCode,
    region,
  };
}
