import { NextResponse } from "next/server";
import generationHistory from "@/core/GenerationHistory";

export async function GET() {
  const all = generationHistory.getAll();
  return NextResponse.json({ success: true, count: all.length, history: all });
}
