import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SELECT_FIELDS = {
  id: true,
  email: true,
  name: true,
  isBusiness: true,
  businessNumber: true,
  website: true,
  dateOfBirth: true,
  gender: true,
  addressStreet: true,
  addressCity: true,
  addressProvince: true,
  addressPostalCode: true,
  phone: true,
  termsAcceptedAt: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: SELECT_FIELDS,
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    name,
    dateOfBirth,
    gender,
    addressStreet,
    addressCity,
    addressProvince,
    addressPostalCode,
    phone,
    acceptedTerms,
    currentPassword,
    newPassword,
    isBusiness,
    businessNumber,
    website,
  } = body as {
    name?: string;
    dateOfBirth?: string;
    gender?: string;
    addressStreet?: string;
    addressCity?: string;
    addressProvince?: string;
    addressPostalCode?: string;
    phone?: string;
    acceptedTerms?: boolean;
    currentPassword?: string;
    newPassword?: string;
    isBusiness?: boolean;
    businessNumber?: string;
    website?: string;
  };

  // Champs obligatoires du formulaire d'informations personnelles.
  const requiredFields: Record<string, string | undefined> = {
    name,
    dateOfBirth,
    gender,
    addressStreet,
    addressCity,
    addressProvince,
    addressPostalCode,
    phone,
  };

  const missing = Object.entries(requiredFields).filter(
    ([, v]) => !v || !String(v).trim()
  );

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Champs requis manquants : ${missing.map(([k]) => k).join(", ")}` },
      { status: 400 }
    );
  }

  if (!acceptedTerms) {
    return NextResponse.json(
      { error: "Tu dois accepter les conditions générales et la politique de confidentialité" },
      { status: 400 }
    );
  }

  if (isBusiness && !businessNumber?.trim()) {
    return NextResponse.json(
      { error: "Le numéro d'entreprise est requis pour un compte entreprise" },
      { status: 400 }
    );
  }

  const parsedDob = new Date(dateOfBirth as string);
  if (isNaN(parsedDob.getTime())) {
    return NextResponse.json({ error: "Date de naissance invalide" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const data: Record<string, unknown> = {
    name: (name as string).trim(),
    dateOfBirth: parsedDob,
    gender: (gender as string).trim(),
    addressStreet: (addressStreet as string).trim(),
    addressCity: (addressCity as string).trim(),
    addressProvince: (addressProvince as string).trim(),
    addressPostalCode: (addressPostalCode as string).trim(),
    phone: (phone as string).trim(),
    termsAcceptedAt: user.termsAcceptedAt ?? new Date(),
    isBusiness: Boolean(isBusiness),
    businessNumber: isBusiness ? (businessNumber?.trim() || null) : null,
    website: website?.trim() || null,
  };

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Mot de passe actuel requis pour en définir un nouveau" },
        { status: 400 }
      );
    }
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Ce compte n'a pas de mot de passe local (connexion via un fournisseur externe)" },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 401 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Le nouveau mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: SELECT_FIELDS,
  });

  return NextResponse.json({ success: true, user: updated });
}
