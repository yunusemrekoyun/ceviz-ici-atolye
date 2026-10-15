import { RoleDashboard } from '@/components/auth/RoleDashboard';
import { requireRole } from '@/lib/auth/server';

export default async function MusteriPage() {
  const context = await requireRole('musteri');

  return <RoleDashboard user={context.user} authSource={context.source} />;
}
