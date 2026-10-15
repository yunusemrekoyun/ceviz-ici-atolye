'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Lock, Mail, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { authErrorMessage } from '@/lib/auth-errors';
import { fieldLabelClass } from './auth-card';

export function SignUpForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    await authClient.signUp.email(
      { name, email, password, callbackURL: '/hesap' },
      {
        onError: (ctx) => {
          setError(authErrorMessage(ctx.error.code));
          setLoading(false);
        },
        onSuccess: () => {
          setSent(true);
          setLoading(false);
        },
      },
    );
  }

  if (sent) {
    return (
      <p className="text-[15px] leading-relaxed text-foreground">
        <strong className="font-semibold">E-postanızı kontrol edin.</strong>{' '}
        <span className="text-muted-foreground">
          {email} adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıklayınca hesabınız
          aktifleşecek.
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className={fieldLabelClass()}>
          Ad Soyad
        </Label>
        <div className="relative">
          <User
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="h-12 bg-white pl-10"
          />
        </div>
      </div>
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
        <Label htmlFor="password" className={fieldLabelClass()}>
          Şifre
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
        {loading ? 'Kaydediliyor…' : 'Kayıt Ol'}
      </Button>
      <p className="text-center text-[14px] text-muted-foreground">
        Zaten hesabınız var mı?{' '}
        <Link href="/giris" className="font-medium text-foreground hover:underline">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
