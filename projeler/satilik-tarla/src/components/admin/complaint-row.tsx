'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { closeComplaint } from '@/app/admin/sikayetler/actions';
import { primaryBtn } from './ui';

export function CloseComplaintButton({ complaintId }: { complaintId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await closeComplaint(complaintId);
            setError(result.ok ? null : (result.error ?? 'İşlem başarısız.'));
            if (result.ok) router.refresh();
          })
        }
        className={primaryBtn}
      >
        <Check size={15} />
        Kapat
      </button>
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </span>
  );
}
