import { NextRequest, NextResponse } from "next/server";
import promptAnalyzer from "@/core/PromptAnalyzer";
import blueprintGenerator from "@/core/BlueprintGenerator";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    const projectBlueprint = promptAnalyzer.analyze(prompt);
    const buildBlueprint = blueprintGenerator.generate(projectBlueprint);

    return NextResponse.json({
      success: true,
      projectBlueprint,
      buildBlueprint
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
