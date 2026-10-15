import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { RequestResetForm } from '@/components/auth/request-reset-form';

export const metadata: Metadata = {
  title: 'Şifremi Unuttum',
};

export default function Page() {
  return (
    <AuthCard
      eyebrow="Şifre Sıfırlama"
      title="Şifrenizi mi unuttunuz?"
      subtitle="E-posta adresinizi girin, sıfırlama bağlantısını gönderelim."
    >
      <RequestResetForm />
    </AuthCard>
  );
}
