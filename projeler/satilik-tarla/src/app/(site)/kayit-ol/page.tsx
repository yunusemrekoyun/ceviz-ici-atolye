import type { Metadata } from 'next';
import { AuthCard } from '@/components/auth/auth-card';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = {
  title: 'Kayıt Ol',
};

export default function Page() {
  return (
    <AuthCard
      eyebrow="Üyelik"
      title="Ücretsiz Hesap Oluşturun"
      subtitle="İlan verin, favorilerinizi kaydedin, satıcılarla doğrudan mesajlaşın."
    >
      <SignUpForm />
    </AuthCard>
  );
}
