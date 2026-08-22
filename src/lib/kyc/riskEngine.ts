import type { Signal, RiskResult } from "./types";

const QUALITY_HARD_REJECT_THRESHOLD = 35;
const NAME_SIMILARITY_THRESHOLD = 0.7; // en-dessous de 70% de similarite -> mismatch
const DUPLICATE_HASH_MAX_DISTANCE = 10; // sur 64 bits : ~15% de bits differents

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents
    .toUpperCase()
    .replace(/[^A-Z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/** Similarite normalisee 0-1 (1 = identique), tolerante aux petites erreurs OCR. */
export function nameSimilarity(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  if (!normA || !normB) return 0;
  const distance = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return 1 - distance / maxLen;
}

export { QUALITY_HARD_REJECT_THRESHOLD, NAME_SIMILARITY_THRESHOLD, DUPLICATE_HASH_MAX_DISTANCE };

/**
 * Combine les signaux en un score de risque et un statut.
 *
 * Important : le pipeline automatique ne renvoie jamais REJECTED_FRAUD -
 * ce statut n'est ecrit que par une decision manuelle d'admin (voir
 * /api/admin/identity-verifications/[id]). Un score eleve produit au
 * maximum FLAGGED : "signaux suspects", pas "fraude confirmee".
 */
export function computeRisk(signals: Signal[]): RiskResult {
  const hasHardQualityReject = signals.some((s) => s.type === "IMAGE_QUALITY" && s.severity >= 100);
  if (hasHardQualityReject) {
    return { status: "REJECTED_QUALITY", riskScore: 100, signals };
  }

  const riskScore = Math.min(100, signals.reduce((sum, s) => sum + s.severity, 0));
  const status = riskScore >= 20 ? "FLAGGED" : "PASSED";

  return { status, riskScore, signals };
}
