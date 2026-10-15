'use client';

import { FormEvent, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, CheckCircle2, KeyRound, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import type { AuthUser } from '@/lib/auth/session';
import { useLanguage } from '../../i18n/LanguageContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser, redirectTo: string) => void;
}

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, language } = useLanguage();
  const tr = language === 'tr';

  const handleClose = () => {
    setMode('login');
    setError('');
    setResetSent(false);
    onClose();
  };

  const openForgot = () => {
    setMode('forgot');
    setError('');
    setResetSent(false);
    setResetEmail(email);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || 'Login failed.');
      }

      onSuccess(payload.user, payload.redirectTo);
      setEmail('');
      setPassword('');
      setMode('login');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setResetSent(false);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || (tr ? 'Şifre sıfırlama e-postası gönderilemedi.' : 'Password reset email could not be sent.'));
      }

      setResetSent(true);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : (tr ? 'Şifre sıfırlama e-postası gönderilemedi.' : 'Password reset email could not be sent.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.form
            onSubmit={mode === 'login' ? handleSubmit : handleResetRequest}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-md overflow-x-hidden overflow-y-auto modal-shell select-none"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-m-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-brand-accent h-5 w-5" />
                <h3 className="text-lg font-medium tracking-tight">{t('login.title')}</h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="btn-icon p-1 hover:bg-m-hover"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {mode === 'login' ? (
                <>
                  <div className="space-y-1.5">
                    <span className="label-sm">{t('login.email')}</span>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="admin@gmail.com"
                        className="input-base text-sm pl-9 pr-3 py-3"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="label-sm">{t('login.password')}</span>
                      <button
                        type="button"
                        onClick={openForgot}
                        className="text-[11px] text-brand-accent/70 hover:text-brand-accent transition-colors"
                      >
                        {tr ? 'Şifremi unuttum' : 'Forgot password'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
                      <input
                        type="password"
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="yunus123"
                        className="input-base text-sm pl-9 pr-3 py-3"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setResetSent(false);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-main transition-colors"
                  >
                    <ArrowLeft size={13} />
                    {tr ? 'Giriş ekranına dön' : 'Back to login'}
                  </button>

                  <div className="surface-card p-4 space-y-2">
                    <div className="flex items-center gap-2 text-main">
                      <KeyRound size={15} className="text-brand-accent" />
                      <p className="text-sm font-semibold">{tr ? 'Şifrenizi yenileyelim' : 'Reset your password'}</p>
                    </div>
                    <p className="text-xs leading-relaxed text-muted">
                      {tr
                        ? 'Kayıtlı e-posta adresinize tek kullanımlık güvenli bir bağlantı göndereceğiz.'
                        : 'We will send a one-time secure link to your registered email address.'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="label-sm">{t('login.email')}</span>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle" size={15} />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={resetEmail}
                        onChange={(event) => {
                          setResetEmail(event.target.value);
                          setResetSent(false);
                        }}
                        placeholder="mail@gmail.com"
                        className="input-base text-sm pl-9 pr-3 py-3"
                      />
                    </div>
                  </div>

                  {resetSent && (
                    <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100 flex gap-2">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                      <span>
                        {tr
                          ? 'Bu e-posta sistemde kayıtlıysa şifre sıfırlama bağlantısı gönderildi.'
                          : 'If this email is registered, a password reset link has been sent.'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full py-3.5 rounded-xl text-center text-xs disabled:opacity-60"
              >
                {isSubmitting
                  ? t('login.submitting')
                  : mode === 'login'
                    ? t('login.submit')
                    : tr ? 'Sıfırlama bağlantısı gönder' : 'Send reset link'}
              </button>
            </div>
          </motion.form>
        </div>
      )}
    </AnimatePresence>
  );
}
