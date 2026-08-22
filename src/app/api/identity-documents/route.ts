import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateDocumentFile } from "@/lib/identity-documents";
import { runKycPipeline } from "@/lib/kyc/pipeline";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const form = await req.formData();
  const driversLicense = form.get("driversLicense") as File | null;
  const healthInsuranceCard = form.get("healthInsuranceCard") as File | null;

  const driversLicenseError = validateDocumentFile(driversLicense);
  if (driversLicenseError) {
    return NextResponse.json({ error: `Permis de conduire : ${driversLicenseError}` }, { status: 400 });
  }

  const healthInsuranceCardError = validateDocumentFile(healthInsuranceCard);
  if (healthInsuranceCardError) {
    return NextResponse.json({ error: `Carte d'assurance maladie : ${healthInsuranceCardError}` }, { status: 400 });
  }

  const [driversLicenseBuffer, healthInsuranceCardBuffer] = await Promise.all([
    driversLicense!.arrayBuffer(),
    healthInsuranceCard!.arrayBuffer(),
  ]);
  const driversLicenseData = Buffer.from(driversLicenseBuffer);
  const healthInsuranceCardData = Buffer.from(healthInsuranceCardBuffer);

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true } });

  const kyc = await runKycPipeline({
    driversLicense: driversLicenseData,
    healthInsuranceCard: healthInsuranceCardData,
    accountName: user?.name ?? null,
    excludeUserId: session.user.id,
  });

  if (kyc.result.status === "REJECTED_QUALITY") {
    return NextResponse.json(
      {
        error:
          "Un ou plusieurs documents sont illisibles (flou, mauvais éclairage). Réessaie avec des photos plus nettes.",
      },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.identityDocument.upsert({
      where: { userId_type: { userId: session.user.id, type: "DRIVERS_LICENSE" } },
      create: {
        userId: session.user.id,
        type: "DRIVERS_LICENSE",
        fileName: driversLicense!.name,
        mimeType: driversLicense!.type,
        fileData: driversLicenseData,
        dHash: kyc.driversLicenseAnalysis.dHash,
        pHash: kyc.driversLicenseAnalysis.pHash,
        extractedName: kyc.driversLicenseAnalysis.extractedName,
        extractedDob: kyc.driversLicenseAnalysis.extractedDob,
        qualityScore: kyc.driversLicenseAnalysis.qualityScore,
      },
      update: {
        fileName: driversLicense!.name,
        mimeType: driversLicense!.type,
        fileData: driversLicenseData,
        dHash: kyc.driversLicenseAnalysis.dHash,
        pHash: kyc.driversLicenseAnalysis.pHash,
        extractedName: kyc.driversLicenseAnalysis.extractedName,
        extractedDob: kyc.driversLicenseAnalysis.extractedDob,
        qualityScore: kyc.driversLicenseAnalysis.qualityScore,
        reviewed: false,
        uploadedAt: new Date(),
      },
    }),
    prisma.identityDocument.upsert({
      where: { userId_type: { userId: session.user.id, type: "HEALTH_INSURANCE_CARD" } },
      create: {
        userId: session.user.id,
        type: "HEALTH_INSURANCE_CARD",
        fileName: healthInsuranceCard!.name,
        mimeType: healthInsuranceCard!.type,
        fileData: healthInsuranceCardData,
        dHash: kyc.healthInsuranceCardAnalysis.dHash,
        pHash: kyc.healthInsuranceCardAnalysis.pHash,
        extractedName: kyc.healthInsuranceCardAnalysis.extractedName,
        extractedDob: kyc.healthInsuranceCardAnalysis.extractedDob,
        qualityScore: kyc.healthInsuranceCardAnalysis.qualityScore,
      },
      update: {
        fileName: healthInsuranceCard!.name,
        mimeType: healthInsuranceCard!.type,
        fileData: healthInsuranceCardData,
        dHash: kyc.healthInsuranceCardAnalysis.dHash,
        pHash: kyc.healthInsuranceCardAnalysis.pHash,
        extractedName: kyc.healthInsuranceCardAnalysis.extractedName,
        extractedDob: kyc.healthInsuranceCardAnalysis.extractedDob,
        qualityScore: kyc.healthInsuranceCardAnalysis.qualityScore,
        reviewed: false,
        uploadedAt: new Date(),
      },
    }),
    prisma.identityVerification.create({
      data: {
        userId: session.user.id,
        status: kyc.result.status,
        riskScore: kyc.result.riskScore,
        signals: kyc.result.signals as unknown as object,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
