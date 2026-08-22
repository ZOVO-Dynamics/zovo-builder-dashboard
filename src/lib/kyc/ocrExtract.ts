import { createWorker } from "tesseract.js";

export interface OcrResult {
  rawText: string;
  confidence: number;
  extractedName: string | null;
  extractedDob: Date | null;
}

const DATE_PATTERNS = [
  /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/, // YYYY-MM-DD
  /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/, // DD-MM-YYYY ou MM-DD-YYYY
];

const NAME_LABEL_WORDS = new Set([
  "NOM", "PRENOM", "PRÉNOM", "NAME", "GIVEN", "SURNAME", "LICENSE", "PERMIS",
  "CONDUIRE", "ASSURANCE", "MALADIE", "QUEBEC", "QUÉBEC", "CANADA", "SEXE",
  "SEX", "CLASSE", "CLASS", "SIGNATURE", "EXP", "EXPIRY", "EXPIRATION",
  "NAISSANCE", "BIRTH", "HEIGHT", "TAILLE", "YEUX", "EYES",
]);

function parseDob(text: string): Date | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    const [, a, b, c] = match;
    // Determine si le premier groupe est l'annee (4 chiffres) ou le jour.
    const isYearFirst = a.length === 4;
    const year = Number(isYearFirst ? a : c);
    const month = Number(b);
    const day = Number(isYearFirst ? c : a);

    if (year < 1900 || year > new Date().getFullYear()) continue;
    if (month < 1 || month > 12) continue;
    if (day < 1 || day > 31) continue;

    const date = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

/**
 * Best-effort : cherche la ligne la plus probable pour un nom (tout en
 * majuscules, lettres/espaces/tirets uniquement, sans mot-cle d'etiquette
 * connu). Les documents reels varient trop d'une province/d'un type a
 * l'autre pour une extraction fiable a 100% - ce signal sert a la
 * coherence croisee, pas a une identification certaine.
 */
function parseName(text: string): string | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let best: string | null = null;
  let bestScore = 0;

  for (const line of lines) {
    if (!/^[A-ZÀ-Ÿ\s'-]+$/.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) continue;
    if (words.some((w) => NAME_LABEL_WORDS.has(w))) continue;

    const score = line.length;
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }

  return best;
}

export async function extractDocumentData(buffer: Buffer): Promise<OcrResult> {
  const worker = await createWorker("fra+eng");
  try {
    const { data } = await worker.recognize(buffer);
    return {
      rawText: data.text,
      confidence: data.confidence,
      extractedName: parseName(data.text),
      extractedDob: parseDob(data.text),
    };
  } finally {
    await worker.terminate();
  }
}
