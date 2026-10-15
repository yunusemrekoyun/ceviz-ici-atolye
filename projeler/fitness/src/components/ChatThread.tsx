"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { initials } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  body: string;
  mine: boolean;
  createdAt: string;
}

interface Props {
  fetchUrl: string;
  sendUrl: string;
  otherName: string;
  otherAvatarUrl: string | null;
  emptyHint: string;
}

const POLL_MS = 10_000;

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({ fetchUrl, sendUrl, otherName, otherAvatarUrl, emptyHint }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(fetchUrl);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    // İlk yüklemede anında, sonrasında yumuşak kaydır.
    bottomRef.current?.scrollIntoView({ behavior: firstLoad.current ? "auto" : "smooth" });
    if (messages.length > 0) firstLoad.current = false;
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError("");
    try {
      const res = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Gönderilemedi"); return; }
      setMessages((prev) => [...prev, data.message]);
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Başlık */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle shrink-0">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-neon/10 grid place-items-center shrink-0">
          {otherAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={otherAvatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-neon">{initials(otherName)}</span>
          )}
        </div>
        <div className="font-medium text-sm">{otherName}</div>
      </div>

      {/* Gizlilik uyarısı — mesajlar yönetim tarafından görüntülenebilir */}
      <div className="px-4 py-1.5 text-[11px] text-muted bg-subtle/50 border-b border-subtle shrink-0 text-center">
        Mesajlar yönetim tarafından görüntülenebilir.
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-10 rounded-2xl bg-subtle animate-pulse ${i % 2 ? "w-2/3" : "w-1/2 ml-auto"}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full grid place-items-center text-center text-sm text-muted px-6">
            {emptyHint}
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  m.mine
                    ? "bg-neon text-ink-950 rounded-br-md"
                    : "bg-subtle rounded-bl-md"
                }`}
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div className={`text-[10px] mt-0.5 ${m.mine ? "text-ink-950/60" : "text-faint"}`}>
                  {timeLabel(m.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Gönder */}
      <form onSubmit={send} className="p-3 border-t border-subtle shrink-0">
        {error && <p className="text-xs text-rose-400 mb-2">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(e);
              }
            }}
            placeholder="Mesaj yaz…"
            className="input-base flex-1 resize-none rounded-xl px-3.5 py-2.5 text-sm max-h-32"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="w-10 h-10 rounded-xl bg-neon text-ink-950 grid place-items-center disabled:opacity-40 hover:bg-neon/90 transition-colors shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}
