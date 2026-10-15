import { RoleDashboard } from '@/components/auth/RoleDashboard';
import { requireRole } from '@/lib/auth/server';

export default async function TemizlikciPage() {
  const context = await requireRole('temizlikci');

  return <RoleDashboard user={context.user} authSource={context.source} />;
}
