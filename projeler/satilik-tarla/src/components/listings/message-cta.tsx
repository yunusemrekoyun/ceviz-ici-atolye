'use client';

import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { startConversation } from '@/app/(site)/hesap/mesajlar/actions';
import { Button } from '@/components/ui/button';

/** İlan detayındaki "Mesaj Gönder" — misafir /giris'e yönlenir, sahibiyse
 * hata gösterilir, yoksa sohbete gidilir (birincil iletişim kanalı). */
export function MessageCta({
  slug,
  variant = 'brass',
  className,
}: {
  slug: string;
  variant?: 'brass' | 'outlineOnDark' | 'outline';
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="lg"
        disabled={pending}
        className={className}
        onClick={() =>
          startTransition(async () => {
            const result = await startConversation(slug);
            // redirect fırlatırsa buraya dönülmez; dönen sonuç hatadır
            if (result && !result.ok) setError(result.error ?? 'İşlem başarısız.');
          })
        }
      >
        <Mail className="size-5" />
        {pending ? 'Açılıyor…' : 'Mesaj Gönder'}
      </Button>
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </>
  );
}
