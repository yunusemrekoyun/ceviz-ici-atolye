import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { getPayment, periodsForPayment } from "@/lib/billing";
import { dayLabel, formatMoney, PAYMENT_METHOD_LABELS, periodRangeLabel, type PaymentMethod, SESSIONS_PER_PACK } from "@/lib/billing-shared";
import { BRAND_NAME } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";
import { getSetting } from "@/lib/settings";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { parseIdParam } from "@/lib/api";
import { PrintButton } from "../../../qr-afis/PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Makbuz" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("aidat.gor");
  const id = parseIdParam((await params).id);
  const payment = id ? getPayment(id) : null;
  if (!payment) notFound();
  const periods = periodsForPayment(payment.id);
  const collector = payment.createdBy ? getDb().select({ name: users.fullName, username: users.username }).from(users).where(eq(users.id, payment.createdBy)).get() : null;
  const first = periods[0];
  const last = periods.at(-1);
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <article className="relative overflow-hidden rounded-2xl border-2 border-ink bg-white p-6 text-ink sm:p-8">
        {payment.voidedAt ? (
          <p className="absolute right-4 top-4 rotate-6 rounded-lg border-4 border-red-600 px-3 py-1 text-2xl font-black text-red-600">İPTAL</p>
        ) : null}
        <header className="border-b-2 border-ink pb-4">
          <p className="text-lg font-black uppercase tracking-wide">{BRAND_NAME}</p>
          <p className="mt-1 text-sm">Aidat Ödeme Makbuzu · Tel {formatPhone(getSetting("contactPhone"))}</p>
        </header>
        <dl className="mt-5 grid grid-cols-[140px_1fr] gap-y-2.5 text-[15px]">
          <dt className="font-semibold text-muted">Makbuz no</dt>
          <dd className="font-mono font-bold">{payment.receiptNo}</dd>
          <dt className="font-semibold text-muted">Tarih</dt>
          <dd>{dayLabel(payment.paidOn)}</dd>
          <dt className="font-semibold text-muted">Öğrenci</dt>
          <dd className="font-semibold">
            {payment.studentFullName}
            {payment.studentNo ? ` (No ${payment.studentNo})` : ""}
          </dd>
          <dt className="font-semibold text-muted">Kapsam</dt>
          <dd>
            {payment.periodCount * SESSIONS_PER_PACK} antrenman hakkı
            {first && last ? ` · ${periodRangeLabel(first.startDate, last.endDate)}` : ""}
          </dd>
          <dt className="font-semibold text-muted">Ödeme şekli</dt>
          <dd>{PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method}</dd>
          <dt className="font-semibold text-muted">Tahsil eden</dt>
          <dd>{collector?.name ?? collector?.username ?? "—"}</dd>
          {payment.voidedAt ? (
            <>
              <dt className="font-semibold text-red-700">İptal gerekçesi</dt>
              <dd className="text-red-700">{payment.voidReason}</dd>
            </>
          ) : null}
        </dl>
        <p className="mt-6 flex items-baseline justify-between border-t-2 border-ink pt-4">
          <span className="text-sm font-semibold uppercase tracking-wide">Tutar</span>
          <span className="text-3xl font-black">{formatMoney(payment.amountKurus)}</span>
        </p>
        <p className="mt-6 text-xs text-muted">Bu belge bilgilendirme amaçlıdır; fatura yerine geçmez.</p>
      </article>
    </main>
  );
}
