import { NextRequest, NextResponse } from "next/server";
import aiPromptAnalyzer from "@/core/AIPromptAnalyzer";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const limitResult = rateLimit(`blueprint-analyze:${session.user.id}`, 10, 10 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessaie dans quelques minutes." },
        { status: 429 }
      );
    }

    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    if (prompt.length > 15000) {
      return NextResponse.json({ error: "Prompt trop long (max 15 000 caractères)" }, { status: 400 });
    }

    const blueprint = await aiPromptAnalyzer.analyze(prompt);

    return NextResponse.json({ success: true, blueprint });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
