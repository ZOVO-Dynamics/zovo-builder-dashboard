export type DocumentType =
  | "DRIVERS_LICENSE"
  | "PASSPORT"
  | "GOVERNMENT_ID"
  | "HEALTH_INSURANCE_CARD"
  | "BIRTH_CERTIFICATE";

export type DocumentAnalysisStatus = "VALID" | "EXPIRED" | "QUALITY_ISSUE" | "SUSPECTED_FAKE" | "UNREADABLE";

export type IdentityStatus = "VERIFIED" | "VERIFIED_EXPIRED_DOCUMENT" | "NEEDS_REVIEW" | "REJECTED";

export type SignalType =
  | "DOCUMENT_TYPE_IDENTIFIED"
  | "OCR_RELIABLE"
  | "OCR_UNRELIABLE"
  | "NAME_MATCH_ACCOUNT"
  | "NAME_MISMATCH_ACCOUNT"
  | "DOB_MATCH_ACCOUNT"
  | "DOB_MISMATCH_ACCOUNT"
  | "USABLE_PHOTO"
  | "IMAGE_QUALITY_ISSUE"
  | "NOT_SUSPECT"
  | "SUSPECTED_FAKE"
  | "INFO_CONSISTENT"
  | "INFO_INCONSISTENT"
  | "DOCUMENT_EXPIRED"
  | "DUPLICATE_DOCUMENT"
  | "NAME_MISMATCH_CROSS_DOCUMENT"
  | "DOB_MISMATCH_CROSS_DOCUMENT";

export interface Signal {
  type: SignalType;
  /** Points ajoutes (positif) ou retires (negatif) au score de preuve d'identite. Jamais negatif pour l'expiration. */
  points: number;
  message: string;
}

export interface ExtractedFields {
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  dateOfBirth: Date | null;
  documentNumber: string | null;
  issuedDate: Date | null;
  expirationDate: Date | null;
  countryCode: string | null;
  region: string | null;
}

export interface DocumentAnalysis {
  detectedType: DocumentType | null;
  documentStatus: DocumentAnalysisStatus;
  expired: boolean;
  qualityScore: number;
  ocrConfidence: number;
  dHash: string;
  pHash: string;
  fields: ExtractedFields;
}

export interface IdentityVerificationResult {
  identityStatus: IdentityStatus;
  identityEvidenceScore: number;
  expired: boolean;
  reviewRequired: boolean;
  signals: Signal[];
}
