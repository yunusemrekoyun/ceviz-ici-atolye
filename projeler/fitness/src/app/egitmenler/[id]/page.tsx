import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ArrowLeft, ArrowRight, Star, CalendarDays } from "lucide-react";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export default async function TrainerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const trainer = await prisma.trainer.findFirst({
    where: { id, isActive: true },
    include: {
      user: { select: { name: true, avatarUrl: true } },
      availabilities: { orderBy: { dayOfWeek: "asc" } },
    },
  });

  if (!trainer) notFound();

  const otherTrainers = await prisma.trainer.findMany({
    where: { isActive: true, NOT: { id: trainer.id } },
    include: { user: { select: { name: true, avatarUrl: true } } },
    orderBy: { rating: "desc" },
    take: 3,
  });

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 md:pt-20">
        <div className="container-app max-w-4xl py-12">
          <Link href="/#egitmenler" className="inline-flex items-center gap-2 text-sm text-label hover:text-neon transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Tüm Eğitmenler
          </Link>

          <div className="grid md:grid-cols-[280px_1fr] gap-8">
            <div>
              <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-neon/10 to-accent-cyan/10 flex items-center justify-center border border-subtle-md">
                {trainer.user.avatarUrl ? (
                  <img src={trainer.user.avatarUrl} alt={trainer.user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-3xl font-bold">
                    {initials(trainer.user.name)}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center gap-1.5 justify-center text-sm">
                <Star className="w-4 h-4 fill-neon text-neon" />
                <span className="font-semibold">{Number(trainer.rating).toFixed(1)}</span>
                <span className="text-muted">puan</span>
              </div>
            </div>

            <div>
              <h1 className="h-display text-3xl md:text-4xl">{trainer.user.name}</h1>
              <div className="mt-2 flex items-center gap-3 flex-wrap text-sm text-body">
                {trainer.specialty && <span className="badge badge-neon">{trainer.specialty}</span>}
                <span>{trainer.experience} yıl deneyim</span>
              </div>

              {trainer.bio && (
                <p className="mt-6 text-body leading-relaxed">{trainer.bio}</p>
              )}

              {trainer.availabilities.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2 text-sm font-semibold text-strong mb-3">
                    <CalendarDays className="w-4 h-4 text-neon" />
                    Müsait Olduğu Günler
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trainer.availabilities.map((a) => (
                      <span key={a.id} className="badge badge-neutral">
                        {DAY_LABELS[a.dayOfWeek] ?? "—"} · {a.startTime}-{a.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-10 card-surface p-6 flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="font-semibold">Bu eğitmenle çalışmak ister misin?</div>
                  <p className="text-sm text-muted mt-1">Üye olduktan sonra panelinden randevu alabilirsin.</p>
                </div>
                <Link href="/kayit" className="btn-primary btn-md shrink-0">
                  Üye Ol <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {otherTrainers.length > 0 && (
            <div className="mt-16">
              <h2 className="text-lg font-semibold mb-6 text-strong">Diğer Eğitmenler</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {otherTrainers.map((t) => (
                  <Link key={t.id} href={`/egitmenler/${t.id}`} className="group">
                    <div className="card-surface overflow-hidden hover:border-neon/20 transition-colors">
                      <div className="aspect-square overflow-hidden bg-gradient-to-br from-neon/5 to-accent-cyan/5 flex items-center justify-center">
                        {t.user.avatarUrl ? (
                          <img src={t.user.avatarUrl} alt={t.user.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 font-bold">
                            {initials(t.user.name)}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-sm font-medium group-hover:text-neon transition-colors">{t.user.name}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
