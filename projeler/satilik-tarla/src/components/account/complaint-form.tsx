'use client';

import { useActionState, useState } from 'react';
import { CircleCheck, ImagePlus, Loader2, X } from 'lucide-react';
import { submitComplaint } from '@/app/(site)/hesap/mesajlar/complaint-actions';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/action-result';

/** Şikayet formu: gerekçe + en çok 3 ekran görüntüsü. Admin yazışmayı
 * göremediği için kanıt bu görüntülerdir. */
export function ComplaintForm({
  conversationId,
  onDone,
}: {
  conversationId: string;
  onDone?: () => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [reason, setReason] = useState('');
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      const result = await submitComplaint(conversationId, prev, formData);
      if (result.ok) {
        setSent(true);
        setTimeout(() => onDone?.(), 2500);
      }
      return result;
    },
    { ok: false },
  );

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    setUploading(true);
    for (const file of Array.from(files).slice(0, 3 - images.length)) {
      try {
        const res = await fetch(
          `/api/hesap/sikayet-gorsel?filename=${encodeURIComponent(file.name)}`,
          { method: 'POST', body: file },
        );
        const data = await res.json().catch(() => null);
        if (res.ok && data?.url) {
          setImages((prev) => [...prev, data.url]);
        } else {
          setUploadError(data?.error ?? 'Yükleme başarısız.');
          break;
        }
      } catch {
        setUploadError('Bağlantı hatası — tekrar deneyin.');
        break;
      }
    }
    setUploading(false);
  }

  if (sent) {
    return (
      <p className="flex items-center gap-2 rounded-md border border-[hsl(150_40%_75%)] bg-[hsl(150_45%_94%)] px-4 py-3 text-sm text-[hsl(154_42%_20%)]">
        <CircleCheck className="h-4 w-4 shrink-0" />
        Şikayetiniz alındı — ekibimiz inceleyip gerekirse sizinle iletişime geçecek.
      </p>
    );
  }

  return (
    <form action={formAction} className="rounded-md border border-border bg-muted/60 p-4">
      <input type="hidden" name="images" value={JSON.stringify(images)} />
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Şikayet gerekçesi
        </span>
        <textarea
          name="reason"
          rows={3}
          required
          maxLength={3000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Neyi şikayet ediyorsunuz? Gizliliğiniz için yazışmayı ekip göremez — gerekirse ekran görüntüsü ekleyin."
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-[14px] text-foreground outline-none focus:border-primary"
        />
      </label>
      {!state.ok && state.fieldErrors?.reason ? (
        <p className="mt-1 text-sm text-destructive">{state.fieldErrors.reason[0]}</p>
      ) : null}
      {!state.ok && state.error ? (
        <p className="mt-1 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {images.map((url) => (
          <span key={url} className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-14 w-14 rounded-md border border-border object-cover"
            />
            <button
              type="button"
              aria-label="Görüntüyü kaldır"
              onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-destructive text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {images.length < 3 ? (
          <label className="inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-white text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              multiple
              hidden
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
        ) : null}
        <span className="text-[12px] text-muted-foreground">Ekran görüntüsü (en çok 3 · 5 MB)</span>
      </div>
      {uploadError ? <p className="mt-1 text-sm text-destructive">{uploadError}</p> : null}

      <Button
        type="submit"
        variant="brass"
        size="sm"
        disabled={pending || uploading}
        className="mt-3"
      >
        {pending ? 'Gönderiliyor…' : 'Şikayeti Gönder'}
      </Button>
    </form>
  );
}
