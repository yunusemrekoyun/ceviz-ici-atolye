'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { authErrorMessage } from '@/lib/auth-errors';
import { fieldLabelClass } from './auth-card';

export function SignInForm({ callbackURL }: { callbackURL?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Yalnızca site-içi (göreli) yollar kabul edilir — açık yönlendirme riskine karşı.
  const target = callbackURL && callbackURL.startsWith('/') ? callbackURL : '/hesap';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setResent(false);
    setLoading(true);
    await authClient.signIn.email(
      { email, password },
      {
        onError: (ctx) => {
          setError(authErrorMessage(ctx.error.code));
          setNeedsVerification(ctx.error.code === 'EMAIL_NOT_VERIFIED');
          setLoading(false);
        },
        onSuccess: () => {
          router.push(target);
        },
      },
    );
  }

  async function resend() {
    await authClient.sendVerificationEmail({ email, callbackURL: '/hesap' });
    setResent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email" className={fieldLabelClass()}>
          E-posta
        </Label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-12 bg-white pl-10"
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className={fieldLabelClass()}>
            Şifre
          </Label>
          <Link
            href="/sifremi-unuttum"
            className="mb-2 text-[12px] font-medium text-brass-strong hover:underline"
          >
            Şifremi unuttum
          </Link>
        </div>
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
            autoComplete="current-password"
            className="h-12 bg-white pl-10"
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive">
          {error}
          {needsVerification ? (
            <button
              type="button"
              onClick={resend}
              className="ml-1 font-medium underline underline-offset-2"
            >
              {resent ? 'Gönderildi' : 'Yeniden gönder'}
            </button>
          ) : null}
        </p>
      ) : null}
      <Button type="submit" variant="brass" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </Button>
      <p className="text-center text-[14px] text-muted-foreground">
        Hesabınız yok mu?{' '}
        <Link href="/kayit-ol" className="font-medium text-foreground hover:underline">
          Kayıt olun
        </Link>
      </p>
    </form>
  );
}
