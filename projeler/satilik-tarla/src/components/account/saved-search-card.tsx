'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Trash2 } from 'lucide-react';
import { deleteSavedSearch } from '@/app/(site)/hesap/aramalarim/actions';
import { Button } from '@/components/ui/button';

export function SavedSearchCard({
  id,
  name,
  query,
  chips,
  createdAt,
}: {
  id: string;
  name: string;
  query: string;
  chips: string[];
  createdAt: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <article className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-soft-sm">
      <div className="min-w-0 flex-1">
        <h3 className="font-heading text-[16px] font-semibold text-foreground">{name}</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-sm bg-secondary px-2.5 py-1 text-[12px] font-semibold text-secondary-foreground"
            >
              {c}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {createdAt} tarihinden beri · yeni eşleşmelerde her sabah e-posta
        </p>
        {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={query}>
            Sonuçları Gör
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <button
          type="button"
          aria-label="Kayıtlı aramayı sil"
          disabled={pending}
          onClick={() => {
            if (!confirm('Bu kayıtlı aramayı silmek istediğinize emin misiniz?')) return;
            startTransition(async () => {
              const result = await deleteSavedSearch(id);
              setError(result.ok ? null : (result.error ?? 'Silinemedi.'));
              if (result.ok) router.refresh();
            });
          }}
          className="grid h-9 w-9 place-items-center rounded-md border border-destructive/30 text-destructive transition-colors hover:bg-destructive/5"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
