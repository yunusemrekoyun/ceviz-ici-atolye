import { Suspense } from 'react';
import { ResetPasswordScreen } from '@/components/auth/ResetPasswordScreen';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordScreen />
    </Suspense>
  );
}
