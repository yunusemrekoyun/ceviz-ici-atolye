"use client";

import { useMemo, useState, useTransition } from "react";
import type { RegistrationDto } from "@/lib/api";
import { formatTimeTr, isoToIstanbulLocal, istanbulDayKey } from "@/lib/format";
import { formatDayFull, MonthGrid, TimeSlots } from "@/components/Calendar";
import { Modal } from "@/components/Modal";
import { appointmentMessage, whatsappLink } from "@/lib/whatsapp";
import { Alert, Button } from "@/components/ui";
import { scheduleAppointmentAction, type ActionResult } from "./actions";

type DialogProps = { reg: RegistrationDto; onClose: () => void; onDone: (message: string) => void };

/** Diğer randevular: takvimde gün başına, saat seçiminde saat başına doluluk göstermek için. */
export type BookedSlot = { id: number; appointmentAt: string };

export function AppointmentDialog({ reg, booked, onClose, onDone }: DialogProps & { booked: BookedSlot[] }) {
  const rescheduling = reg.status === "scheduled";
  const initial = rescheduling && reg.appointmentAt ? isoToIstanbulLocal(reg.appointmentAt) : "";
  const today = istanbulDayKey(new Date());
  const [day, setDay] = useState(() => (initial ? initial.slice(0, 10) : istanbulDayKey(new Date(Date.now() + 24 * 60 * 60 * 1000))));
  const [time, setTime] = useState(initial ? initial.slice(11, 16) : "");
  const [month, setMonth] = useState(day.slice(0, 7));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [savedIso, setSavedIso] = useState<string | null>(null);

  const others = useMemo(() => booked.filter((b) => b.id !== reg.id), [booked, reg.id]);
  const dayMarks = useMemo(() => {
    const marks: Record<string, number> = {};
    for (const b of others) {
      const key = istanbulDayKey(b.appointmentAt);
      marks[key] = (marks[key] ?? 0) + 1;
    }
    return marks;
  }, [others]);
  const timeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of others) if (istanbulDayKey(b.appointmentAt) === day) counts[formatTimeTr(b.appointmentAt)] = (counts[formatTimeTr(b.appointmentAt)] ?? 0) + 1;
    return counts;
  }, [others, day]);

  function submit() {
    if (!time) {
      setResult({ ok: false, error: "Randevu saatini seçiniz." });
      return;
    }
    startTransition(async () => {
      const res = await scheduleAppointmentAction(reg.id, `${day}T${time}`);
      setResult(res);
      // Kaydedildi: pencere kapanmadan veliye WhatsApp'tan bildirme adımı gösterilir.
      if (res.ok) setSavedIso(new Date(`${day}T${time}:00+03:00`).toISOString());
    });
  }

  if (savedIso) {
    const done = () => onDone(rescheduling ? "Randevu güncellendi." : "Randevu verildi.");
    return (
      <Modal open title="Randevu kaydedildi" onClose={done}>
        <div className="grid gap-4 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          <p className="text-[15px] text-ink">
            <span className="font-bold">{reg.studentFullName}</span>
            <br />
            {formatDayFull(day)} · <span className="font-bold text-gs-red">{time}</span>
          </p>
          {reg.contact.phone ? (
            <>
              <a
                href={whatsappLink(reg.contact.phone, appointmentMessage(reg.contact.fullName, reg.studentFullName, savedIso))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={done}
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-[16px] font-semibold text-white transition hover:bg-emerald-800 active:scale-[0.97]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
                </svg>
                Veliye WhatsApp&apos;tan Bildir
              </a>
              <p className="text-xs text-muted">Mesaj hazır yazılı açılır, sadece gönder tuşuna basın.</p>
            </>
          ) : null}
          <Button type="button" variant="secondary" onClick={done}>
            Tamam
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      title={`${rescheduling ? "Randevuyu Değiştir" : "Randevu Ver"} · ${reg.studentFullName}`}
      onClose={onClose}
      closeDisabled={pending}
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="button" onClick={submit} loading={pending}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {result && !result.ok ? <Alert>{result.error}</Alert> : null}
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
          <svg className="h-6 w-6 shrink-0 text-gs-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" />
          </svg>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Kayıt randevusu</p>
            <p className="font-bold text-ink">
              {formatDayFull(day)}
              {time ? <span className="text-gs-red"> · {time}</span> : <span className="font-normal text-muted"> · saat seçiniz</span>}
            </p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-[320px_1fr] md:items-start">
          <div className="rounded-2xl border border-line p-3">
            <MonthGrid month={month} onMonthChange={setMonth} selected={day} onSelect={setDay} min={rescheduling ? undefined : today} marks={dayMarks} />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden="true" /> Diğer randevular
            </p>
          </div>
          <TimeSlots value={time} onChange={setTime} counts={timeCounts} />
        </div>
        {reg.contact.phone ? (
          <p className="text-sm text-muted">
            İletişim: <span className="font-semibold text-ink">{reg.contact.fullName}</span> ({reg.contact.typeLabel})
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
