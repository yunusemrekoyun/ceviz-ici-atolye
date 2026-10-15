import { RoleDashboard } from '@/components/auth/RoleDashboard';
import { requireRole } from '@/lib/auth/server';

export default async function MuhasebePage() {
  const context = await requireRole('muhasebe');

  return <RoleDashboard user={context.user} authSource={context.source} />;
}
