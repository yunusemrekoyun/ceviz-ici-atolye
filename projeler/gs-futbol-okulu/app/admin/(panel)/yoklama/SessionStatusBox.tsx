"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Field, Input } from "@/components/ui";
import { dayLabel } from "@/lib/billing-shared";
import { cancelSessionAction, restoreSessionAction } from "../program/actions";
import { useAct } from "../program/ProgramManager";

/**
 * Yoklama ekranında antrenmanın yapılıp yapılmadığı: yapılmadıysa iptal edilir (hak düşmez), geçmiş günler için de.
 * Geçmiş antrenmanda velilere duyuru varsayılan olarak kapalıdır.
 */
export function SessionStatusBox({
  session,
  today,
  marked,
}: {
  session: { id: number; groupName: string; date: string; startTime: string; status: string; cancelReason: string | null };
  today: string;
  /** Yoklaması işaretlenmiş öğrenci sayısı. */
  marked: number;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [announce, setAnnounce] = useState(session.date >= today);
  const [error, setError] = useState<string | null>(null);
  const { busy, act } = useAct();

  if (session.status === "cancelled")
    return (
      <div className="mb-5 flex flex-col items-start gap-3 rounded-2xl bg-stone-50 px-4 py-3 ring-1 ring-inset ring-line sm:flex-row sm:items-center">
        <p className="min-w-0 text-[15px] text-ink sm:flex-1">
          <span className="font-semibold">Bu antrenman iptal edildi</span>
          {session.cancelReason ? `: ${session.cancelReason}` : ""}. Çocukların hakkından düşmedi.
        </p>
        <Button type="button" size="md" variant="secondary" loading={busy} onClick={() => act(() => restoreSessionAction(session.id), "İptal geri alındı.")}>
          İptali geri al
        </Button>
      </div>
    );

  return (
    <>
      <div className="mb-5 flex flex-col items-start gap-3 rounded-2xl bg-stone-50 px-4 py-3 ring-1 ring-inset ring-line sm:flex-row sm:items-center">
        <p className="min-w-0 text-[15px] text-ink sm:flex-1">Antrenman yapılmadıysa (yağmur, saha kapalı) iptal edin; çocukların hakkından düşmez.</p>
        <Button type="button" size="md" variant="secondary" onClick={() => setOpen(true)}>
          Antrenman yapılmadı
        </Button>
      </div>
      {open ? (
        <Modal
          open
          title={`${session.groupName} · ${dayLabel(session.date, false)} ${session.startTime}`}
          onClose={() => setOpen(false)}
          closeDisabled={busy}
          footer={
            <>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="danger"
                loading={busy}
                onClick={() =>
                  act(
                    async () => {
                      const res = await cancelSessionAction(session.id, reason, announce);
                      if (!res.ok) setError(res.error);
                      return res;
                    },
                    "Antrenman iptal edildi; hak düşmedi.",
                    () => setOpen(false),
                  )
                }
              >
                Antrenmanı iptal et
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            {marked ? (
              <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950 ring-1 ring-inset ring-amber-600/25">
                Bu antrenmanda {marked} öğrencinin yoklaması işaretlenmiş. Antrenman gerçekten yapılmadıysa iptal edin.
              </p>
            ) : null}
            <Field label="İptal nedeni" htmlFor="cancel-reason" required error={error ?? undefined}>
              <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ör. yağmur nedeniyle saha kapalı" maxLength={300} autoFocus />
            </Field>
            <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-gs-red)]" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
              Grubun velilerine duyur
            </label>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
