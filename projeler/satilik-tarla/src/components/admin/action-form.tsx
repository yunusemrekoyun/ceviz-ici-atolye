'use client';

import { useActionState, useEffect, useState, type ReactNode } from 'react';
import { CircleCheck } from 'lucide-react';
import { SubmitButton } from './ui';
import type { ActionResult } from '@/lib/action-result';

/** İçerik kartları için ortak form kabuğu: server action + "Kaydedildi ✓"
 * geri bildirimi + hata satırı. Alanlar server'dan children olarak gelir. */
export function ActionForm({
  action,
  children,
  submitLabel = 'Kaydet',
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  children: ReactNode;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {
    ok: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!state.ok) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aksiyon sonucuna tepki; söndürme zamanlayıcısı zaten effect gerektiriyor
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [state]);

  const firstFieldError = state.fieldErrors
    ? Object.values(state.fieldErrors).find((v) => v?.length)?.[0]
    : undefined;

  return (
    <form action={formAction}>
      {children}
      <div className="mt-4 flex items-center gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-[#3d5638]">
            <CircleCheck size={15} />
            Kaydedildi
          </span>
        ) : null}
        {!state.ok && (state.error || firstFieldError) ? (
          <span className="text-sm text-red-600">{state.error ?? firstFieldError}</span>
        ) : null}
      </div>
    </form>
  );
}
