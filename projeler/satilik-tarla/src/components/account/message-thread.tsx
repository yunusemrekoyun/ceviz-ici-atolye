'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Flag, SendHorizonal } from 'lucide-react';
import { sendMessage } from '@/app/(site)/hesap/mesajlar/actions';
import { ComplaintForm } from './complaint-form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/action-result';

type ThreadMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

const timeFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Sohbet penceresi — 10 sn'de bir tazelenir (websocket yok, VPS dostu). */
export function MessageThread({
  conversationId,
  meId,
  messages,
}: {
  conversationId: string;
  meId: string;
  messages: ThreadMessage[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await sendMessage(conversationId, prev, formData);
      if (result.ok) {
        setDraft('');
        formRef.current?.reset();
        router.refresh();
      }
      return result;
    },
    { ok: false },
  );

  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <div>
      <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-muted-foreground">
            İlk mesajı yazın — satıcıya e-postayla da haber verilir.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={cn('flex', mine && 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-2.5 sm:max-w-[70%]',
                    mine
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {m.body}
                  </p>
                  <p
                    className={cn(
                      'nums mt-1 text-[11px]',
                      mine ? 'text-primary-foreground/60' : 'text-muted-foreground',
                    )}
                  >
                    {timeFmt.format(new Date(m.createdAt))}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        ref={formRef}
        action={formAction}
        className="flex items-end gap-2 border-t border-border px-5 py-4"
      >
        <textarea
          name="body"
          rows={2}
          required
          maxLength={2000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Mesajınızı yazın…"
          className="min-h-[3rem] w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-[15px] text-foreground outline-none focus:border-primary"
        />
        <Button type="submit" variant="brass" disabled={pending} className="h-12 shrink-0 px-5">
          <SendHorizonal className="h-4 w-4" />
          <span className="hidden sm:inline">Gönder</span>
        </Button>
      </form>
      {!state.ok && (state.error || state.fieldErrors?.body) ? (
        <p className="px-5 pb-3 text-sm text-destructive">
          {state.error ?? state.fieldErrors?.body?.[0]}
        </p>
      ) : null}

      <div className="border-t border-border px-5 py-3">
        <button
          type="button"
          onClick={() => setComplaintOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <Flag className="h-3.5 w-3.5" />
          Bu görüşmeyi şikayet et
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', complaintOpen && 'rotate-180')}
          />
        </button>
        {complaintOpen ? (
          <div className="mt-3">
            <ComplaintForm conversationId={conversationId} onDone={() => setComplaintOpen(false)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
