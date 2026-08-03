-- AlterTable
ALTER TABLE "Generation" ADD COLUMN     "projectId" TEXT;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectPath" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "blueprint" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectPath_key" ON "Project"("projectPath");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "ProjectVersion_projectId_idx" ON "ProjectVersion"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectVersion_projectId_versionNumber_key" ON "ProjectVersion"("projectId", "versionNumber");

-- CreateIndex
CREATE INDEX "Generation_projectId_idx" ON "Generation"("projectId");

-- AddForeignKey
ALTER TABLE "Generation" ADD CONSTRAINT "Generation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
