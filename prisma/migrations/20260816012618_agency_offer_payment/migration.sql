-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgencyOfferStatus" ADD VALUE 'PAID';
ALTER TYPE "AgencyOfferStatus" ADD VALUE 'PAYMENT_FAILED';

-- AlterTable
ALTER TABLE "AgencyOffer" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "MarketplaceSeller" ADD COLUMN     "defaultPaymentMethodId" TEXT,
ADD COLUMN     "stripeCustomerId" TEXT;
