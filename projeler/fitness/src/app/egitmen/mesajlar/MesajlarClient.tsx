"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { initials } from "@/lib/utils";
import { ChatThread } from "@/components/ChatThread";

interface Conversation {
  memberId: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: { body: string; createdAt: string; mine: boolean } | null;
  unread: number;
}

const LIST_POLL_MS = 15_000;

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export function MesajlarClient() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/trainer/messages");
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, LIST_POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  function select(c: Conversation) {
    setSelected(c);
    // Açınca okunmuş sayılır — rozeti hemen düşür.
    setConversations((prev) => prev.map((x) => (x.memberId === c.memberId ? { ...x, unread: 0 } : x)));
  }

  return (
    <div className="card-surface rounded-2xl overflow-hidden h-[70vh] flex">
      {/* Konuşma listesi */}
      <div className={`w-full lg:w-80 lg:border-r border-subtle flex-col shrink-0 ${selected ? "hidden lg:flex" : "flex"}`}>
        <div className="px-4 py-3 border-b border-subtle font-semibold text-sm shrink-0">Üyelerim</div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-subtle animate-pulse" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="h-full grid place-items-center text-center text-sm text-muted px-6">
              Sana atanmış üye yok.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.memberId}
                onClick={() => select(c)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-subtle transition-colors ${
                  selected?.memberId === c.memberId ? "bg-subtle" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-neon/10 grid place-items-center shrink-0">
                  {c.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-neon">{initials(c.name)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm truncate ${c.unread > 0 ? "font-bold" : "font-medium"}`}>{c.name}</span>
                    {c.lastMessage && (
                      <span className="text-[10px] text-faint shrink-0">{timeLabel(c.lastMessage.createdAt)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className={`text-xs truncate ${c.unread > 0 ? "text-primary" : "text-muted"}`}>
                      {c.lastMessage
                        ? `${c.lastMessage.mine ? "Sen: " : ""}${c.lastMessage.body}`
                        : "Henüz mesaj yok"}
                    </span>
                    {c.unread > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-neon text-ink-950 text-[10px] font-bold shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sohbet */}
      <div className={`flex-1 flex-col min-w-0 ${selected ? "flex" : "hidden lg:flex"}`}>
        {selected ? (
          <>
            <button
              onClick={() => { setSelected(null); load(); }}
              className="lg:hidden flex items-center gap-1.5 px-4 py-2 text-xs text-muted hover:text-primary border-b border-subtle"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Üyelerim
            </button>
            <div className="flex-1 min-h-0">
              <ChatThread
                key={selected.memberId}
                fetchUrl={`/api/trainer/messages/${selected.memberId}`}
                sendUrl={`/api/trainer/messages/${selected.memberId}`}
                otherName={selected.name}
                otherAvatarUrl={selected.avatarUrl}
                emptyHint="Bu üyeyle ilk mesajlaşmayı başlat — programı hakkında bilgi ver, motive et."
              />
            </div>
          </>
        ) : (
          <div className="h-full grid place-items-center text-center px-6">
            <div>
              <MessageCircle className="w-10 h-10 text-neon/30 mx-auto" />
              <p className="mt-3 text-sm text-muted">Sohbet başlatmak için soldan bir üye seç.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
