import { requireAdmin } from "@/lib/auth";
import { readSystemSettings } from "@/lib/settings";
import { PageHeader } from "@/components/admin/PageHeader";
import { SystemSettingsClient } from "@/components/admin/SystemSettingsClient";

export default async function SettingsPage() {
  await requireAdmin();

  // Admin kendi değiştirdiği ayarı anında görmeli — cache'li sürüm değil.
  const settingMap = await readSystemSettings();

  return (
    <div>
      <PageHeader
        title="Sistem Ayarları"
        subtitle="Özellik toggle'ları ve sistem yapılandırması"
      />
      <SystemSettingsClient initialSettings={settingMap} />
    </div>
  );
}
