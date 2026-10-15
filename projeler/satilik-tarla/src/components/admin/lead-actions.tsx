'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteLead, setLeadStatus } from '@/app/admin/talepler/actions';
import { cn } from '@/lib/utils';

const STATUS_STEPS: { value: string; label: string }[] = [
  { value: 'yeni', label: 'Yeni' },
  { value: 'okundu', label: 'Okundu' },
  { value: 'donuldu', label: 'Dönüldü' },
];

export function LeadActions({ leadId, status }: { leadId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setError(result.ok ? null : (result.error ?? 'İşlem başarısız.'));
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-full border border-[#D9E3D5] p-0.5">
        {STATUS_STEPS.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={pending || s.value === status}
            onClick={() => mutate(() => setLeadStatus(leadId, s.value))}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition-colors',
              s.value === status
                ? 'bg-[#3d5638] text-[#FAF7EF]'
                : 'text-[#2d3a2a] hover:bg-[#1f2a1d]/5',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm('Bu talebi silmek istediğinize emin misiniz?')) return;
          mutate(() => deleteLead(leadId));
        }}
        aria-label="Talebi sil"
        className="grid h-8 w-8 place-items-center rounded-full border border-red-200 text-red-600 hover:bg-red-50"
      >
        <Trash2 size={14} />
      </button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
