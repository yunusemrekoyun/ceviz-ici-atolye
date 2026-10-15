import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClassScheduleClient } from "@/components/panel/ClassScheduleClient";
import { BookAppointmentClient } from "@/components/panel/BookAppointmentClient";
import { PageTabs } from "@/components/ui/PageTabs";

const TABS = [
  { key: "grup-dersler", label: "Grup Dersler" },
  { key: "randevu-al",   label: "Randevu Al" },
];

export default async function DerslerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === sp.tab) ? sp.tab! : "grup-dersler";

  const user = await requireUser();

  const now = new Date();

  const member = await prisma.member.findUnique({ where: { userId: user.sub } });

  const classes =
    tab === "grup-dersler"
      ? await prisma.groupClass.findMany({
          where: { isPublished: true, status: "SCHEDULED", startAt: { gte: now } },
          include: {
            trainer: { include: { user: { select: { name: true } } } },
            _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
            bookings: member ? { where: { memberId: member.id }, take: 1 } : false,
          },
          orderBy: { startAt: "asc" },
        })
      : [];

  const trainers =
    tab === "randevu-al"
      ? await prisma.trainer.findMany({
          where: { isActive: true },
          include: {
            user: { select: { name: true, avatarUrl: true } },
            availabilities: { orderBy: { dayOfWeek: "asc" } },
          },
          orderBy: { rating: "desc" },
        })
      : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-body">Panel</div>
        <h1 className="text-2xl font-bold mt-0.5">Dersler</h1>
      </div>

      <PageTabs tabs={TABS} active={tab} baseHref="/panel/dersler" />

      {/* ── Grup Dersler ── */}
      {tab === "grup-dersler" && (
        <ClassScheduleClient
          classes={classes.map((c) => {
            const b = "bookings" in c && Array.isArray(c.bookings) ? c.bookings[0] : undefined;
            return {
              id:          c.id,
              title:       c.title,
              description: c.description,
              trainerName: c.trainer?.user.name ?? null,
              location:    "location" in c ? (c.location as string | null) : null,
              capacity:    c.capacity,
              durationMin: c.durationMin,
              color:       c.color,
              startAt:     c.startAt.toISOString(),
              confirmedCount: c._count.bookings,
              myBooking: b ? { id: b.id, status: b.status, ticketCode: b.ticketCode } : null,
            };
          })}
          hasMembership={!!member}
        />
      )}

      {/* ── Randevu Al ── */}
      {tab === "randevu-al" && (
        <>
          {!member ? (
            <div className="card-surface p-12 text-center text-muted">Üye kaydınız bulunamadı.</div>
          ) : (
            <BookAppointmentClient
              trainers={trainers.map((t) => ({
                id: t.id,
                name: t.user.name ?? "—",
                avatarUrl: t.user.avatarUrl ?? null,
                specialty: t.specialty ?? null,
                experience: t.experience,
                rating: t.rating,
                availableDays: t.availabilities.map((a) => a.dayOfWeek),
              }))}
            />
          )}
        </>
      )}
    </div>
  );
}
