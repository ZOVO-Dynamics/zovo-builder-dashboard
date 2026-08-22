-- Reworks the KYC pipeline (PR #32) into a full identity-evidence system:
-- more document types, expiration tracked as a distinct concept from
-- rejection, structured document-level status, and a renamed
-- IdentityStatus/identityEvidenceScore model. The feature was not yet in
-- active use in production at the time of this migration, so
-- IdentityVerification is dropped and recreated rather than data-migrated.

-- AlterEnum
ALTER TYPE "IdentityDocumentType" ADD VALUE IF NOT EXISTS 'PASSPORT';
ALTER TYPE "IdentityDocumentType" ADD VALUE IF NOT EXISTS 'GOVERNMENT_ID';
ALTER TYPE "IdentityDocumentType" ADD VALUE IF NOT EXISTS 'BIRTH_CERTIFICATE';

-- CreateEnum
CREATE TYPE "DocumentAnalysisStatus" AS ENUM ('VALID', 'EXPIRED', 'QUALITY_ISSUE', 'SUSPECTED_FAKE', 'UNREADABLE');

-- AlterTable
ALTER TABLE "IdentityDocument" ADD COLUMN "purgedAt" TIMESTAMP(3);
ALTER TABLE "IdentityDocument" ADD COLUMN "documentStatus" "DocumentAnalysisStatus";
ALTER TABLE "IdentityDocument" ADD COLUMN "expired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IdentityDocument" ADD COLUMN "issuedDate" TIMESTAMP(3);
ALTER TABLE "IdentityDocument" ADD COLUMN "expirationDate" TIMESTAMP(3);
ALTER TABLE "IdentityDocument" ADD COLUMN "documentNumber" TEXT;
ALTER TABLE "IdentityDocument" ADD COLUMN "countryCode" TEXT;
ALTER TABLE "IdentityDocument" ADD COLUMN "region" TEXT;
ALTER TABLE "IdentityDocument" ADD COLUMN "ocrConfidence" INTEGER;

-- DropTable (feature not yet live in production - safe to recreate)
DROP TABLE IF EXISTS "IdentityVerification" CASCADE;
DROP TYPE IF EXISTS "IdentityVerificationStatus";

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('VERIFIED', 'VERIFIED_EXPIRED_DOCUMENT', 'NEEDS_REVIEW', 'REJECTED');

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "identityStatus" "IdentityStatus" NOT NULL,
    "identityEvidenceScore" INTEGER NOT NULL,
    "expired" BOOLEAN NOT NULL DEFAULT false,
    "reviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "signals" JSONB NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerification_userId_idx" ON "IdentityVerification"("userId");

-- CreateIndex
CREATE INDEX "IdentityVerification_identityStatus_idx" ON "IdentityVerification"("identityStatus");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "IdentityAuditEventType" AS ENUM ('DOCUMENT_UPLOADED', 'DOCUMENT_ANALYZED', 'VERIFICATION_COMPLETED', 'ADMIN_DECISION', 'DOCUMENT_PURGED', 'UPLOAD_REJECTED_SECURITY');

-- CreateTable
CREATE TABLE "IdentityAuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "IdentityAuditEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityAuditEvent_userId_idx" ON "IdentityAuditEvent"("userId");

-- CreateIndex
CREATE INDEX "IdentityAuditEvent_type_idx" ON "IdentityAuditEvent"("type");

-- CreateIndex
CREATE INDEX "IdentityAuditEvent_createdAt_idx" ON "IdentityAuditEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "IdentityAuditEvent" ADD CONSTRAINT "IdentityAuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
