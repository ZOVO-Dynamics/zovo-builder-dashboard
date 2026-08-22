import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { validateUploadedFile } from "@/lib/identity/security/fileValidation";
import { encryptDocument, decryptDocument } from "@/lib/identity/security/encryption";
import { runVerification } from "@/lib/identity/verificationEngine";
import { logIdentityAuditEvent } from "@/lib/identity/identityAudit";
import type { DocumentType } from "@/lib/identity/types";

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "DRIVERS_LICENSE",
  "PASSPORT",
  "GOVERNMENT_ID",
  "HEALTH_INSURANCE_CARD",
  "BIRTH_CERTIFICATE",
];

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const limitResult = rateLimit(`identity-documents:${session.user.id}`, 10, 15 * 60 * 1000);
  if (!limitResult.success) {
    return NextResponse.json({ error: "Trop de tentatives. Réessaie plus tard." }, { status: 429 });
  }

  const form = await req.formData();
  const documentType = form.get("documentType") as string | null;
  const file = form.get("document") as File | null;

  if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
    return NextResponse.json({ error: "Type de document invalide" }, { status: 400 });
  }

  const buffer = Buffer.from((await file?.arrayBuffer()) ?? new ArrayBuffer(0));
  const validationError = validateUploadedFile({ file, buffer });
  if (validationError) {
    await logIdentityAuditEvent(session.user.id, "UPLOAD_REJECTED_SECURITY", { reason: validationError });
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, dateOfBirth: true } });

  // Recombine avec les documents deja fournis par ce compte pour une
  // evaluation d'ensemble (voir section "deuxieme document").
  const existingDocuments = await prisma.identityDocument.findMany({
    where: { userId: session.user.id, type: { not: documentType as DocumentType } },
    select: { fileData: true, type: true },
  });

  const { result, documentAnalyses } = await runVerification({
    documents: [
      ...existingDocuments.map((d) => ({ buffer: decryptDocument(Buffer.from(d.fileData)), declaredType: d.type })),
      { buffer, declaredType: documentType as DocumentType },
    ],
    accountName: user?.name ?? null,
    accountDob: user?.dateOfBirth ?? null,
    excludeUserId: session.user.id,
  });

  const newAnalysis = documentAnalyses[documentAnalyses.length - 1];

  if (newAnalysis.documentStatus === "UNREADABLE") {
    return NextResponse.json(
      { error: "Le document est illisible (flou, mauvais éclairage). Réessaie avec une photo plus nette." },
      { status: 400 }
    );
  }

  if (result.identityStatus === "REJECTED") {
    return NextResponse.json(
      {
        error:
          "Impossible de valider ce document. Vérifie que les informations sont lisibles et cohérentes, ou essaie un autre document.",
        identityStatus: result.identityStatus,
      },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.identityDocument.upsert({
      where: { userId_type: { userId: session.user.id, type: documentType as DocumentType } },
      create: {
        userId: session.user.id,
        type: documentType as DocumentType,
        fileName: file!.name,
        mimeType: file!.type,
        fileData: encryptDocument(buffer) as never,
        documentStatus: newAnalysis.documentStatus,
        expired: newAnalysis.expired,
        issuedDate: newAnalysis.fields.issuedDate,
        expirationDate: newAnalysis.fields.expirationDate,
        documentNumber: newAnalysis.fields.documentNumber,
        countryCode: newAnalysis.fields.countryCode,
        region: newAnalysis.fields.region,
        ocrConfidence: newAnalysis.ocrConfidence,
        dHash: newAnalysis.dHash,
        pHash: newAnalysis.pHash,
        extractedName: newAnalysis.fields.fullName,
        extractedDob: newAnalysis.fields.dateOfBirth,
        qualityScore: newAnalysis.qualityScore,
      },
      update: {
        fileName: file!.name,
        mimeType: file!.type,
        fileData: encryptDocument(buffer) as never,
        documentStatus: newAnalysis.documentStatus,
        expired: newAnalysis.expired,
        issuedDate: newAnalysis.fields.issuedDate,
        expirationDate: newAnalysis.fields.expirationDate,
        documentNumber: newAnalysis.fields.documentNumber,
        countryCode: newAnalysis.fields.countryCode,
        region: newAnalysis.fields.region,
        ocrConfidence: newAnalysis.ocrConfidence,
        dHash: newAnalysis.dHash,
        pHash: newAnalysis.pHash,
        extractedName: newAnalysis.fields.fullName,
        extractedDob: newAnalysis.fields.dateOfBirth,
        qualityScore: newAnalysis.qualityScore,
        reviewed: false,
        purgedAt: null,
        uploadedAt: new Date(),
      },
    }),
    prisma.identityVerification.create({
      data: {
        userId: session.user.id,
        identityStatus: result.identityStatus,
        identityEvidenceScore: result.identityEvidenceScore,
        expired: result.expired,
        reviewRequired: result.reviewRequired,
        signals: result.signals as unknown as object,
      },
    }),
  ]);

  await logIdentityAuditEvent(session.user.id, "VERIFICATION_COMPLETED", {
    identityStatus: result.identityStatus,
    identityEvidenceScore: result.identityEvidenceScore,
  });

  return NextResponse.json({
    success: true,
    identityStatus: result.identityStatus,
    identityEvidenceScore: result.identityEvidenceScore,
    expired: result.expired,
  });
}
