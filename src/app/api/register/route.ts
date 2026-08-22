import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateDocumentFile } from "@/lib/identity-documents";
import { runKycPipeline } from "@/lib/kyc/pipeline";

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const driversLicense = form.get("driversLicense") as File | null;
    const healthInsuranceCard = form.get("healthInsuranceCard") as File | null;

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

    const driversLicenseError = validateDocumentFile(driversLicense);
    if (driversLicenseError) {
      return NextResponse.json({ error: `Permis de conduire : ${driversLicenseError}` }, { status: 400 });
    }

    const healthInsuranceCardError = validateDocumentFile(healthInsuranceCard);
    if (healthInsuranceCardError) {
      return NextResponse.json({ error: `Carte d'assurance maladie : ${healthInsuranceCardError}` }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
    }

    const [driversLicenseBuffer, healthInsuranceCardBuffer] = await Promise.all([
      driversLicense!.arrayBuffer(),
      healthInsuranceCard!.arrayBuffer(),
    ]);
    const driversLicenseData = Buffer.from(driversLicenseBuffer);
    const healthInsuranceCardData = Buffer.from(healthInsuranceCardBuffer);

    const kyc = await runKycPipeline({
      driversLicense: driversLicenseData,
      healthInsuranceCard: healthInsuranceCardData,
      accountName: name,
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
          create: [
            {
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
            {
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
          ],
        },
        identityVerifications: {
          create: {
            status: kyc.result.status,
            riskScore: kyc.result.riskScore,
            signals: kyc.result.signals as unknown as object,
          },
        },
      },
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

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
