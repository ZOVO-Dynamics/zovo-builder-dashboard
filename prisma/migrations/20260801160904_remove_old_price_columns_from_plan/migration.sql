/*
  Warnings:

  - You are about to drop the column `billingInterval` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `priceCents` on the `SubscriptionPlan` table. All the data in the column will be lost.
  - You are about to drop the column `stripePriceId` on the `SubscriptionPlan` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SubscriptionPlan" DROP COLUMN "billingInterval",
DROP COLUMN "priceCents",
DROP COLUMN "stripePriceId";
