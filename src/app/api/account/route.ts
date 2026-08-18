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
  companyName: true,
  website: true,
  dateOfBirth: true,
  gender: true,
  addressStreet: true,
  addressCity: true,
  addressProvince: true,
  addressPostalCode: true,
  phone: true,
  termsAcceptedAt: true,
  notifyProductUpdates: true,
  notifyBillingAlerts: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      ...SELECT_FIELDS,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const { accounts, ...rest } = user;
  const hasGithub = accounts.some((a) => a.provider === "github");

  return NextResponse.json({ user: { ...rest, hasGithub } });
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
    companyName,
    website,
    notifyProductUpdates,
    notifyBillingAlerts,
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
    companyName?: string;
    website?: string;
    notifyProductUpdates?: boolean;
    notifyBillingAlerts?: boolean;
  };

  if (isBusiness && !businessNumber?.trim()) {
    return NextResponse.json(
      { error: "Le numéro d'entreprise est requis pour un compte entreprise" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Mise a jour partielle : on ne touche que les champs effectivement fournis,
  // pour permettre de sauvegarder un onglet (ex: preferences) sans devoir
  // renvoyer tout le profil personnel a chaque fois.
  const data: Record<string, unknown> = {};

  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone.trim() || null;
  if (gender !== undefined) data.gender = gender.trim() || null;
  if (addressStreet !== undefined) data.addressStreet = addressStreet.trim() || null;
  if (addressCity !== undefined) data.addressCity = addressCity.trim() || null;
  if (addressProvince !== undefined) data.addressProvince = addressProvince.trim() || null;
  if (addressPostalCode !== undefined) data.addressPostalCode = addressPostalCode.trim() || null;
  if (website !== undefined) data.website = website.trim() || null;
  if (notifyProductUpdates !== undefined) data.notifyProductUpdates = Boolean(notifyProductUpdates);
  if (notifyBillingAlerts !== undefined) data.notifyBillingAlerts = Boolean(notifyBillingAlerts);

  if (dateOfBirth !== undefined && dateOfBirth !== "") {
    const parsedDob = new Date(dateOfBirth);
    if (isNaN(parsedDob.getTime())) {
      return NextResponse.json({ error: "Date de naissance invalide" }, { status: 400 });
    }
    data.dateOfBirth = parsedDob;
  }

  if (isBusiness !== undefined) {
    data.isBusiness = Boolean(isBusiness);
    data.businessNumber = isBusiness ? (businessNumber?.trim() || null) : null;
    data.companyName = isBusiness ? (companyName?.trim() || null) : null;
  }

  if (acceptedTerms) {
    data.termsAcceptedAt = user.termsAcceptedAt ?? new Date();
  }

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
