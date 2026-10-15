import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { Filter, Monitor, Smartphone } from "lucide-react";
import { Role } from "@prisma/client";

export const metadata = { title: "Oturumlar" };

const ROLE_LABEL: Record<string, string> = { ADMIN: "Yönetici", STAFF: "Personel", TRAINER: "Eğitmen", MEMBER: "Üye" };

function deviceLabel(ua: string | null) {
  if (!ua) return "Bilinmeyen cihaz";
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let os = "—";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  let browser = "";
  if (/Edg/i.test(ua)) browser = "Edge";
  else if (/Chrome/i.test(ua)) browser = "Chrome";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua)) browser = "Safari";
  return { label: `${os}${browser ? " · " + browser : ""}`, isMobile };
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const role = (sp.role && sp.role in Role ? (sp.role as Role) : undefined);

  const sessions = await prisma.session.findMany({
    where: role ? { user: { role } } : {},
    include: { user: { select: { name: true, email: true, role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const now = new Date();

  return (
    <div>
      <PageHeader title="Oturumlar" subtitle="Son giriş etkinliği ve aktif cihazlar (yalnızca görüntüleme)" />

      <form className="card-surface p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs text-body mb-1.5">Rol</label>
          <select name="role" defaultValue={sp.role ?? ""} className="input">
            <option value="">Tümü</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <button className="btn-secondary btn-md"><Filter className="w-4 h-4" />Filtrele</button>
      </form>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-label border-b border-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Kullanıcı</th>
                <th className="px-4 py-3 font-medium">Cihaz</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">Giriş</th>
                <th className="px-4 py-3 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted">Kayıtlı oturum yok</td></tr>
              )}
              {sessions.map((s) => {
                const dev = deviceLabel(s.userAgent);
                const active = s.expiresAt > now;
                return (
                  <tr key={s.id} className="border-b border-subtle/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.user.name}</div>
                      <div className="text-xs text-muted">{ROLE_LABEL[s.user.role] ?? s.user.role} · {s.user.email}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-dim">
                      <span className="inline-flex items-center gap-1.5">
                        {typeof dev === "object" && dev.isMobile ? <Smartphone className="w-3.5 h-3.5 text-faint" /> : <Monitor className="w-3.5 h-3.5 text-faint" />}
                        {typeof dev === "object" ? dev.label : dev}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted text-xs">{s.ip ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-dim">
                      {new Date(s.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs px-2 py-1 rounded-lg ${active ? "bg-emerald-500/10 text-emerald-400" : "bg-subtle text-muted"}`}>
                        {active ? "Aktif" : "Süresi doldu"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
