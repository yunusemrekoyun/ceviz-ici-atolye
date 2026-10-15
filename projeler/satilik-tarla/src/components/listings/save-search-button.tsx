'use client';

import { useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { BellPlus, Check } from 'lucide-react';
import { saveSearch } from '@/app/(site)/hesap/aramalarim/actions';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

/** "Bu aramayı kaydet" — yalnız oturumlu kullanıcıda ve en az bir filtre
 * varken görünür; sabah özeti e-postasına abone eder. */
export function SaveSearchButton({ chipLabels }: { chipLabels: string[] }) {
  const searchParams = useSearchParams();
  const { data: session } = authClient.useSession();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<'idle' | 'saved' | string>('idle');

  if (!session?.user || chipLabels.length === 0) return null;

  function handleSave() {
    const params = Object.fromEntries(searchParams.entries());
    const name = chipLabels.join(' · ');
    startTransition(async () => {
      const result = await saveSearch(params, name);
      setState(result.ok ? 'saved' : (result.error ?? 'Kaydedilemedi.'));
      if (result.ok) setTimeout(() => setState('idle'), 3000);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending || state === 'saved'}
        onClick={handleSave}
        className="h-11 lg:h-9"
      >
        {state === 'saved' ? (
          <>
            <Check className="h-4 w-4 text-brass-strong" />
            Kaydedildi
          </>
        ) : (
          <>
            <BellPlus className="h-4 w-4" />
            Aramayı kaydet
          </>
        )}
      </Button>
      {state !== 'idle' && state !== 'saved' ? (
        <span className="text-[13px] text-destructive">{state}</span>
      ) : null}
    </span>
  );
}
