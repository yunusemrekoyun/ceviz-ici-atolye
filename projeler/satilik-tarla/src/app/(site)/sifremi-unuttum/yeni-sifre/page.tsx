import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Yeni Şifre Belirle',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <AuthCard eyebrow="Şifre Sıfırlama" title="Yeni Şifre Belirleyin">
      <ResetPasswordForm token={token} tokenError={error} />
    </AuthCard>
  );
}
