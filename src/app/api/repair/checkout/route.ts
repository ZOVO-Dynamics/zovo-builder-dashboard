import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Fonctionnalite "Correction ZOVO" desactivee temporairement (decision produit du 15 aout 2026)
  return NextResponse.json(
    { success: false, error: "Cette fonctionnalite est temporairement indisponible." },
    { status: 403 }
  );
}
