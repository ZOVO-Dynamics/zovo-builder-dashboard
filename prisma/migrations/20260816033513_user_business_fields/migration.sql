-- AlterTable
ALTER TABLE "User" ADD COLUMN     "businessNumber" TEXT,
ADD COLUMN     "isBusiness" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "website" TEXT;
