import type { DocumentAnalysis, IdentityVerificationResult, Signal } from "./types";
import { nameSimilarity, datesMatch, NAME_SIMILARITY_THRESHOLD } from "./documentConsistency";

const USABLE_PHOTO_QUALITY_THRESHOLD = 50;
const OCR_RELIABLE_CONFIDENCE_THRESHOLD = 60;

const VERIFIED_SCORE_THRESHOLD = 70;
const NEEDS_REVIEW_SCORE_THRESHOLD = 40;

/**
 * Combine les preuves de un ou plusieurs documents en un score 0-100 et un
 * statut d'identite. L'expiration est toujours suivie separement
 * (`expired`) et ne retire JAMAIS de points - voir le README du module.
 *
 * Repartition des points (chaque categorie ne compte qu'une fois, meme si
 * plusieurs documents la satisfont) :
 *   +40 document gouvernemental identifiable
 *   +15 OCR fiable
 *   +10 nom correspondant au compte
 *   +10 date de naissance correspondante
 *   +10 photo exploitable
 *   +10 document non altere/suspect
 *   +5  informations coherentes (entre documents, si plusieurs fournis)
 */
export function computeIdentityEvidence(
  documents: DocumentAnalysis[],
  accountName: string | null,
  accountDob: Date | null
): IdentityVerificationResult {
  const signals: Signal[] = [];

  // --- Cas degeneres : aucun document exploitable ---
  const allUnreadable = documents.every((d) => d.documentStatus === "UNREADABLE");
  if (documents.length === 0 || allUnreadable) {
    return {
      identityStatus: "REJECTED",
      identityEvidenceScore: 0,
      expired: false,
      reviewRequired: true,
      signals: [{ type: "OCR_UNRELIABLE", points: 0, message: "Aucun document exploitable (illisible)" }],
    };
  }

  const anySuspectedFake = documents.some((d) => d.documentStatus === "SUSPECTED_FAKE");
  const usableDocuments = documents.filter((d) => d.documentStatus !== "UNREADABLE");

  let score = 0;

  // +40 : document gouvernemental identifiable
  const identifiedDoc = usableDocuments.find((d) => d.detectedType !== null);
  if (identifiedDoc) {
    score += 40;
    signals.push({ type: "DOCUMENT_TYPE_IDENTIFIED", points: 40, message: `Type de document identifie (${identifiedDoc.detectedType})` });
  }

  // +15 : OCR fiable
  const reliableOcr = usableDocuments.some((d) => d.ocrConfidence >= OCR_RELIABLE_CONFIDENCE_THRESHOLD);
  if (reliableOcr) {
    score += 15;
    signals.push({ type: "OCR_RELIABLE", points: 15, message: "Lecture OCR fiable" });
  } else {
    signals.push({ type: "OCR_UNRELIABLE", points: 0, message: "Lecture OCR peu fiable sur les documents fournis" });
  }

  // +10 : nom correspondant au compte
  if (accountName) {
    const names = usableDocuments.map((d) => d.fields.fullName).filter((n): n is string => Boolean(n));
    const bestMatch = names.length > 0 ? Math.max(...names.map((n) => nameSimilarity(n, accountName))) : 0;
    if (names.length > 0 && bestMatch >= NAME_SIMILARITY_THRESHOLD) {
      score += 10;
      signals.push({ type: "NAME_MATCH_ACCOUNT", points: 10, message: "Nom du compte concordant avec les documents" });
    } else if (names.length > 0) {
      signals.push({
        type: "NAME_MISMATCH_ACCOUNT",
        points: 0,
        message: `Le nom du compte ("${accountName}") ne correspond pas au nom lu sur les documents`,
      });
    }
  }

  // +10 : date de naissance correspondante
  if (accountDob) {
    const dobMatchFound = usableDocuments.some((d) => datesMatch(d.fields.dateOfBirth, accountDob) === true);
    const dobMismatchFound = usableDocuments.some((d) => datesMatch(d.fields.dateOfBirth, accountDob) === false);
    if (dobMatchFound) {
      score += 10;
      signals.push({ type: "DOB_MATCH_ACCOUNT", points: 10, message: "Date de naissance concordante avec le compte" });
    } else if (dobMismatchFound) {
      signals.push({ type: "DOB_MISMATCH_ACCOUNT", points: 0, message: "Date de naissance differente de celle du compte" });
    }
  }

  // +10 : photo exploitable
  const usablePhoto = usableDocuments.some((d) => d.qualityScore >= USABLE_PHOTO_QUALITY_THRESHOLD);
  if (usablePhoto) {
    score += 10;
    signals.push({ type: "USABLE_PHOTO", points: 10, message: "Photo de document exploitable" });
  } else {
    signals.push({ type: "IMAGE_QUALITY_ISSUE", points: 0, message: "Qualite de photo limite sur tous les documents" });
  }

  // +10 : document non altere/suspect
  if (!anySuspectedFake) {
    score += 10;
    signals.push({ type: "NOT_SUSPECT", points: 10, message: "Aucun signe d'alteration detecte" });
  } else {
    signals.push({ type: "SUSPECTED_FAKE", points: 0, message: "Signes possibles d'alteration sur au moins un document" });
  }

  // +5 : informations coherentes entre documents (si plusieurs fournis)
  if (usableDocuments.length >= 2) {
    const [first, ...rest] = usableDocuments;
    const namesConsistent = rest.every((d) => {
      if (!first.fields.fullName || !d.fields.fullName) return true; // indetermine, pas penalise
      return nameSimilarity(first.fields.fullName, d.fields.fullName) >= NAME_SIMILARITY_THRESHOLD;
    });
    const dobsConsistent = rest.every((d) => datesMatch(first.fields.dateOfBirth, d.fields.dateOfBirth) !== false);

    if (namesConsistent && dobsConsistent) {
      score += 5;
      signals.push({ type: "INFO_CONSISTENT", points: 5, message: "Informations coherentes entre les documents fournis" });
    } else {
      signals.push({ type: "INFO_INCONSISTENT", points: 0, message: "Informations incoherentes entre les documents fournis" });
      if (!namesConsistent) signals.push({ type: "NAME_MISMATCH_CROSS_DOCUMENT", points: 0, message: "Nom different entre les documents" });
      if (!dobsConsistent) signals.push({ type: "DOB_MISMATCH_CROSS_DOCUMENT", points: 0, message: "Date de naissance differente entre les documents" });
    }
  } else {
    // Un seul document : rien a comparer, mais ce n'est pas une incoherence.
    score += 5;
    signals.push({ type: "INFO_CONSISTENT", points: 5, message: "Un seul document fourni - rien a comparer" });
  }

  // --- Expiration : suivie separement, jamais deduite du score ---
  const expired = usableDocuments.some((d) => d.expired);
  if (expired) {
    signals.push({ type: "DOCUMENT_EXPIRED", points: 0, message: "Au moins un document est expire - n'affecte pas le score" });
  }

  const strongIncompatibility = usableDocuments.length >= 2 && signals.some((s) => s.type === "NAME_MISMATCH_CROSS_DOCUMENT") && score < NEEDS_REVIEW_SCORE_THRESHOLD;

  // Une incoherence entre documents (nom/DOB) est le signal le plus fort
  // de tous - meme quand le score global reste eleve par ailleurs, elle
  // force toujours une revue humaine plutot qu'une validation automatique.
  const hasCrossDocumentMismatch = signals.some(
    (s) => s.type === "NAME_MISMATCH_CROSS_DOCUMENT" || s.type === "DOB_MISMATCH_CROSS_DOCUMENT"
  );

  let identityStatus: IdentityVerificationResult["identityStatus"];
  let reviewRequired: boolean;

  if (anySuspectedFake || strongIncompatibility) {
    identityStatus = "REJECTED";
    reviewRequired = true;
  } else if (score >= VERIFIED_SCORE_THRESHOLD && !hasCrossDocumentMismatch) {
    identityStatus = expired ? "VERIFIED_EXPIRED_DOCUMENT" : "VERIFIED";
    reviewRequired = false;
  } else {
    identityStatus = "NEEDS_REVIEW";
    reviewRequired = true;
  }

  return { identityStatus, identityEvidenceScore: Math.min(100, score), expired, reviewRequired, signals };
}
