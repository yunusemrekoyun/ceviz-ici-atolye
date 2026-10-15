'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ShieldCheck } from 'lucide-react';
import { banMember, unbanMember } from '@/app/admin/uyeler/actions';
import { dangerBtn, outlineBtn } from './ui';

export function MemberActions({
  userId,
  banned,
  isAdmin,
}: {
  userId: string;
  banned: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isAdmin) return null;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      setError(result.ok ? null : (result.error ?? 'İşlem başarısız.'));
      if (result.ok) router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      {banned ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => unbanMember(userId))}
          className={outlineBtn}
        >
          <ShieldCheck size={15} />
          Engeli Kaldır
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const reason = prompt('Engelleme nedeni (üyeye gösterilmez, kayıt için):') ?? '';
            if (reason === '' && !confirm('Neden belirtmeden engellensin mi?')) return;
            run(() => banMember(userId, reason));
          }}
          className={dangerBtn}
        >
          <Ban size={15} />
          Engelle
        </button>
      )}
      {error ? <span className="text-sm text-red-600">{error}</span> : null}
    </span>
  );
}
