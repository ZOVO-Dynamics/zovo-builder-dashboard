"use client";

import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Bonjour. Je suis l'assistant ZOVO — pose-moi une question sur le Builder, ton compte ou ton abonnement.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) throw new Error("request_failed");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response ?? "Pas de réponse reçue." },
      ]);
    } catch {
      setError("La connexion au support a échoué. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-mono">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le support"
          className="group relative flex h-14 w-14 items-center justify-center rounded-sm border border-blue-400/40 bg-[#0b1220] text-blue-300 shadow-[0_0_0_1px_rgba(96,165,250,0.15)] transition hover:border-blue-300 hover:text-blue-200"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M4 5h16v11H8l-4 4V5z" />
            <path d="M8 9h8M8 12h5" strokeLinecap="round" />
          </svg>
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-400" />
        </button>
      )}

      {open && (
        <div className="flex h-[420px] w-[300px] flex-col overflow-hidden rounded-sm border border-blue-400/30 bg-[#0b1220] shadow-2xl">
          <div className="flex items-center justify-between border-b border-blue-400/20 bg-[#0d1626] px-4 py-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400/70">
                ZOVO — Support
              </span>
              <span className="text-sm text-blue-100">Assistant technique</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fermer le support"
              className="text-blue-400/60 transition hover:text-blue-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px] leading-relaxed">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-sm border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-50"
                      : "max-w-[85%] rounded-sm border border-slate-600/30 bg-slate-500/5 px-3 py-2 text-slate-200"
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-sm border border-slate-600/30 bg-slate-500/5 px-3 py-2 text-slate-400">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-sm border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="flex items-end gap-2 border-t border-blue-400/20 bg-[#0d1626] p-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écris ta question..."
              rows={1}
              className="max-h-24 flex-1 resize-none rounded-sm border border-blue-400/20 bg-[#0b1220] px-3 py-2 text-sm text-blue-50 placeholder:text-blue-400/40 focus:border-blue-300 focus:outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label="Envoyer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-blue-400/40 text-blue-300 transition hover:border-blue-300 hover:text-blue-200 disabled:opacity-30"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 12h16M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
