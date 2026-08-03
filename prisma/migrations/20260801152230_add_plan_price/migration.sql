-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_stripePriceId_key" ON "PlanPrice"("stripePriceId");

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
