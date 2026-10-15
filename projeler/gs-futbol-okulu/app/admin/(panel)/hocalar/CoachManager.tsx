"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CoachProfile } from "@/lib/db/schema";
import { useToast } from "@/components/admin/Toast";
import { Button, Input } from "@/components/ui";
import { saveCoachAction } from "./actions";

export function CoachManager({ profiles }: { profiles: CoachProfile[] }) {
  const [adding, setAdding] = useState(false);
  return <div className="mt-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <a href="/#hocalar" target="_blank" rel="noopener" className="text-sm font-semibold text-brand underline underline-offset-4">Ana sayfada görüntüle</a>
      <Button type="button" disabled={adding} onClick={() => setAdding(true)}>+ Hoca ekle</Button>
    </div>
    <div className="space-y-4">
      {adding ? <CoachEditor profile={null} onDone={() => setAdding(false)} onCancel={() => setAdding(false)}/> : null}
      {profiles.map(profile => <CoachEditor key={`${profile.id}-${profile.updatedAt}`} profile={profile}/>)}
      {!profiles.length && !adding ? <p className="rounded-2xl border border-line bg-white p-6 text-muted">Henüz tanıtım eklenmedi. İlk hoca profilini ekleyin.</p> : null}
    </div>
  </div>;
}

function CoachEditor({ profile, onDone, onCancel }: { profile: CoachProfile | null; onDone?: () => void; onCancel?: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const prefix = `coach-${profile?.id ?? "new"}`;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const photo = preview ?? (profile?.photoKey ? `/medya/hocalar/${profile.photoKey}` : null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const result = await saveCoachAction(profile?.id ?? null, form);
        if (!result.ok) { setError(result.error); return; }
        toast({ text: "Hoca tanıtımı kaydedildi." });
        onDone?.();
        router.refresh();
      } catch { setError("Kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin."); }
    });
  }
  const inputClass = "mt-1 w-full";
  const labelClass = "block text-sm font-semibold text-ink";
  return <form onSubmit={submit} aria-label={profile ? `${profile.name} tanıtımı` : "Yeni hoca tanıtımı"}
    className="rounded-2xl border border-line bg-white p-4 sm:p-5">
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <h2 className="text-base font-bold text-ink">{profile?.name ?? "Yeni hoca"}</h2>
      {profile ? <span className={`rounded-md px-2 py-1 text-xs ${profile.isPublished ? "bg-green-50 text-green-800" : "bg-surface text-muted"}`}>{profile.isPublished ? "Yayında" : "Taslak"}</span> : null}
    </div>
    <fieldset disabled={busy} className="grid min-w-0 gap-5 sm:grid-cols-[190px_1fr]">
      <div>
        <div className="mb-3 flex h-56 items-end justify-center overflow-hidden rounded-xl border border-line bg-surface">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={`${profile?.name ?? "Yeni hoca"} fotoğrafı`} className="h-full w-full object-contain"/>
          ) : <span className="self-center text-sm text-muted">Fotoğraf ekleyin</span>}
        </div>
        <label htmlFor={`${prefix}-photo`} className={labelClass}>Fotoğraf</label>
        <input id={`${prefix}-photo`} name="photo" type="file" accept="image/jpeg,image/png,image/webp"
          className="mt-2 block w-full text-xs text-muted file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-surface file:px-3 file:py-3 file:font-semibold file:text-ink"
          onChange={event => { const file = event.target.files?.[0]; setPreview(file ? URL.createObjectURL(file) : null); }} aria-describedby={`${prefix}-photo-help`}/>
        <p id={`${prefix}-photo-help`} className="mt-2 text-xs leading-relaxed text-muted">Çıkartma görünümü için arka planı şeffaf PNG veya WebP kullanın. JPG de yüklenebilir. En fazla 10 MB.</p>
      </div>
      <div className="min-w-0 space-y-4">
        <label className={labelClass}>Ad soyad<Input className={inputClass} name="name" defaultValue={profile?.name ?? ""} required minLength={2} maxLength={120}/></label>
        <label className={labelClass}>Görev / uzmanlık<Input className={inputClass} name="role" defaultValue={profile?.role ?? ""} required minLength={2} maxLength={120}/></label>
        <label className={labelClass}>Kısa tanıtım<textarea name="bio" defaultValue={profile?.bio ?? ""} required minLength={10} maxLength={1000} rows={4}
          className="mt-1 w-full resize-y rounded-xl border border-line bg-white px-3 py-2.5 text-base font-normal leading-relaxed text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"/></label>
        <label className={`${labelClass} max-w-36`}>Sıra numarası<Input className={inputClass} name="sortOrder" type="number" min={0} max={999} step={1} required defaultValue={profile?.sortOrder ?? 0}/></label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink"><input type="checkbox" name="isPublished" defaultChecked={profile?.isPublished ?? false} className="h-5 w-5 accent-brand"/>Ana sayfada göster</label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-muted"><input type="checkbox" name="isDemo" defaultChecked={profile?.isDemo ?? false} className="h-5 w-5 accent-brand"/>Örnek profil etiketi göster</label>
      </div>
    </fieldset>
    {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
    <div className="mt-5 flex justify-end gap-3">
      {onCancel ? <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>Vazgeç</Button> : null}
      <Button type="submit" disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</Button>
    </div>
  </form>;
}
