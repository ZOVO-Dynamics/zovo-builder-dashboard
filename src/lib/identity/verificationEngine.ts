import { prisma } from "@/lib/prisma";
import { analyzeImageQuality } from "./imageQuality";
import { computeDHash, computePHash, hammingDistance } from "./imageHash";
import { runOcr } from "./ocrEngine";
import { detectDocumentType } from "./documentDetector";
import { parseDocumentFields } from "./documentParser";
import { computeIdentityEvidence } from "./identityScoring";
import type { DocumentAnalysis, DocumentType, IdentityVerificationResult, Signal } from "./types";

const QUALITY_HARD_REJECT_THRESHOLD = 35;
const DUPLICATE_HASH_MAX_DISTANCE = 10; // sur 64 bits

/**
 * Detection heuristique et volontairement conservatrice - une vraie
 * detection de falsification (analyse de compression, ELA, etc.)
 * depasse la portee d'un systeme construit en interne sans service tiers.
 * Ne se declenche que dans un cas net : image nette, mais aucun mot-cle
 * de document reconnu ET OCR quasi inexploitable malgre la nettete -
 * incoherence qui merite une revue humaine plutot qu'un rejet automatique
 * silencieux.
 */
function isSuspectedFake(qualityScore: number, detectedType: DocumentType | null, ocrConfidence: number): boolean {
  return qualityScore >= 70 && detectedType === null && ocrConfidence < 20;
}

const UNREADABLE_ANALYSIS: Omit<DocumentAnalysis, "qualityScore" | "dHash"> = {
  detectedType: null,
  documentStatus: "UNREADABLE",
  expired: false,
  ocrConfidence: 0,
  pHash: "",
  fields: {
    firstName: null, lastName: null, fullName: null, dateOfBirth: null,
    documentNumber: null, issuedDate: null, expirationDate: null,
    countryCode: null, region: null,
  },
};

async function analyzeDocument(buffer: Buffer, declaredType: DocumentType): Promise<DocumentAnalysis> {
  let qualityScore: number;
  try {
    qualityScore = await analyzeImageQuality(buffer);
  } catch {
    // Format non decodable par sharp (ex: PDF sur cette installation, image
    // corrompue passee au travers de la verification des magic bytes) :
    // traite comme illisible plutot que de faire planter tout le pipeline.
    return { ...UNREADABLE_ANALYSIS, qualityScore: 0, dHash: "" };
  }

  if (qualityScore < QUALITY_HARD_REJECT_THRESHOLD) {
    return {
      ...UNREADABLE_ANALYSIS,
      qualityScore,
      dHash: await computeDHash(buffer).catch(() => ""),
    };
  }

  let dHash: string, pHash: string, ocr: Awaited<ReturnType<typeof runOcr>>;
  try {
    [dHash, pHash, ocr] = await Promise.all([computeDHash(buffer), computePHash(buffer), runOcr(buffer)]);
  } catch {
    return { ...UNREADABLE_ANALYSIS, qualityScore, dHash: "" };
  }

  const { type: detectedType } = detectDocumentType(ocr.rawText);
  const fields = parseDocumentFields(ocr.rawText);

  const expired = Boolean(fields.expirationDate && fields.expirationDate.getTime() < Date.now());
  const suspectedFake = isSuspectedFake(qualityScore, detectedType, ocr.confidence);

  let documentStatus: DocumentAnalysis["documentStatus"];
  if (suspectedFake) documentStatus = "SUSPECTED_FAKE";
  else if (expired) documentStatus = "EXPIRED";
  else if (qualityScore < 60) documentStatus = "QUALITY_ISSUE";
  else documentStatus = "VALID";

  return {
    detectedType: detectedType ?? declaredType,
    documentStatus,
    expired,
    qualityScore,
    ocrConfidence: ocr.confidence,
    dHash,
    pHash,
    fields,
  };
}

async function findDuplicateOwner(analysis: DocumentAnalysis, excludeUserId: string | undefined): Promise<string | null> {
  if (!analysis.dHash) return null;

  const candidates = await prisma.identityDocument.findMany({
    where: excludeUserId ? { userId: { not: excludeUserId } } : {},
    select: { userId: true, dHash: true, pHash: true },
  });

  for (const candidate of candidates) {
    if (!candidate.dHash) continue;
    const dDistance = hammingDistance(analysis.dHash, candidate.dHash);
    const pDistance = analysis.pHash && candidate.pHash ? hammingDistance(analysis.pHash, candidate.pHash) : 64;
    if (dDistance <= DUPLICATE_HASH_MAX_DISTANCE || pDistance <= DUPLICATE_HASH_MAX_DISTANCE) {
      return candidate.userId;
    }
  }
  return null;
}

export interface VerifyDocumentInput {
  buffer: Buffer;
  declaredType: DocumentType;
}

export interface VerificationEngineInput {
  documents: VerifyDocumentInput[];
  accountName: string | null;
  accountDob: Date | null;
  excludeUserId?: string;
}

export interface VerificationEngineOutput {
  result: IdentityVerificationResult;
  documentAnalyses: DocumentAnalysis[];
}

export async function runVerification(input: VerificationEngineInput): Promise<VerificationEngineOutput> {
  const documentAnalyses = await Promise.all(
    input.documents.map((d) => analyzeDocument(d.buffer, d.declaredType))
  );

  const result = computeIdentityEvidence(documentAnalyses, input.accountName, input.accountDob);

  // Detection de doublons - signal supplementaire, ne change pas
  // REJECTED/VERIFIED a lui seul mais force une revue humaine.
  const duplicateOwners = await Promise.all(
    documentAnalyses
      .filter((a) => a.documentStatus !== "UNREADABLE")
      .map((a) => findDuplicateOwner(a, input.excludeUserId))
  );
  if (duplicateOwners.some(Boolean)) {
    const duplicateSignal: Signal = {
      type: "DUPLICATE_DOCUMENT",
      points: 0,
      message: "Document similaire deja utilise par un autre compte",
    };
    result.signals.push(duplicateSignal);
    result.reviewRequired = true;
    if (result.identityStatus === "VERIFIED" || result.identityStatus === "VERIFIED_EXPIRED_DOCUMENT") {
      result.identityStatus = "NEEDS_REVIEW";
    }
  }

  return { result, documentAnalyses };
}
