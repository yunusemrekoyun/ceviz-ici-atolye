import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { readSystemSettings } from "@/lib/settings";
import { sendMonthlySummaryEmail, sendTrainerMonthlySummaryEmail } from "@/lib/email";
import { MemberStatus } from "@prisma/client";

// VPS crontab'ından günlük tetiklenir:
//   0 3 * * * curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3002/api/cron/daily
//
// Gün sınırları sunucunun yerel saatine göre hesaplanır — container TZ=Europe/Istanbul
// ile çalışmalı, aksi halde hatırlatmalar UTC gününe göre kayar.
export const dynamic = "force-dynamic";

const TRIAL_DAYS = 7;
const REMINDER_DAYS = [7, 3] as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Secret tanımlı değilse endpoint tamamen kapalı — kazara açıkta kalmasın.
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function runDailyJob() {
  const now = new Date();

  // 1) Bitiş tarihi geçmiş üyelikleri kapat.
  //    isActive bayrağı bayat kaldığında QR tarayıcı, üye listesi ve dışa aktarım
  //    süresi dolmuş planı "aktif" göstermeye devam ediyordu.
  const closedMemberships = await prisma.membership.updateMany({
    where: { isActive: true, endDate: { lt: now } },
    data: { isActive: false },
  });

  // 2a) Bir zamanlar üyeliği olan ama artık aktifi kalmayan üyeler → EXPIRED.
  //     FROZEN / SUSPENDED / PENDING olanlara dokunulmaz; onlar adminin bilinçli kararı.
  const expiredMembers = await prisma.member.updateMany({
    where: {
      status: MemberStatus.ACTIVE,
      memberships: { some: {}, none: { isActive: true } },
    },
    data: { status: MemberStatus.EXPIRED },
  });

  // 2b) Hiç üyelik satın almamış ve deneme süresi dolmuş üyeler → PENDING.
  //     "Hiç ödeme yapmadı" ile "üyeliği bitti" ayrı durumlar olarak kalsın diye
  //     EXPIRED değil PENDING kullanılıyor.
  const lapsedTrials = await prisma.member.updateMany({
    where: {
      status: MemberStatus.ACTIVE,
      memberships: { none: {} },
      createdAt: { lt: addDays(now, -TRIAL_DAYS) },
    },
    data: { status: MemberStatus.PENDING },
  });

  // 3) Yenileme hatırlatmaları
  const settings = await readSystemSettings();
  const reminders: Record<string, number> = {};
  let notified = 0;

  if (settings["system.autoRenewalAlerts"]) {
    for (const days of REMINDER_DAYS) {
      const windowStart = startOfDay(addDays(now, days));
      const windowEnd = addDays(windowStart, 1);

      const expiring = await prisma.membership.findMany({
        where: {
          isActive: true,
          endDate: { gte: windowStart, lt: windowEnd },
          member: { status: MemberStatus.ACTIVE },
        },
        select: {
          endDate: true,
          member: { select: { userId: true } },
          plan: { select: { name: true } },
        },
      });

      if (expiring.length === 0) continue;

      const title = `Üyeliğin ${days} gün sonra sona eriyor`;
      const userIds = expiring.map((m) => m.member.userId);

      // Job gün içinde birden fazla çalışsa da aynı hatırlatma tekrar gitmesin.
      const alreadySent = await prisma.notification.findMany({
        where: { userId: { in: userIds }, title, createdAt: { gte: addDays(now, -1) } },
        select: { userId: true },
      });
      const sentTo = new Set(alreadySent.map((n) => n.userId));

      const fresh = expiring.filter((m) => !sentTo.has(m.member.userId));
      if (fresh.length === 0) continue;

      await prisma.notification.createMany({
        data: fresh.map((m) => ({
          userId: m.member.userId,
          title,
          body:
            `${m.plan.name} üyeliğin ` +
            `${m.endDate.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} ` +
            `tarihinde sona eriyor. Kesintisiz devam etmek için yenileyebilirsin.`,
          type: days <= 3 ? "warn" : "info",
        })),
      });

      reminders[`${days}gun`] = fresh.length;
      notified += fresh.length;
    }
  }

  // 4) Bugünün randevu ve ders hatırlatmaları.
  //    Job 03:00'te çalıştığı için üye güne "bugün şu var" bildirimiyle başlar.
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);

  const todaysAppointments = await prisma.appointment.findMany({
    where: { status: "SCHEDULED", startAt: { gte: todayStart, lt: todayEnd } },
    select: {
      startAt: true,
      member: { select: { userId: true } },
      trainer: { select: { user: { select: { name: true } } } },
    },
  });

  const todaysClassBookings = await prisma.classBooking.findMany({
    where: {
      status: "CONFIRMED",
      class: { status: "SCHEDULED", isPublished: true, startAt: { gte: todayStart, lt: todayEnd } },
    },
    select: {
      member: { select: { userId: true } },
      class: { select: { title: true, startAt: true } },
    },
  });

  let sessionReminders = 0;
  const timeFmt = (d: Date) => d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  if (todaysAppointments.length > 0 || todaysClassBookings.length > 0) {
    const candidates = [
      ...todaysAppointments.map((a) => ({
        userId: a.member.userId,
        title: "Bugün randevun var",
        body: `Bugün saat ${timeFmt(a.startAt)} — ${a.trainer.user.name} ile antrenman randevun var.`,
      })),
      ...todaysClassBookings.map((b) => ({
        userId: b.member.userId,
        title: "Bugün dersin var",
        body: `Bugün saat ${timeFmt(b.class.startAt)} — ${b.class.title} dersine kaydın var.`,
      })),
    ];

    // Aynı gün içinde tekrar tetiklenirse aynı hatırlatma ikinci kez gitmesin.
    const alreadySent = await prisma.notification.findMany({
      where: {
        userId: { in: candidates.map((c) => c.userId) },
        title: { in: ["Bugün randevun var", "Bugün dersin var"] },
        createdAt: { gte: todayStart },
      },
      select: { userId: true, title: true, body: true },
    });
    const sentKeys = new Set(alreadySent.map((n) => `${n.userId}|${n.title}|${n.body}`));

    const fresh = candidates.filter((c) => !sentKeys.has(`${c.userId}|${c.title}|${c.body}`));
    if (fresh.length > 0) {
      await prisma.notification.createMany({
        data: fresh.map((c) => ({ ...c, type: "info" })),
      });
      sessionReminders = fresh.length;
    }
  }

  // 5) Ayın ilk günü: geçen ayın özet e-postası.
  //    Sadece o ay en az bir aktivitesi olan üyelere gider; aynı ay içinde
  //    tekrar tetiklenirse bildirim kaydı üzerinden ikinci gönderim engellenir.
  let monthlySummaries = 0;
  if (now.getDate() === 1) {
    const monthEnd = startOfDay(now);
    const monthStart = new Date(monthEnd);
    monthStart.setMonth(monthStart.getMonth() - 1);
    const monthLabel = monthStart.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    const summaryTitle = `${monthLabel} özetin hazır`;
    const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

    const activeMembers = await prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE },
      select: {
        id: true,
        userId: true,
        user: { select: { name: true, email: true } },
        attendances: { where: { checkIn: { gte: monthStart, lt: monthEnd } }, select: { checkIn: true } },
        workoutSessions: { where: { completedAt: { gte: monthStart, lt: monthEnd } }, select: { id: true } },
        measurements: {
          where: { recordedAt: { gte: monthStart, lt: monthEnd } },
          orderBy: { recordedAt: "asc" },
          select: { weightKg: true },
        },
      },
    });

    const withActivity = activeMembers.filter(
      (m) => m.attendances.length > 0 || m.workoutSessions.length > 0
    );

    if (withActivity.length > 0) {
      const alreadySummarized = await prisma.notification.findMany({
        where: {
          userId: { in: withActivity.map((m) => m.userId) },
          title: summaryTitle,
        },
        select: { userId: true },
      });
      const summarizedSet = new Set(alreadySummarized.map((n) => n.userId));

      for (const m of withActivity) {
        if (summarizedSet.has(m.userId)) continue;

        const dayCounts = new Map<number, number>();
        for (const a of m.attendances) {
          const d = a.checkIn.getDay();
          dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
        }
        const busiest = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0];

        const weights = m.measurements.map((x) => x.weightKg).filter((w): w is number => w != null);
        const weightDelta =
          weights.length >= 2 ? +(weights[weights.length - 1] - weights[0]).toFixed(1) : null;

        await sendMonthlySummaryEmail(m.user.email, m.user.name, {
          monthLabel,
          checkIns: m.attendances.length,
          workouts: m.workoutSessions.length,
          weightDelta,
          busiestDay: busiest ? DAY_NAMES[busiest[0]] : null,
        });

        await prisma.notification.create({
          data: {
            userId: m.userId,
            title: summaryTitle,
            body: `${monthLabel}: ${m.attendances.length} check-in, ${m.workoutSessions.length} antrenman. Detay e-postanda.`,
            type: "success",
          },
        });
        monthlySummaries++;
      }
    }

    // Eğitmen özetleri — aynı ay-içi tekrar koruması bildirim kaydıyla.
    const trainerSummaryTitle = `${monthLabel} eğitmen özetin hazır`;
    const trainers = await prisma.trainer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        userId: true,
        user: { select: { name: true, email: true } },
        appointments: {
          where: { startAt: { gte: monthStart, lt: monthEnd } },
          select: { status: true, startAt: true, rating: true },
        },
        groupClasses: {
          where: { startAt: { gte: monthStart, lt: monthEnd }, status: { not: "CANCELLED" } },
          select: { id: true },
        },
      },
    });

    const activeTrainers = trainers.filter(
      (t) => t.appointments.length > 0 || t.groupClasses.length > 0
    );

    if (activeTrainers.length > 0) {
      const alreadySent = await prisma.notification.findMany({
        where: { userId: { in: activeTrainers.map((t) => t.userId) }, title: trainerSummaryTitle },
        select: { userId: true },
      });
      const sentSet = new Set(alreadySent.map((n) => n.userId));

      for (const t of activeTrainers) {
        if (sentSet.has(t.userId)) continue;

        const completed = t.appointments.filter((a) => a.status === "COMPLETED");
        const ratings = t.appointments.map((a) => a.rating).filter((r): r is number => r != null);
        const avgRating = ratings.length > 0
          ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
          : null;

        const dayCounts = new Map<number, number>();
        for (const a of completed) {
          const d = a.startAt.getDay();
          dayCounts.set(d, (dayCounts.get(d) ?? 0) + 1);
        }
        const busiest = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0];

        await sendTrainerMonthlySummaryEmail(t.user.email, t.user.name, {
          monthLabel,
          completedSessions: completed.length,
          classesTaught: t.groupClasses.length,
          avgRating,
          busiestDay: busiest ? DAY_NAMES[busiest[0]] : null,
        });

        await prisma.notification.create({
          data: {
            userId: t.userId,
            title: trainerSummaryTitle,
            body: `${monthLabel}: ${completed.length} seans, ${t.groupClasses.length} ders${avgRating != null ? `, ortalama ★ ${avgRating}` : ""}. Detay e-postanda.`,
            type: "success",
          },
        });
        monthlySummaries++;
      }
    }
  }

  return {
    closedMemberships: closedMemberships.count,
    expiredMembers: expiredMembers.count,
    lapsedTrials: lapsedTrials.count,
    notified,
    reminders,
    sessionReminders,
    monthlySummaries,
    autoRenewalAlerts: settings["system.autoRenewalAlerts"],
  };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const result = await runDailyJob();
    await audit({ action: "cron.daily", entity: "system", meta: result });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron/daily]", e);
    await audit({
      action: "cron.daily.failed",
      entity: "system",
      meta: { error: e instanceof Error ? e.message : String(e) },
    });
    return NextResponse.json({ error: "Job çalıştırılamadı" }, { status: 500 });
  }
}

// curl ile elle tetiklemeyi kolaylaştırmak için GET de aynı işi yapar.
export const GET = POST;
