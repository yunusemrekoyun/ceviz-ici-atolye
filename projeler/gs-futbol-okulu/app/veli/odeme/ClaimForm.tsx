"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { shrinkImage } from "@/lib/image-client";
import { paymentClaimAction } from "../actions";

export function ClaimForm({ registrationId }: { registrationId: number }) {
  const [method, setMethod] = useState<"eft" | "cash" | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, startTransition] = useTransition();

  if (done)
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
        <p className="text-5xl" aria-hidden="true">
          ✓
        </p>
        <p className="mt-2 text-xl font-bold text-ink">Bildiriminiz alındı</p>
        <p className="mt-2 text-lg text-ink">Okul ödemeyi kontrol edip onaylayınca bildirim alacaksınız.</p>
        <Link href={`/veli?ogrenci=${registrationId}`} className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-2xl bg-gs-red text-lg font-bold text-white">
          Ana sayfa
        </Link>
      </div>
    );

  const submit = () =>
    startTransition(async () => {
      if (!method) return setError("Ödemeyi nasıl yaptığınızı seçin.");
      const form = new FormData();
      form.set("method", method);
      form.set("note", note);
      if (file) form.set("receipt", file.type.startsWith("image/") ? await shrinkImage(file, 1800) : file);
      const res = await paymentClaimAction(registrationId, form);
      if (!res.ok) setError(res.error);
      else setDone(true);
    });

  return (
    <div className="grid gap-5 rounded-3xl bg-white p-5 shadow-sm">
      <fieldset>
        <legend className="mb-2 text-lg font-bold text-ink">Nasıl ödediniz?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["eft", "Havale / EFT"],
              ["cash", "Nakit"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={method === k}
              onClick={() => setMethod(k)}
              className={["min-h-16 cursor-pointer rounded-2xl border-2 text-lg font-bold transition", method === k ? "border-gs-red bg-gs-red-soft text-gs-red" : "border-line bg-white text-ink"].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {method === "eft" ? (
        <div>
          <p className="mb-2 text-lg font-bold text-ink">Dekont (isteğe bağlı)</p>
          <label className="flex min-h-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface px-4 text-center font-semibold text-ink">
            {file ? `Seçildi: ${file.name}` : "Fotoğraf çek ya da dosya seç"}
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      ) : null}
      <div>
        <label htmlFor="claim-note" className="mb-2 block text-lg font-bold text-ink">
          Not (isteğe bağlı)
        </label>
        <input id="claim-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={method === "cash" ? "Ör. antrenörümüze teslim ettim" : "Ör. annesinin hesabından gönderildi"} className="block min-h-14 w-full rounded-2xl border-2 border-line px-4 text-[17px] outline-none focus:border-gs-red" />
      </div>
      {error ? <p className="rounded-2xl bg-red-50 p-3 font-semibold text-red-800">{error}</p> : null}
      <button type="button" onClick={submit} disabled={busy} className="min-h-16 cursor-pointer rounded-2xl bg-gs-red text-xl font-black text-white disabled:opacity-60">
        {busy ? "Gönderiliyor…" : "Bildir"}
      </button>
    </div>
  );
}
