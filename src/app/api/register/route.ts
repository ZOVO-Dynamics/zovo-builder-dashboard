import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email et mot de passe requis" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, passwordHash, name: name || null },
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
