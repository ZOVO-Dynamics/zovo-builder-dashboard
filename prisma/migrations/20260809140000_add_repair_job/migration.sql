-- CreateEnum
CREATE TYPE "RepairJobStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'QUEUED', 'ANALYZING', 'FIXING', 'VALIDATING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RepairValidationStatus" AS ENUM ('PENDING', 'OK', 'FAILED');

-- CreateTable
CREATE TABLE "RepairJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "status" "RepairJobStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "price" INTEGER NOT NULL DEFAULT 2999,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorsDetected" INTEGER,
    "errorsFixed" INTEGER,
    "validationStatus" "RepairValidationStatus" NOT NULL DEFAULT 'PENDING',
    "fixedFilesSummary" JSONB,
    "remainingErrors" JSONB,
    "failureReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepairJob_stripeCheckoutSessionId_key" ON "RepairJob"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairJob_stripePaymentIntentId_key" ON "RepairJob"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "RepairJob_userId_idx" ON "RepairJob"("userId");

-- CreateIndex
CREATE INDEX "RepairJob_projectId_idx" ON "RepairJob"("projectId");

-- CreateIndex
CREATE INDEX "RepairJob_status_idx" ON "RepairJob"("status");

-- AddForeignKey
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairJob" ADD CONSTRAINT "RepairJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
