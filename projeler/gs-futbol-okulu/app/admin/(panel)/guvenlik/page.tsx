import type { Metadata } from "next";
import { listLoginEvents } from "@/lib/auth/login-events";
import { can, requireAdmin } from "@/lib/auth/server";
import { listAudit } from "@/lib/audit";
import { listUserSessions } from "@/lib/auth/sessions";
import { formatDateTimeTr } from "@/lib/format";
import { describeUserAgent } from "@/lib/user-agent";
import { SessionList } from "./SessionList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Güvenlik" };

const REASONS: Record<string, string> = { wrong_password: "Hatalı şifre", rate_limited: "Çok fazla deneme" };

export default async function SecurityPage() {
  const admin = await requireAdmin();
  const sessions = listUserSessions(admin.id).map((s) => ({
    id: s.id,
    current: s.id === admin.sessionId,
    device: describeUserAgent(s.userAgent),
    ip: s.ip,
    lastIp: s.lastIp,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
  }));
  const canSee = can(admin, "guvenlik.gor");
  const events = canSee ? listLoginEvents(50) : [];
  const audit = canSee ? listAudit({ limit: 100 }) : [];

  return (
    <main className="panel-rise mx-auto w-full max-w-4xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Güvenlik</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Hesabınızın hangi cihazlarda açık olduğunu ve giriş denemelerini buradan görebilirsiniz. Tanımadığınız bir oturum görürseniz kapatın ve şifrenizi değiştirin.</p>

      <SessionList sessions={sessions} />

      {canSee ? (
        <section className="mt-8">
          <h2 className="mb-3 text-[15px] font-semibold text-ink">İşlem geçmişi</h2>
          {audit.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-muted">Henüz kayıt yok.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              {audit.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm transition hover:bg-surface/70">
                  <span className="font-semibold text-ink">{a.userName}</span>
                  <span className="text-ink">{a.summary}</span>
                  <span className="font-mono text-xs text-muted">{a.action}</span>
                  <span className="ml-auto text-xs text-muted">{formatDateTimeTr(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {canSee ? (
      <section className="mt-8">
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Son giriş denemeleri</h2>
        {events.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-muted">Henüz kayıt yok.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm transition hover:bg-surface/70">
                <span className={["inline-flex rounded-md px-2 py-0.5 text-xs font-bold", e.success ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"].join(" ")}>
                  {e.success ? "Başarılı" : (REASONS[e.reason ?? ""] ?? "Başarısız")}
                </span>
                <span className="font-medium text-ink">{describeUserAgent(e.userAgent)}</span>
                <span className="font-mono text-xs text-muted">{e.ip ?? "IP yok"}</span>
                {!e.success ? <span className="text-xs text-muted">kullanıcı: {e.identifier}</span> : null}
                <span className="ml-auto text-xs text-muted">{formatDateTimeTr(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}

      <p className="mt-6 rounded-2xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">
        IP adresi tarayıcıdan izin gerektirmeden, bağlantının kendisinden okunur. iPhone&apos;da Safari&apos;nin &quot;IP adresini gizle&quot; (iCloud Özel Aktarım) özelliği açıksa burada gerçek adres yerine Apple&apos;ın aktarma adresi görünür; bu durumda cihaz ve tarayıcı bilgisi yine doğrudur. Mobil
        internette IP adresi gün içinde değişebilir, bu normaldir. Kayıtlar 90 gün saklanır.
      </p>
    </main>
  );
}
