import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateDocumentFile } from "@/lib/identity-documents";

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

  await prisma.$transaction([
    prisma.identityDocument.upsert({
      where: { userId_type: { userId: session.user.id, type: "DRIVERS_LICENSE" } },
      create: {
        userId: session.user.id,
        type: "DRIVERS_LICENSE",
        fileName: driversLicense!.name,
        mimeType: driversLicense!.type,
        fileData: Buffer.from(driversLicenseBuffer),
      },
      update: {
        fileName: driversLicense!.name,
        mimeType: driversLicense!.type,
        fileData: Buffer.from(driversLicenseBuffer),
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
        fileData: Buffer.from(healthInsuranceCardBuffer),
      },
      update: {
        fileName: healthInsuranceCard!.name,
        mimeType: healthInsuranceCard!.type,
        fileData: Buffer.from(healthInsuranceCardBuffer),
        reviewed: false,
        uploadedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
