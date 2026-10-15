import { RoleDashboard } from '@/components/auth/RoleDashboard';
import { requireRole } from '@/lib/auth/server';

export default async function AdminPage() {
  const context = await requireRole('admin');

  return <RoleDashboard user={context.user} authSource={context.source} />;
}
