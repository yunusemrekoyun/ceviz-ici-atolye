import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/get-session';

export default async function HesapLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/giris?callbackURL=/hesap');
  }
  return <>{children}</>;
}
