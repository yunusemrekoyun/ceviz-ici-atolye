"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { excuseAction } from "@/app/veli/actions";

/**
 * Sıradaki antrenman kartındaki "Gelemeyecek" düğmesi: önce sorar, sonra antrenöre izinli olarak iletir.
 * Bildirildiyse durum ve "geri al" gösterilir.
 */
export function CantCome({ registrationId, sessionId, firstName, excused }: { registrationId: number; sessionId: number; firstName: string; excused: boolean }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const send = (on: boolean) =>
    startTransition(async () => {
      const res = await excuseAction(registrationId, sessionId, on);
      if (!res.ok) return setError(res.error);
      setError(null);
      setAsking(false);
      router.refresh();
    });

  if (excused)
    return (
      <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-amber-950">
        <p className="text-[16px] font-bold">{firstName} bu antrenmana gelemeyecek</p>
        <p className="text-[15px]">Antrenöre iletildi; yoklamada izinli görünür.</p>
        <button type="button" disabled={busy} onClick={() => send(false)} className="mt-2 inline-flex min-h-11 cursor-pointer items-center font-semibold text-gs-red underline underline-offset-2 disabled:opacity-60">
          {busy ? "Geri alınıyor…" : "Vazgeçtim, gelecek"}
        </button>
        {error ? <p className="mt-1 text-sm font-semibold text-red-800">{error}</p> : null}
      </div>
    );

  if (asking)
    return (
      <div className="mt-3 rounded-2xl border-2 border-line p-3">
        <p className="text-[16px] font-bold text-ink">{firstName} bu antrenmana gelemeyecek mi?</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={() => send(true)} className="min-h-12 cursor-pointer rounded-xl bg-ink text-[16px] font-bold text-white disabled:opacity-60">
            {busy ? "Gönderiliyor…" : "Evet, gelemeyecek"}
          </button>
          <button type="button" disabled={busy} onClick={() => setAsking(false)} className="min-h-12 cursor-pointer rounded-xl border-2 border-line text-[16px] font-bold text-ink">
            Vazgeç
          </button>
        </div>
        {error ? <p className="mt-2 text-sm font-semibold text-red-800">{error}</p> : null}
      </div>
    );

  return (
    <button type="button" onClick={() => setAsking(true)} className="mt-2 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl text-[16px] font-semibold text-muted underline-offset-2 hover:underline">
      Bu antrenmana gelemeyecek
    </button>
  );
}
