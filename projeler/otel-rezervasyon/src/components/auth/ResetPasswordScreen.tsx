'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, Lock, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function ResetPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const passwordsMatch = password.length >= 8 && password === passwordConfirm;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token || !passwordsMatch) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message ?? 'Şifre güncellenemedi.');
      }

      setIsDone(true);
      setMessage(payload.message ?? 'Şifreniz güncellendi.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Şifre güncellenemedi.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main data-mode="dark" className="min-h-dvh panel-root flex items-center justify-center px-4 py-12">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-m-border flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <KeyRound size={20} className="text-brand-accent" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Şifrenizi yenileyin</h1>
            <p className="text-xs text-subtle">Kütahya Garden Otel hesabınız için güvenli bağlantı</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!token && (
            <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-3 text-sm text-red-100 flex gap-2">
              <XCircle size={16} className="mt-0.5 shrink-0" />
              <span>Bağlantı eksik veya geçersiz. Lütfen yeniden şifre sıfırlama e-postası isteyin.</span>
            </div>
          )}

          {isDone ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100 flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{message}</span>
              </div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="btn-primary w-full py-3 rounded-xl text-xs"
              >
                Giriş ekranına dön
              </button>
            </div>
          ) : (
            <>
              <label className="block space-y-1.5">
                <span className="label-sm">Yeni şifre</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-base text-sm pl-9 pr-3 py-3"
                    placeholder="En az 8 karakter"
                    disabled={!token || isSubmitting}
                    required
                  />
                </div>
              </label>

              <label className="block space-y-1.5">
                <span className="label-sm">Yeni şifre tekrar</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    className="input-base text-sm pl-9 pr-3 py-3"
                    placeholder="Yeni şifrenizi tekrar yazın"
                    disabled={!token || isSubmitting}
                    required
                  />
                </div>
              </label>

              {passwordConfirm && password !== passwordConfirm && (
                <p className="text-xs text-red-300">Şifreler eşleşmiyor.</p>
              )}

              {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={!token || !passwordsMatch || isSubmitting}
                className="btn-primary w-full py-3.5 rounded-xl text-center text-xs disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={15} className="mx-auto animate-spin" /> : 'Şifreyi güncelle'}
              </button>
            </>
          )}
        </div>
      </motion.form>
    </main>
  );
}
