import { NextRequest, NextResponse } from "next/server";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-chat-prompt";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limitResult = rateLimit(`support-chat:${ip}`, 10, 5 * 60 * 1000);

    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Trop de messages envoyés. Réessaie dans quelques minutes." },
        { status: 429 }
      );
    }

    const { messages } = await req.json() as { messages: ChatMessage[] };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "messages required" }, { status: 400 });
    }

    if (messages.length > 30) {
      return NextResponse.json({ error: "Conversation trop longue" }, { status: 400 });
    }

    const conversationText = messages
      .map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`)
      .join("\n");

    const session = await auth();
    let userContext = "Utilisateur non connecte.";

    if (session?.user?.id) {
      const [user, subscription, lastGeneration] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { creditsBalance: true },
        }),
        prisma.subscription.findUnique({
          where: { userId: session.user.id },
          include: { plan: true, usageLimits: true },
        }),
        prisma.generation.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const now = new Date();
      const currentLimit = subscription?.usageLimits.find(
        (u) => u.periodStart <= now && u.periodEnd > now
      );
      const used = currentLimit?.generationsUsed ?? 0;
      const cap = currentLimit?.generationsCap ?? subscription?.plan?.generationsLimit ?? 0;

      userContext = [
        `Plan actuel: ${subscription?.plan?.name ?? "Aucun abonnement (compte gratuit avec credits prepayes)"}`,
        subscription?.plan ? `Generations utilisees ce mois: ${used}/${cap}` : null,
        `Credits prepayes disponibles: ${user?.creditsBalance ?? 0}`,
        lastGeneration ? `Dernier projet genere: "${lastGeneration.prompt.slice(0, 80)}"` : "Aucun projet genere pour l'instant",
      ].filter(Boolean).join("\n");
    }

    const fullPrompt = `${SUPPORT_SYSTEM_PROMPT}\n\nContexte du compte utilisateur actuel:\n${userContext}\n\nConversation:\n${conversationText}\n\nAssistant:`;

    const response = await fetch("http://127.0.0.1:4000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("support-chat: AI Agent Bridge error", response.status, errText);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ response: data.response, provider: data.provider });
  } catch (err) {
    console.error("support-chat: unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
