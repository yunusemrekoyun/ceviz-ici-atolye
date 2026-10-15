'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

type Item = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

const timeFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/** Header zili — 60 sn'de bir okunmamış sayısını yoklar; açılınca listeyi
 * gösterip tümünü okundu işaretler. Yalnızca oturumlu kullanıcıda render edilir. */
export function NotificationBell({ dark }: { dark?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/bildirimler');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // ağ hatasında sessiz kal
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- yanlış pozitif: load async, setState fetch cevabından sonra çalışır
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      try {
        await fetch('/api/bildirimler', { method: 'POST' });
      } catch {
        // sessiz
      }
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Bildirimler (${unread} okunmamış)` : 'Bildirimler'}
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-sm transition-colors',
          dark
            ? 'text-white/85 hover:bg-white/10 hover:text-white'
            : 'text-foreground/80 hover:bg-secondary hover:text-foreground',
        )}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="nums absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brass px-1 text-[11px] font-bold text-brass-foreground">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[21rem] overflow-hidden rounded-lg border border-border bg-card shadow-soft">
          <div className="border-b border-border px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Bildirimler
          </div>
          <div className="max-h-[19rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[14px] text-muted-foreground">
                Henüz bildiriminiz yok.
              </p>
            ) : (
              items.map((n) => {
                const inner = (
                  <>
                    <span className="block text-[14px] font-semibold text-foreground">
                      {n.title}
                    </span>
                    {n.body ? (
                      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                        {n.body}
                      </span>
                    ) : null}
                    <span className="nums mt-0.5 block text-[11px] text-muted-foreground">
                      {timeFmt.format(new Date(n.createdAt))}
                    </span>
                  </>
                );
                const rowClass = cn(
                  'block border-b border-border px-4 py-3 last:border-0',
                  !n.readAt && 'bg-secondary/50',
                );
                return n.href ? (
                  <Link
                    key={n.id}
                    href={n.href}
                    className={cn(rowClass, 'hover:bg-secondary')}
                    onClick={() => setOpen(false)}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id} className={rowClass}>
                    {inner}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
