import { RoleDashboard } from '@/components/auth/RoleDashboard';
import { requireRole } from '@/lib/auth/server';

export default async function PersonelPage() {
  const context = await requireRole('personel');

  return <RoleDashboard user={context.user} authSource={context.source} />;
}
