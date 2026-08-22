import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateUploadedFile } from "@/lib/identity/security/fileValidation";
import { encryptDocument } from "@/lib/identity/security/encryption";
import { runVerification } from "@/lib/identity/verificationEngine";
import { logIdentityAuditEvent } from "@/lib/identity/identityAudit";
import type { DocumentType } from "@/lib/identity/types";

const resend = new Resend(process.env.RESEND_API_KEY);

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "DRIVERS_LICENSE",
  "PASSPORT",
  "GOVERNMENT_ID",
  "HEALTH_INSURANCE_CARD",
  "BIRTH_CERTIFICATE",
];

interface DocumentUpload {
  type: DocumentType;
  file: File;
  buffer: Buffer;
}

async function readDocumentUpload(
  form: FormData,
  typeField: string,
  fileField: string
): Promise<{ upload: DocumentUpload | null; error: string | null }> {
  const typeValue = form.get(typeField) as string | null;
  const file = form.get(fileField) as File | null;

  if (!typeValue && !file) return { upload: null, error: null };

  if (!typeValue || !VALID_DOCUMENT_TYPES.includes(typeValue as DocumentType)) {
    return { upload: null, error: "Type de document invalide" };
  }
  if (!file) {
    return { upload: null, error: "Fichier manquant pour le document" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validationError = validateUploadedFile({ file, buffer });
  if (validationError) {
    return { upload: null, error: validationError };
  }

  return { upload: { type: typeValue as DocumentType, file, buffer }, error: null };
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Trop de tentatives d'inscription. Réessaie plus tard." },
        { status: 429 }
      );
    }

    const form = await req.formData();

    const email = form.get("email") as string | null;
    const password = form.get("password") as string | null;
    const name = form.get("name") as string | null;
    const isBusiness = form.get("isBusiness") === "true";
    const companyName = form.get("companyName") as string | null;
    const website = form.get("website") as string | null;
    const acceptedTerms = form.get("acceptedTerms") === "true";

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    if (!acceptedTerms) {
      return NextResponse.json(
        { error: "Tu dois accepter les conditions générales et la politique de confidentialité" },
        { status: 400 }
      );
    }

    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    const primary = await readDocumentUpload(form, "primaryDocumentType", "primaryDocument");
    if (primary.error) {
      return NextResponse.json({ error: primary.error }, { status: 400 });
    }
    if (!primary.upload) {
      return NextResponse.json({ error: "Une pièce d'identité est requise" }, { status: 400 });
    }

    const secondary = await readDocumentUpload(form, "secondaryDocumentType", "secondaryDocument");
    if (secondary.error) {
      return NextResponse.json({ error: secondary.error }, { status: 400 });
    }
    if (secondary.upload && secondary.upload.type === primary.upload.type) {
      return NextResponse.json(
        { error: "Le deuxième document doit être d'un type différent du premier" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
    }

    const uploads = [primary.upload, ...(secondary.upload ? [secondary.upload] : [])];

    const { result, documentAnalyses } = await runVerification({
      documents: uploads.map((u) => ({ buffer: u.buffer, declaredType: u.type })),
      accountName: name,
      accountDob: null,
    });

    // Un document illisible bloque l'inscription (rien n'est enregistre) -
    // jamais l'expiration a elle seule.
    const allUnreadable = documentAnalyses.every((a) => a.documentStatus === "UNREADABLE");
    if (allUnreadable) {
      return NextResponse.json(
        {
          error:
            "Le document est illisible (flou, mauvais éclairage). Réessaie avec une photo plus nette.",
        },
        { status: 400 }
      );
    }

    // REJECTED : falsification suspectee ou informations incompatibles -
    // pas simplement "document expire".
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

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        isBusiness: Boolean(isBusiness),
        companyName: isBusiness ? (companyName?.trim() || null) : null,
        website: website?.trim() || null,
        termsAcceptedAt: new Date(),
        identityDocuments: {
          create: uploads.map((u, i) => {
            const analysis = documentAnalyses[i];
            return {
              type: u.type,
              fileName: u.file.name,
              mimeType: u.file.type,
              fileData: encryptDocument(u.buffer) as never,
              documentStatus: analysis.documentStatus,
              expired: analysis.expired,
              issuedDate: analysis.fields.issuedDate,
              expirationDate: analysis.fields.expirationDate,
              documentNumber: analysis.fields.documentNumber,
              countryCode: analysis.fields.countryCode,
              region: analysis.fields.region,
              ocrConfidence: analysis.ocrConfidence,
              dHash: analysis.dHash,
              pHash: analysis.pHash,
              extractedName: analysis.fields.fullName,
              extractedDob: analysis.fields.dateOfBirth,
              qualityScore: analysis.qualityScore,
            };
          }),
        },
        identityVerifications: {
          create: {
            identityStatus: result.identityStatus,
            identityEvidenceScore: result.identityEvidenceScore,
            expired: result.expired,
            reviewRequired: result.reviewRequired,
            signals: result.signals as unknown as object,
          },
        },
      },
    });

    await logIdentityAuditEvent(user.id, "VERIFICATION_COMPLETED", {
      identityStatus: result.identityStatus,
      identityEvidenceScore: result.identityEvidenceScore,
      documentCount: uploads.length,
    });

    const { data, error } = await resend.emails.send({
      from: "ZOVO <support@zovo.ca>",
      to: user.email,
      subject: "Bienvenue sur ZOVO !",
      html: `<p>Bonjour, ton compte ZOVO a bien été créé. Bienvenue à bord !</p>`,
    });

    if (error) {
      console.error("Erreur envoi email de bienvenue:", error);
    } else {
      console.log("Email de bienvenue envoyé avec succès, ID:", data?.id);
    }

    return NextResponse.json({
      success: true,
      userId: user.id,
      identityStatus: result.identityStatus,
      expired: result.expired,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
