-- CreateEnum
CREATE TYPE "AgencyOfferType" AS ENUM ('PROJECT_PURCHASE', 'CONTACT_RIGHT');

-- CreateEnum
CREATE TYPE "AgencyOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterTable
ALTER TABLE "MarketplaceSeller" ADD COLUMN     "isBuyingAgency" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AgencyOffer" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agencySellerId" TEXT NOT NULL,
    "type" "AgencyOfferType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "message" TEXT,
    "status" "AgencyOfferStatus" NOT NULL DEFAULT 'PENDING',
    "commissionCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "AgencyOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencyOffer_projectId_idx" ON "AgencyOffer"("projectId");

-- CreateIndex
CREATE INDEX "AgencyOffer_agencySellerId_idx" ON "AgencyOffer"("agencySellerId");

-- CreateIndex
CREATE INDEX "AgencyOffer_status_idx" ON "AgencyOffer"("status");

-- AddForeignKey
ALTER TABLE "AgencyOffer" ADD CONSTRAINT "AgencyOffer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyOffer" ADD CONSTRAINT "AgencyOffer_agencySellerId_fkey" FOREIGN KEY ("agencySellerId") REFERENCES "MarketplaceSeller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
