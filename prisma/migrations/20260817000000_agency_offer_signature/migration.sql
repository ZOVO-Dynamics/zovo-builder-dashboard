-- AlterTable
ALTER TABLE "AgencyOffer" ADD COLUMN "signedAt" TIMESTAMP(3),
ADD COLUMN "signatureText" TEXT,
ADD COLUMN "termsVersion" TEXT;
