import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const limitResult = rateLimit(`support-escalate:${session.user.id}`, 3, 15 * 60 * 1000);
    if (!limitResult.success) {
      return NextResponse.json(
        { error: "Trop de demandes envoyees. Reessaie dans quelques minutes." },
        { status: 429 }
      );
    }

    const { messages } = (await req.json()) as { messages: ChatMessage[] };

    const conversationHtml = messages
      .map(
        (m) =>
          `<p><strong>${m.role === "user" ? "Utilisateur" : "Assistant"}:</strong> ${m.content.replace(/\n/g, "<br/>")}</p>`
      )
      .join("");

    const { error } = await resend.emails.send({
      from: "ZOVO Support <support@zovo.ca>",
      to: "notifications@zovo.ca",
      replyTo: session.user.email,
      subject: `Escalade support - ${session.user.email}`,
      html: `
        <p>Un utilisateur demande a parler a un humain.</p>
        <p><strong>Compte:</strong> ${session.user.email}</p>
        <hr/>
        <h3>Historique de la conversation</h3>
        ${conversationHtml}
      `,
    });

    resend.emails.send({
      from: "ZOVO Support <support@zovo.ca>",
      to: session.user.email,
      subject: "Ta demande a bien ete transmise",
      html: `
        <p>Bonjour,</p>
        <p>Ta demande de support a bien ete transmise a notre equipe. On te repond par email des que possible.</p>
        <p>L'equipe ZOVO</p>
      `,
    }).catch((err) => {
      console.error("Erreur envoi email confirmation utilisateur:", err);
    });

    if (error) {
      console.error("Erreur envoi email escalade:", error);
      return NextResponse.json({ error: "Envoi echoue" }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("support-escalate: unexpected error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
