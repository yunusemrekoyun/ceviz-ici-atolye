import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { MesajlasmalarClient } from "@/components/admin/MesajlasmalarClient";

export const metadata = { title: "Yazışmalar" };

export default async function MesajlasmalarPage() {
  await requireAdmin();
  return (
    <div>
      <PageHeader
        title="Yazışmalar"
        subtitle="Eğitmen ve üye arasındaki mesajlar (yalnızca görüntüleme)"
      />
      <MesajlasmalarClient />
    </div>
  );
}
