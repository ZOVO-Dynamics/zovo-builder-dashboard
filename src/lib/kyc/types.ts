export type SignalType =
  | "IMAGE_QUALITY"
  | "NAME_MISMATCH_CROSS_DOCUMENT"
  | "DOB_MISMATCH_CROSS_DOCUMENT"
  | "NAME_MISMATCH_ACCOUNT"
  | "DUPLICATE_DOCUMENT"
  | "OCR_UNREADABLE";

export interface Signal {
  type: SignalType;
  /** 0-100, contribution au score de risque global. */
  severity: number;
  message: string;
}

export type IdentityVerificationStatus = "PASSED" | "FLAGGED" | "REJECTED_QUALITY" | "REJECTED_FRAUD";

export interface RiskResult {
  status: IdentityVerificationStatus;
  riskScore: number;
  signals: Signal[];
}

export interface DocumentAnalysis {
  qualityScore: number;
  dHash: string;
  pHash: string;
  extractedName: string | null;
  extractedDob: Date | null;
  ocrConfidence: number;
}
