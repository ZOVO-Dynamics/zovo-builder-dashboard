-- AlterTable
ALTER TABLE "IdentityDocument" ADD COLUMN "dHash" TEXT;
ALTER TABLE "IdentityDocument" ADD COLUMN "pHash" TEXT;
ALTER TABLE "IdentityDocument" ADD COLUMN "extractedName" TEXT;
ALTER TABLE "IdentityDocument" ADD COLUMN "extractedDob" TIMESTAMP(3);
ALTER TABLE "IdentityDocument" ADD COLUMN "qualityScore" INTEGER;

-- CreateEnum
CREATE TYPE "IdentityVerificationStatus" AS ENUM ('PASSED', 'FLAGGED', 'REJECTED_QUALITY', 'REJECTED_FRAUD');

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "IdentityVerificationStatus" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "signals" JSONB NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityVerification_userId_idx" ON "IdentityVerification"("userId");

-- CreateIndex
CREATE INDEX "IdentityVerification_status_idx" ON "IdentityVerification"("status");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
