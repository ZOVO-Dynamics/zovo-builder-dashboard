import { prisma } from "@/lib/prisma";
import { analyzeImageQuality } from "./qualityAnalyzer";
import { computeDHash, computePHash, hammingDistance } from "./imageHash";
import { extractDocumentData } from "./ocrExtract";
import {
  computeRisk,
  nameSimilarity,
  QUALITY_HARD_REJECT_THRESHOLD,
  NAME_SIMILARITY_THRESHOLD,
  DUPLICATE_HASH_MAX_DISTANCE,
} from "./riskEngine";
import type { Signal, RiskResult, DocumentAnalysis } from "./types";

export interface KycInput {
  driversLicense: Buffer;
  healthInsuranceCard: Buffer;
  /** Nom saisi au formulaire d'inscription, pour la coherence compte <-> document. */
  accountName: string | null;
  /** Utilisateur courant, exclu de la recherche de doublons (re-upload de ses propres documents). */
  excludeUserId?: string;
}

export interface KycOutput {
  result: RiskResult;
  driversLicenseAnalysis: DocumentAnalysis;
  healthInsuranceCardAnalysis: DocumentAnalysis;
}

async function analyzeDocument(buffer: Buffer): Promise<DocumentAnalysis> {
  const qualityScore = await analyzeImageQuality(buffer);

  // Sous le seuil de qualite, on court-circuite l'OCR (couteux) - le
  // document est de toute facon inutilisable pour l'inscription.
  if (qualityScore < QUALITY_HARD_REJECT_THRESHOLD) {
    return {
      qualityScore,
      dHash: await computeDHash(buffer),
      pHash: "",
      extractedName: null,
      extractedDob: null,
      ocrConfidence: 0,
    };
  }

  const [dHash, pHash, ocr] = await Promise.all([
    computeDHash(buffer),
    computePHash(buffer),
    extractDocumentData(buffer),
  ]);

  return {
    qualityScore,
    dHash,
    pHash,
    extractedName: ocr.extractedName,
    extractedDob: ocr.extractedDob,
    ocrConfidence: ocr.confidence,
  };
}

async function findDuplicate(
  analysis: DocumentAnalysis,
  excludeUserId: string | undefined
): Promise<string | null> {
  if (!analysis.dHash) return null;

  const candidates = await prisma.identityDocument.findMany({
    where: excludeUserId ? { userId: { not: excludeUserId } } : {},
    select: { userId: true, dHash: true, pHash: true },
  });

  for (const candidate of candidates) {
    if (!candidate.dHash) continue;
    const dDistance = hammingDistance(analysis.dHash, candidate.dHash);
    const pDistance =
      analysis.pHash && candidate.pHash ? hammingDistance(analysis.pHash, candidate.pHash) : 64;

    if (dDistance <= DUPLICATE_HASH_MAX_DISTANCE || pDistance <= DUPLICATE_HASH_MAX_DISTANCE) {
      return candidate.userId;
    }
  }

  return null;
}

export async function runKycPipeline(input: KycInput): Promise<KycOutput> {
  const [driversLicenseAnalysis, healthInsuranceCardAnalysis] = await Promise.all([
    analyzeDocument(input.driversLicense),
    analyzeDocument(input.healthInsuranceCard),
  ]);

  const signals: Signal[] = [];

  const worstQuality = Math.min(driversLicenseAnalysis.qualityScore, healthInsuranceCardAnalysis.qualityScore);
  if (worstQuality < QUALITY_HARD_REJECT_THRESHOLD) {
    signals.push({
      type: "IMAGE_QUALITY",
      severity: 100,
      message: "Document illisible (flou, sous/sur-exposition) - nouvelle photo requise",
    });
    // Court-circuit : pas la peine de calculer les autres signaux sur des
    // documents illisibles.
    return { result: computeRisk(signals), driversLicenseAnalysis, healthInsuranceCardAnalysis };
  } else if (worstQuality < 60) {
    signals.push({
      type: "IMAGE_QUALITY",
      severity: 8,
      message: "Qualite d'image moyenne (leger flou ou sous-exposition)",
    });
  }

  // Coherence croisee entre les deux documents.
  if (driversLicenseAnalysis.extractedName && healthInsuranceCardAnalysis.extractedName) {
    const similarity = nameSimilarity(driversLicenseAnalysis.extractedName, healthInsuranceCardAnalysis.extractedName);
    if (similarity < NAME_SIMILARITY_THRESHOLD) {
      signals.push({
        type: "NAME_MISMATCH_CROSS_DOCUMENT",
        severity: 30,
        message: `Nom different entre les deux documents ("${driversLicenseAnalysis.extractedName}" vs "${healthInsuranceCardAnalysis.extractedName}")`,
      });
    }
  } else {
    signals.push({
      type: "OCR_UNREADABLE",
      severity: 5,
      message: "Nom illisible sur au moins un document (OCR)",
    });
  }

  if (driversLicenseAnalysis.extractedDob && healthInsuranceCardAnalysis.extractedDob) {
    if (driversLicenseAnalysis.extractedDob.getTime() !== healthInsuranceCardAnalysis.extractedDob.getTime()) {
      signals.push({
        type: "DOB_MISMATCH_CROSS_DOCUMENT",
        severity: 25,
        message: "Date de naissance differente entre les deux documents",
      });
    }
  }

  // Coherence avec le nom saisi a l'inscription.
  if (input.accountName) {
    const namesToCheck = [driversLicenseAnalysis.extractedName, healthInsuranceCardAnalysis.extractedName].filter(
      (n): n is string => Boolean(n)
    );
    const bestMatch = Math.max(0, ...namesToCheck.map((n) => nameSimilarity(n, input.accountName!)));
    if (namesToCheck.length > 0 && bestMatch < NAME_SIMILARITY_THRESHOLD) {
      signals.push({
        type: "NAME_MISMATCH_ACCOUNT",
        severity: 20,
        message: `Le nom saisi a l'inscription ("${input.accountName}") ne correspond pas au nom lu sur les documents`,
      });
    }
  }

  // Detection de doublons - meme document deja utilise par un autre compte.
  const [dlDuplicateUserId, hicDuplicateUserId] = await Promise.all([
    findDuplicate(driversLicenseAnalysis, input.excludeUserId),
    findDuplicate(healthInsuranceCardAnalysis, input.excludeUserId),
  ]);

  if (dlDuplicateUserId || hicDuplicateUserId) {
    signals.push({
      type: "DUPLICATE_DOCUMENT",
      severity: 40,
      message: "Document similaire deja utilise par un autre compte",
    });
  }

  return { result: computeRisk(signals), driversLicenseAnalysis, healthInsuranceCardAnalysis };
}
