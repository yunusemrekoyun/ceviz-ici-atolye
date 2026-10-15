import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { Filter, ShieldAlert } from "lucide-react";

export const metadata = { title: "İşlem Kayıtları" };

const ENTITY_LABEL: Record<string, string> = {
  member: "Üye",
  payment: "Ödeme",
  plan: "Plan",
  trainer: "Eğitmen",
  branch: "Şube",
  settings: "Ayarlar",
  notification: "Bildirim",
  user: "Hesap",
  freeze: "Dondurma",
};

const TAKE = 50;

function actionColor(action: string) {
  if (action.includes("delete") || action.includes("deactivate")) return "text-rose-400 bg-rose-500/10";
  if (action.includes("create") || action.includes("activate")) return "text-emerald-400 bg-emerald-500/10";
  return "text-accent-cyan bg-accent-cyan/10";
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const skip = (page - 1) * TAKE;

  const where = {
    ...(sp.entity ? { entity: sp.entity } : {}),
    ...(sp.action ? { action: { contains: sp.action } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: TAKE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / TAKE));
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (sp.entity) params.set("entity", sp.entity);
    if (sp.action) params.set("action", sp.action);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div>
      <PageHeader title="İşlem Kayıtları" subtitle={`${total} kayıt · yönetim işlemlerinin denetim günlüğü`} />

      <form className="card-surface p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-body mb-1.5">Kayıt türü</label>
          <select name="entity" defaultValue={sp.entity ?? ""} className="input">
            <option value="">Tümü</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-body mb-1.5">İşlem içerir</label>
          <input name="action" defaultValue={sp.action ?? ""} placeholder="örn. delete" className="input" />
        </div>
        <button className="btn-secondary btn-md"><Filter className="w-4 h-4" />Filtrele</button>
      </form>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-label border-b border-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Zaman</th>
                <th className="px-4 py-3 font-medium">Kim</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
                <th className="px-4 py-3 font-medium">Hedef</th>
                <th className="px-4 py-3 font-medium">Detay</th>
                <th className="px-4 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
              {items.map((log) => (
                <tr key={log.id} className="border-b border-subtle/60 last:border-0 align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-dim">
                    {new Date(log.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="font-medium">{log.user?.name ?? "—"}</div>
                    <div className="text-xs text-muted">{log.user?.role ?? ""}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-1 rounded-lg font-medium ${actionColor(log.action)}`}>{log.action}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-dim">
                    {log.entity ? (ENTITY_LABEL[log.entity] ?? log.entity) : "—"}
                    {log.entityId && <span className="text-faint text-xs block">{log.entityId.slice(0, 10)}…</span>}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {log.meta ? (
                      <code className="text-xs text-muted break-all">{JSON.stringify(log.meta)}</code>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted text-xs">{log.ip ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted">Sayfa {page} / {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`/admin/kayitlar${qs(page - 1)}`} className="btn-secondary btn-sm">Önceki</Link>}
            {page < totalPages && <Link href={`/admin/kayitlar${qs(page + 1)}`} className="btn-secondary btn-sm">Sonraki</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
