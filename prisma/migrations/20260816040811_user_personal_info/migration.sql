-- AlterTable
ALTER TABLE "User" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressPostalCode" TEXT,
ADD COLUMN     "addressProvince" TEXT,
ADD COLUMN     "addressStreet" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
