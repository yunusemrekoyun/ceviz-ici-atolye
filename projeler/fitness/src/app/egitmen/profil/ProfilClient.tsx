"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { useUpload } from "@/hooks/useUpload";
import { initials } from "@/lib/utils";
import Link from "next/link";

interface Props {
  trainerId: string;
  initial: {
    name: string;
    phone: string;
    avatarUrl: string | null;
    bio: string;
    specialty: string;
    experience: number;
  };
}

export function ProfilClient({ trainerId, initial }: Props) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { upload, uploading } = useUpload("trainers");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await upload(file);
    if (url) setForm((f) => ({ ...f, avatarUrl: url }));
    e.target.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/trainer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: form.bio,
          specialty: form.specialty,
          experience: form.experience,
          avatarUrl: form.avatarUrl ?? "",
          phone: form.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Kaydedilemedi"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Profilim</h1>
          <p className="text-body text-sm mt-0.5">
            Burada yazdıkların herkese açık eğitmen sayfanda görünür.
          </p>
        </div>
        <Link
          href={`/egitmenler/${trainerId}`}
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-neon hover:underline"
        >
          Sayfamı gör <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <form onSubmit={handleSave} className="card-surface p-6 rounded-xl space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-subtle grid place-items-center shrink-0">
            {form.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-neon">{initials(form.name)}</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-secondary btn-sm gap-1.5"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              Fotoğraf Değiştir
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            <p className="text-xs text-faint mt-1.5">Kare, yüzünün net göründüğü bir fotoğraf en iyisi.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-body mb-1.5">Uzmanlık</label>
            <input
              className="input-base"
              placeholder="Örn: Fonksiyonel Antrenman"
              value={form.specialty}
              onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-body mb-1.5">Deneyim (yıl)</label>
            <input
              type="number" min={0} max={60}
              className="input-base"
              value={form.experience}
              onChange={(e) => setForm((f) => ({ ...f, experience: Number(e.target.value) }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-body mb-1.5">Telefon</label>
          <input
            className="input-base"
            placeholder="05xx xxx xx xx"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs text-body mb-1.5">Hakkımda</label>
          <textarea
            rows={5}
            className="input-base resize-none"
            placeholder="Kendini, yaklaşımını ve neler yaptırdığını anlat — üyeler seni buradan tanıyacak."
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
          />
        </div>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="btn-primary btn-md">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Kaydedildi
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
