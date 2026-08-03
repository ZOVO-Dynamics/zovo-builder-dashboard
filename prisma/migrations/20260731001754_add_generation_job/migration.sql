-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GenerationJob_userId_idx" ON "GenerationJob"("userId");

-- CreateIndex
CREATE INDEX "GenerationJob_status_idx" ON "GenerationJob"("status");
