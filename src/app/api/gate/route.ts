import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));

  if (!password || password !== process.env.SITE_GATE_PASSWORD) {
    return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("zovo_gate", process.env.SITE_GATE_PASSWORD as string, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
