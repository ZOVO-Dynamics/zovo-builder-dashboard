/*
  Warnings:

  - You are about to drop the `MarketplaceListing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MarketplaceTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SellerTier" AS ENUM ('STANDARD', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "MarketplaceProductType" AS ENUM ('PLUGIN', 'TEMPLATE', 'APPLICATION', 'COMPONENT', 'AI_AGENT', 'DEV_TOOL', 'PROJECT', 'SERVICE', 'DIGITAL_RESOURCE');

-- CreateEnum
CREATE TYPE "MarketplaceProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SponsoredPlacementType" AS ENUM ('HOUR_24', 'DAYS_7', 'DAYS_30', 'FEATURED', 'HOMEPAGE');

-- CreateEnum
CREATE TYPE "SponsoredPlacementStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SellerPayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED');

-- CreateEnum
CREATE TYPE "MarketplaceAnalyticsEventType" AS ENUM ('VIEW', 'CLICK', 'SALE', 'SPONSORED_IMPRESSION', 'SPONSORED_CLICK');

-- DropForeignKey
ALTER TABLE "MarketplaceListing" DROP CONSTRAINT "MarketplaceListing_projectId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceListing" DROP CONSTRAINT "MarketplaceListing_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceTransaction" DROP CONSTRAINT "MarketplaceTransaction_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceTransaction" DROP CONSTRAINT "MarketplaceTransaction_listingId_fkey";

-- DropForeignKey
ALTER TABLE "MarketplaceTransaction" DROP CONSTRAINT "MarketplaceTransaction_sellerId_fkey";

-- DropTable
DROP TABLE "MarketplaceListing";

-- DropTable
DROP TABLE "MarketplaceTransaction";

-- DropEnum
DROP TYPE "ListingStatus";

-- DropEnum
DROP TYPE "TransactionStatus";

-- CreateTable
CREATE TABLE "MarketplaceCommissionConfig" (
    "id" TEXT NOT NULL,
    "tier" "SellerTier" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceCommissionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceSponsoredPrice" (
    "id" TEXT NOT NULL,
    "placementType" "SponsoredPlacementType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSponsoredPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceSeller" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SellerTier" NOT NULL DEFAULT 'STANDARD',
    "displayName" TEXT,
    "bio" TEXT,
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "balanceCents" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceSeller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceProduct" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "categoryId" TEXT,
    "projectId" TEXT,
    "type" "MarketplaceProductType" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "status" "MarketplaceProductStatus" NOT NULL DEFAULT 'DRAFT',
    "version" TEXT,
    "changelog" TEXT,
    "techStack" JSONB,
    "compatibility" TEXT,
    "licenseType" TEXT,
    "screenshots" JSONB,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "commissionRate" DOUBLE PRECISION NOT NULL,
    "commissionCents" INTEGER NOT NULL,
    "sellerAmountCents" INTEGER NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsoredPlacement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "placementType" "SponsoredPlacementType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "SponsoredPlacementStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPayout" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "status" "SellerPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "SellerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sponsoredPlacementId" TEXT,
    "type" "MarketplaceAnalyticsEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCommissionConfig_tier_key" ON "MarketplaceCommissionConfig"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceSponsoredPrice_placementType_key" ON "MarketplaceSponsoredPrice"("placementType");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategory_name_key" ON "MarketplaceCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceCategory_slug_key" ON "MarketplaceCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceSeller_userId_key" ON "MarketplaceSeller"("userId");

-- CreateIndex
CREATE INDEX "MarketplaceSeller_tier_idx" ON "MarketplaceSeller"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceProduct_slug_key" ON "MarketplaceProduct"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_sellerId_idx" ON "MarketplaceProduct"("sellerId");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_categoryId_idx" ON "MarketplaceProduct"("categoryId");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_status_idx" ON "MarketplaceProduct"("status");

-- CreateIndex
CREATE INDEX "MarketplaceProduct_type_idx" ON "MarketplaceProduct"("type");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceOrder_stripeCheckoutSessionId_key" ON "MarketplaceOrder"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceOrder_stripePaymentIntentId_key" ON "MarketplaceOrder"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "MarketplaceOrder_buyerId_idx" ON "MarketplaceOrder"("buyerId");

-- CreateIndex
CREATE INDEX "MarketplaceOrder_sellerId_idx" ON "MarketplaceOrder"("sellerId");

-- CreateIndex
CREATE INDEX "MarketplaceOrder_productId_idx" ON "MarketplaceOrder"("productId");

-- CreateIndex
CREATE INDEX "MarketplaceOrder_status_idx" ON "MarketplaceOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceReview_orderId_key" ON "MarketplaceReview"("orderId");

-- CreateIndex
CREATE INDEX "MarketplaceReview_productId_idx" ON "MarketplaceReview"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsoredPlacement_stripeCheckoutSessionId_key" ON "SponsoredPlacement"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsoredPlacement_stripePaymentIntentId_key" ON "SponsoredPlacement"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "SponsoredPlacement_productId_idx" ON "SponsoredPlacement"("productId");

-- CreateIndex
CREATE INDEX "SponsoredPlacement_status_idx" ON "SponsoredPlacement"("status");

-- CreateIndex
CREATE INDEX "SponsoredPlacement_endsAt_idx" ON "SponsoredPlacement"("endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPayout_stripeTransferId_key" ON "SellerPayout"("stripeTransferId");

-- CreateIndex
CREATE INDEX "SellerPayout_sellerId_idx" ON "SellerPayout"("sellerId");

-- CreateIndex
CREATE INDEX "SellerPayout_status_idx" ON "SellerPayout"("status");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_productId_type_idx" ON "MarketplaceAnalyticsEvent"("productId", "type");

-- CreateIndex
CREATE INDEX "MarketplaceAnalyticsEvent_sponsoredPlacementId_idx" ON "MarketplaceAnalyticsEvent"("sponsoredPlacementId");

-- AddForeignKey
ALTER TABLE "MarketplaceSeller" ADD CONSTRAINT "MarketplaceSeller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "MarketplaceSeller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MarketplaceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceProduct" ADD CONSTRAINT "MarketplaceProduct_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "MarketplaceSeller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceReview" ADD CONSTRAINT "MarketplaceReview_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredPlacement" ADD CONSTRAINT "SponsoredPlacement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredPlacement" ADD CONSTRAINT "SponsoredPlacement_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "MarketplaceSeller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPayout" ADD CONSTRAINT "SellerPayout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "MarketplaceSeller"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAnalyticsEvent" ADD CONSTRAINT "MarketplaceAnalyticsEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceAnalyticsEvent" ADD CONSTRAINT "MarketplaceAnalyticsEvent_sponsoredPlacementId_fkey" FOREIGN KEY ("sponsoredPlacementId") REFERENCES "SponsoredPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
