'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { authErrorMessage } from '@/lib/auth-errors';
import { fieldLabelClass } from './auth-card';

export function ResetPasswordForm({ token, tokenError }: { token?: string; tokenError?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (tokenError || !token) {
    return (
      <p className="text-[15px] leading-relaxed text-foreground">
        <strong className="font-semibold">{authErrorMessage(tokenError ?? 'INVALID_TOKEN')}</strong>{' '}
        <Link href="/sifremi-unuttum" className="font-medium text-brass-strong hover:underline">
          Tekrar isteyin.
        </Link>
      </p>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await authClient.resetPassword(
      { newPassword: password, token },
      {
        onError: (ctx) => {
          setError(authErrorMessage(ctx.error.code));
          setLoading(false);
        },
        onSuccess: () => {
          router.push('/giris?reset=1');
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="password" className={fieldLabelClass()}>
          Yeni Şifre
        </Label>
        <div className="relative">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-12 bg-white pl-10"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" variant="brass" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Kaydediliyor…' : 'Şifreyi Değiştir'}
      </Button>
    </form>
  );
}
