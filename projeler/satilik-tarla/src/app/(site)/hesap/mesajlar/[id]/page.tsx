import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { MessageThread } from '@/components/account/message-thread';

export const metadata: Metadata = { title: 'Mesajlar' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession();
  if (!session) redirect(`/giris?callbackURL=/hesap/mesajlar/${id}`);
  const me = session.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: { select: { title: true, slug: true, status: true } },
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!conversation || (conversation.buyer.id !== me && conversation.seller.id !== me)) {
    notFound();
  }

  // Gelenler okundu — sayfa dinamik, cache yok; rozetler bir sonraki
  // sorguda düşer.
  await prisma.message.updateMany({
    where: { conversationId: id, senderId: { not: me }, readAt: null },
    data: { readAt: new Date() },
  });

  const other = conversation.buyer.id === me ? conversation.seller : conversation.buyer;

  return (
    <div className="container py-12 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/hesap/mesajlar"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Tüm mesajlar
        </Link>

        <div className="mt-4 rounded-lg border border-border bg-card shadow-soft-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
            <div>
              <h1 className="font-heading text-[17px] font-semibold text-foreground">
                {other.name}
              </h1>
              {conversation.listing ? (
                <Link
                  href={`/ilan/${conversation.listing.slug}`}
                  className="text-[13px] text-brass-strong hover:underline"
                >
                  {conversation.listing.title}
                </Link>
              ) : (
                <span className="text-[13px] text-muted-foreground">İlan kaldırıldı</span>
              )}
            </div>
          </div>

          <MessageThread
            conversationId={conversation.id}
            meId={me}
            messages={conversation.messages.map((m) => ({
              id: m.id,
              senderId: m.senderId,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </div>
  );
}
