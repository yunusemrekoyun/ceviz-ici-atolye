import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { SignInForm } from '@/components/auth/sign-in-form';

export const metadata: Metadata = {
  title: 'Giriş Yap',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ callbackURL?: string; reset?: string }>;
}) {
  const { callbackURL, reset } = await searchParams;

  return (
    <AuthCard
      eyebrow="Üye Girişi"
      title="Hesabınıza Giriş Yapın"
      subtitle={
        reset === '1'
          ? 'Şifreniz güncellendi, yeni şifrenizle giriş yapabilirsiniz.'
          : 'İlanlarınızı takip edin, mesajlarınıza ulaşın.'
      }
    >
      <SignInForm callbackURL={callbackURL} />
    </AuthCard>
  );
}
