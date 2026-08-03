import { NextRequest, NextResponse } from "next/server";
import { SUPPORT_SYSTEM_PROMPT } from "@/lib/support-chat-prompt";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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

    const fullPrompt = `${SUPPORT_SYSTEM_PROMPT}\n\nConversation:\n${conversationText}\n\nAssistant:`;

    const response = await fetch("https://ai.zovo.ca/api/generate", {
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
    return NextResponse.json({ reply: data.response, provider: data.provider });
  } catch (err) {
    console.error("support-chat: unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
