"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, ArrowLeft, Loader2, User, Dumbbell } from "lucide-react";

interface Conversation {
  memberId: string;
  trainerId: string;
  memberName: string;
  trainerName: string;
  lastMessage: { body: string; createdAt: string; fromTrainer: boolean };
}
interface Msg { id: string; body: string; senderIsTrainer: boolean; createdAt: string }

function timeLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function MesajlasmalarClient() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/direct-messages")
      .then((r) => r.json())
      .then((d) => setConvos(d.conversations ?? []))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (!active) return;
    setLoadingThread(true);
    fetch(`/api/admin/direct-messages?memberId=${active.memberId}&trainerId=${active.trainerId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.messages ?? []))
      .finally(() => setLoadingThread(false));
  }, [active]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView();
  }, [messages]);

  return (
    <div className="card-surface overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] h-[70vh]">
      {/* Konuşma listesi */}
      <div className={`border-r border-subtle overflow-y-auto ${active ? "hidden md:block" : "block"}`}>
        {loadingList ? (
          <div className="p-6 text-center text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : convos.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />Henüz yazışma yok
          </div>
        ) : (
          convos.map((c) => (
            <button
              key={`${c.memberId}-${c.trainerId}`}
              onClick={() => setActive(c)}
              className={`w-full text-left px-4 py-3 border-b border-subtle/60 hover:bg-subtle transition-colors ${
                active?.memberId === c.memberId && active?.trainerId === c.trainerId ? "bg-subtle" : ""
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <User className="w-3.5 h-3.5 text-accent-cyan shrink-0" />{c.memberName}
                <span className="text-faint">↔</span>
                <Dumbbell className="w-3.5 h-3.5 text-neon shrink-0" />{c.trainerName}
              </div>
              <div className="text-xs text-muted truncate mt-1">
                {c.lastMessage.fromTrainer ? "Eğitmen: " : "Üye: "}{c.lastMessage.body}
              </div>
              <div className="text-[10px] text-faint mt-0.5">{timeLabel(c.lastMessage.createdAt)}</div>
            </button>
          ))
        )}
      </div>

      {/* Thread (salt-okunur) */}
      <div className={`flex flex-col ${active ? "flex" : "hidden md:flex"}`}>
        {!active ? (
          <div className="flex-1 grid place-items-center text-muted text-sm">Bir konuşma seç</div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-subtle shrink-0">
              <button onClick={() => setActive(null)} className="md:hidden p-1 -ml-1 text-muted"><ArrowLeft className="w-4 h-4" /></button>
              <div className="text-sm">
                <span className="text-accent-cyan font-medium">{active.memberName}</span>
                <span className="text-faint mx-1.5">↔</span>
                <span className="text-neon font-medium">{active.trainerName}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingThread ? (
                <div className="text-center text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderIsTrainer ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.senderIsTrainer ? "bg-neon/15 rounded-br-md" : "bg-subtle rounded-bl-md"}`}>
                      <div className="text-[10px] font-medium mb-0.5 opacity-70">{m.senderIsTrainer ? active.trainerName : active.memberName}</div>
                      <div className="whitespace-pre-wrap break-words">{m.body}</div>
                      <div className="text-[10px] mt-0.5 text-faint">{timeLabel(m.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
            <div className="px-4 py-2.5 border-t border-subtle text-[11px] text-muted text-center shrink-0">
              Salt okunur — yönetim bu yazışmalara yanıt veremez.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
