import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildIcs(opts: { uid: string; start: Date; end: Date; title: string; description?: string; location?: string }): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BahaFitness//TR",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@bahafitness`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(opts.start)}`,
    `DTEND:${icsDate(opts.end)}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    ...(opts.description ? [`DESCRIPTION:${icsEscape(opts.description)}`] : []),
    ...(opts.location ? [`LOCATION:${icsEscape(opts.location)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Hatırlatma",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const appointmentId = req.nextUrl.searchParams.get("appointment");
    const classId = req.nextUrl.searchParams.get("class");

    let ics: string | null = null;
    let filename = "etkinlik.ics";

    if (appointmentId) {
      const appt = await prisma.appointment.findFirst({
        where: { id: appointmentId, memberId: member.id },
        include: { trainer: { include: { user: { select: { name: true } } } } },
      });
      if (!appt) return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });
      ics = buildIcs({
        uid: appt.id,
        start: appt.startAt,
        end: appt.endAt,
        title: `Antrenman — ${appt.trainer.user.name}`,
        description: appt.notes ?? undefined,
        location: "BahaFitness",
      });
      filename = "antrenman-randevusu.ics";
    } else if (classId) {
      const booking = await prisma.classBooking.findFirst({
        where: { classId, memberId: member.id, status: "CONFIRMED" },
        include: { class: true },
      });
      if (!booking) return NextResponse.json({ error: "Ders kaydı bulunamadı" }, { status: 404 });
      ics = buildIcs({
        uid: booking.id,
        start: booking.class.startAt,
        end: booking.class.endAt,
        title: booking.class.title,
        description: booking.class.description ?? undefined,
        location: booking.class.location ?? "BahaFitness",
      });
      filename = "grup-dersi.ics";
    }

    if (!ics) return NextResponse.json({ error: "appointment veya class parametresi gerekli" }, { status: 400 });

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[panel/ics]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
