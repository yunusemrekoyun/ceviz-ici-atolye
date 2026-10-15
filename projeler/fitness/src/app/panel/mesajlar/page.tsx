import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { ChatThread } from "@/components/ChatThread";

export const metadata = { title: "Mesajlar" };

export default async function MesajlarPage() {
  const user = await requireUser();
  const member = await prisma.member.findUnique({
    where: { userId: user.sub },
    include: { trainer: { include: { user: { select: { name: true, avatarUrl: true } } } } },
  });

  if (!member?.trainer) {
    return (
      <div className="card-surface p-12 text-center max-w-lg mx-auto">
        <MessageCircle className="w-10 h-10 text-neon/40 mx-auto" />
        <div className="mt-4 font-semibold">Henüz bir eğitmenin yok</div>
        <p className="mt-2 text-sm text-muted">
          Sana bir eğitmen atandığında buradan doğrudan yazışabilirsin.
        </p>
        <Link href="/panel/antrenman?tab=randevu-al" className="mt-5 btn-primary btn-sm inline-flex">
          Eğitmenlere Göz At
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <div className="text-sm text-body">Panel</div>
        <h1 className="text-2xl font-bold mt-0.5">Mesajlar</h1>
      </div>
      <div className="card-surface rounded-2xl overflow-hidden h-[65vh]">
        <ChatThread
          fetchUrl="/api/panel/messages"
          sendUrl="/api/panel/messages"
          otherName={member.trainer.user.name}
          otherAvatarUrl={member.trainer.user.avatarUrl}
          emptyHint="Eğitmeninle ilk mesajlaşmanı başlat — soru sor, programınla ilgili geri bildirim ver."
        />
      </div>
    </div>
  );
}
