-- CreateEnum
CREATE TYPE "CreditTransactionType" AS ENUM ('PURCHASE', 'CONSUMPTION', 'REFUND');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "creditsBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CreditPack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "credits" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditPack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CreditTransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "stripePaymentIntentId" TEXT,
    "generationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditPack_name_key" ON "CreditPack"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_stripePaymentIntentId_key" ON "CreditTransaction"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- AddForeignKey
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
