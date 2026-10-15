import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { SectionHeading } from '@/components/site/section-heading';

export const metadata: Metadata = { title: 'Mesajlarım' };

const timeFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function Page() {
  const session = await getServerSession();
  if (!session) redirect('/giris?callbackURL=/hesap/mesajlar');
  const me = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: me }, { sellerId: me }] },
    include: {
      listing: { select: { title: true, slug: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: {
        select: {
          messages: { where: { readAt: null, senderId: { not: me } } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="Hesabım"
        title="Mesajlarım"
        subtitle="İlanlar üzerinden yürüttüğünüz görüşmeler."
      />

      <div className="mt-8 max-w-3xl space-y-3">
        {conversations.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center shadow-soft-sm">
            <MessageCircle className="mx-auto h-8 w-8 text-brass-strong" aria-hidden="true" />
            <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">
              Henüz mesajınız yok
            </h3>
            <p className="mx-auto mt-2 max-w-sm leading-relaxed text-muted-foreground">
              İlan sayfalarındaki &quot;Mesaj Gönder&quot; ile satıcılarla görüşme
              başlatabilirsiniz.
            </p>
          </div>
        ) : (
          conversations.map((c) => {
            const other = c.buyer.id === me ? c.seller : c.buyer;
            const last = c.messages[0];
            const unread = c._count.messages;
            return (
              <Link
                key={c.id}
                href={`/hesap/mesajlar/${c.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-soft-sm transition-colors hover:border-primary"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-heading text-[15px] font-semibold text-foreground">
                      {other.name}
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {c.listing?.title ?? 'İlan'}
                    </span>
                  </div>
                  {last ? (
                    <p className="mt-1 truncate text-[14px] text-muted-foreground">{last.body}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {last ? (
                    <span className="nums text-[12px] text-muted-foreground">
                      {timeFmt.format(last.createdAt)}
                    </span>
                  ) : null}
                  {unread > 0 ? (
                    <span className="nums grid h-6 min-w-6 place-items-center rounded-full bg-brass px-1.5 text-[12px] font-bold text-brass-foreground">
                      {unread}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
