import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import { jobRuns } from "@/lib/db/schema";
import { isMailConfigured, listMailLog } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  await requireAdmin("ayar.yonet");
  const s = getSettings();
  const lastJob = getDb().select().from(jobRuns).orderBy(desc(jobRuns.startedAt)).limit(1).get() ?? null;
  const mails = listMailLog(5);
  return (
    <main className="panel-rise mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Ayarlar</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Aidat, hatırlatma ve genel okul ayarları. Değişiklikler işlem geçmişine yazılır.</p>
      <SettingsForm
        initial={{
          fee: s.feeAmountKurus ? String(s.feeAmountKurus / 100).replace(".", ",") : "",
          graceDays: String(s.graceDays),
          reminderDaysBefore: String(s.reminderDaysBefore),
          absenceAlertCount: String(s.absenceAlertCount),
          contactPhone: s.contactPhone,
          cardAttendance: s.cardAttendance,
          evaluationCriteria: s.evaluationCriteria,
        }}
      />
      <section className="mt-6 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-[15px] font-semibold text-ink">Sistem durumu</h2>
        <dl className="mt-3 grid gap-2 text-[15px] sm:grid-cols-[200px_1fr]">
          <dt className="font-semibold text-muted">E-posta gönderimi</dt>
          <dd className="text-ink">{isMailConfigured() ? "Ayarlı" : "Ayarlı değil (şifre sıfırlama e-postası gönderilemez; sıfırlama yönetici üzerinden yapılır)"}</dd>
          <dt className="font-semibold text-muted">Günlük otomatik iş</dt>
          <dd className="text-ink">{lastJob ? `${lastJob.runKey} · ${lastJob.status === "ok" ? "başarılı" : lastJob.status === "failed" ? "hata" : "çalışıyor"}${lastJob.detail ? ` · ${lastJob.detail}` : ""}` : "Henüz çalışmadı"}</dd>
          {mails.length ? (
            <>
              <dt className="font-semibold text-muted">Son e-postalar</dt>
              <dd className="text-sm text-ink">
                {mails.map((m) => (
                  <span key={m.id} className="block">
                    {m.createdAt.slice(0, 16).replace("T", " ")} · {m.subject} · {m.status === "sent" ? "gönderildi" : m.status === "skipped" ? "atlandı" : "hata"}
                  </span>
                ))}
              </dd>
            </>
          ) : null}
        </dl>
      </section>
    </main>
  );
}
