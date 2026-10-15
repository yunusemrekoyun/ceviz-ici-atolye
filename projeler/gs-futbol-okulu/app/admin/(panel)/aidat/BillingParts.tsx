"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, MessageCircle, Printer, Receipt } from "lucide-react";
import { DatePicker } from "@/components/Calendar";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input } from "@/components/ui";
import type { ActionResult } from "@/lib/admin-action";
import { dayLabel, dayLabelAt, formatMoney, PAY_STATUS, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, payStatus, periodRangeLabel, PROMISE_DEFAULT, SESSIONS_PER_PACK, type Access, type PaymentMethod } from "@/lib/billing-shared";
import type { PaymentPlans } from "@/lib/billing";
import { addDaysTo, parseDay } from "@/lib/dates";
import { paymentReminderMessage, promiseReminderMessage, receiptMessage, whatsappLink } from "@/lib/whatsapp";
import {
  createOverrideAction,
  getStudentBillingAction,
  paymentPlanAction,
  recordPaymentAction,
  revokeOverrideAction,
  setDiscountAction,
  updatePaymentAction,
  voidPaymentAction,
  voidPeriodAction,
  type PaymentFormValues,
  type RecordedPayment,
  type StudentBilling,
} from "./actions";
import { updateKitPaymentAction } from "../malzeme/actions";

/** Ödeme alınacak öğrencinin gereken kadarı. */
export type PayTarget = { id: number; name: string; parentName: string; phone: string; feeKurus: number; access: Access };

/** "Bugün" / "Yarın" / "30 Eylül'de" */
export function promiseDayText(day: string, today: string): string {
  return day === today ? "bugün" : day === addDaysTo(today, 1) ? "yarın" : dayLabelAt(day);
}

export function accessLine(a: Access, today: string): string {
  const money = formatMoney(a.amountDueKurus);
  const missed = a.promiseMissed ? `${dayLabelAt(a.promiseMissed)} ödeyecekti, gelmedi · ` : "";
  switch (a.state) {
    case "paid":
      return a.paidUntil ? `Sonraki ödeme ${dayLabel(a.paidUntil, false)}${a.sessionsLeft !== undefined && a.sessionsLeft !== null ? ` · ${a.sessionsLeft} antrenman kaldı` : ""}` : "Hakkı var";
    case "grace": {
      const due = a.dueDate ?? today;
      const head = a.firstPack ? (due > today ? `Aidatı gelince hak başlar · ilk antrenman ${dayLabel(due, false)}` : `İlk aidat bekleniyor · ilk antrenman ${dayLabel(due, false)}`) : `Ödeme günü ${dayLabel(due, false)}`;
      return `${missed || `${head} · `}son gün ${dayLabel(a.lastDay ?? today, false)}${a.daysLeft !== null && due <= today ? ` (${a.daysLeft === 1 ? "bugün" : `${a.daysLeft} gün`})` : ""} · ${money}`;
    }
    case "locked":
      return `${missed || `${a.firstPack ? `Aidat gelmedi · ilk antrenman ${dayLabel(a.dueDate ?? today, false)}` : `Ödeme günü ${dayLabel(a.dueDate ?? today, false)} geçti`} · `}${a.unpaidCount > 1 ? `${a.unpaidCount} aidat · ` : ""}${money}`;
    case "override": {
      const o = a.override;
      const when = promiseDayText(o?.endsOn ?? today, today);
      return `${when.charAt(0).toLocaleUpperCase("tr-TR")}${when.slice(1)} ödeyecek · ${money}${o?.reason && o.reason !== PROMISE_DEFAULT ? ` · ${o.reason}` : ""}`;
    }
    case "unbilled":
      return "Aidat tutarı girilmedi";
    default:
      return "";
  }
}

/** Ödeme dilinde durum rozeti (yönetim ekranları): Ödedi · Ödemesi yaklaşıyor · Ödeme günü geldi · Gecikti … */
export function PayPill({ access, today }: { access: Pick<Access, "state" | "firstPack" | "paidUntil">; today: string }) {
  const st = PAY_STATUS[payStatus(access, today)];
  return <span className={`inline-flex whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold ${st.badge}`}>{st.label}</span>;
}

/** Hatırlatma bağlantısı: yalnız borç varsa. Ödeme sözü verende söz verdiği gün hatırlatılır. */
export function reminderHref(t: Pick<PayTarget, "phone" | "parentName" | "name" | "access">, today: string): string | null {
  const a = t.access;
  if (!t.phone || (a.state !== "grace" && a.state !== "locked" && a.state !== "override")) return null;
  if (a.state === "override" && a.override) return whatsappLink(t.phone, promiseReminderMessage(t.parentName, t.name, formatMoney(a.amountDueKurus), promiseDayText(a.override.endsOn, today)));
  return whatsappLink(t.phone, paymentReminderMessage(t.parentName, t.name, formatMoney(a.amountDueKurus), dayLabel(a.lastDay ?? today, false), a.state !== "grace"));
}

/* ---------------- Ödeme al ---------------- */

/**
 * Aidat al: özetle başlar (kaç antrenman, hangi tarihler), sık değişenler tek dokunuş (8/16/24, Bugün/Dün),
 * seyrek olanlar katlı (daha uzun paket, not). Alt düğmeler ödeme şeklidir: [Havale ile al] [Nakit al · tutar];
 * Enter nakit alır. Başarıda "Kapat" odaklı gelir, Enter ile sıradaki öğrenciye geçilir.
 */
export function PaymentDialog({ student, today, onClose, onDone }: { student: PayTarget; today: string; onClose: () => void; onDone?: () => void }) {
  const feeKurus = student.feeKurus;
  const [values, setValues] = useState<PaymentFormValues>({ periodCount: "1", method: "cash", paidOn: today, note: "" });
  const [result, setResult] = useState<(ActionResult & { payment?: RecordedPayment }) | null>(null);
  const [plans, setPlans] = useState<{ key: string; plans: PaymentPlans | null } | null>(null);
  const [startChoice, setStartChoice] = useState<"chain" | "restart" | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const count = Number(values.periodCount) || 1;
  const done = result?.ok ? result.payment : undefined;

  // Önizleme: bu ödeme hangi antrenmandan başlar, yenileme ne zaman (ödeme sayısı ve tarihine göre).
  const planKey = `${count}|${values.paidOn}`;
  useEffect(() => {
    let alive = true;
    paymentPlanAction(student.id, count, values.paidOn).then((p) => alive && setPlans({ key: `${count}|${values.paidOn}`, plans: p }));
    return () => {
      alive = false;
    };
  }, [student.id, count, values.paidOn]);
  const current = plans?.key === planKey ? plans.plans : null;
  const both = Boolean(current?.chain && current?.restart);
  const start = current?.restart && (both ? (startChoice ?? current.suggested) : "restart") === "restart" ? "restart" : "chain";
  const plan = current ? (start === "restart" ? current.restart : current.chain) : null;

  const submit = (method: PaymentMethod) =>
    startTransition(async () => {
      const res = await recordPaymentAction(student.id, { ...values, method, start });
      setResult(res);
      if (res.ok) {
        router.refresh();
        onDone?.();
      }
    });

  if (done) {
    return (
      <Modal
        open
        title="Ödeme alındı"
        onClose={onClose}
        footer={
          <Button type="button" size="md" onClick={onClose} autoFocus>
            Kapat
          </Button>
        }
      >
        <div className="grid gap-4 text-[15px] text-ink">
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-900 ring-1 ring-inset ring-emerald-600/15">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white" aria-hidden="true">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <span className="min-w-0">
              <span className="block text-2xl font-bold tabular-nums">{formatMoney(done.amountKurus)}</span>
              <span className="block text-sm">
                {student.name} · {done.periodLabel}
              </span>
            </span>
          </div>
          <p className="text-sm text-muted">
            Makbuz no <span className="font-semibold tabular-nums text-ink">{done.receiptNo}</span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <a href={`/admin/aidat/makbuz/${done.id}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-control px-4 font-semibold hover:bg-gray-50">
              <Printer className="h-4 w-4" aria-hidden="true" /> Makbuzu yazdır
            </a>
            {student.phone ? (
              <a
                href={whatsappLink(student.phone, receiptMessage(student.parentName, student.name, formatMoney(done.amountKurus), done.receiptNo, done.periodLabel))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold text-white hover:bg-emerald-800"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp ile gönder
              </a>
            ) : null}
          </div>
        </div>
      </Modal>
    );
  }

  const packs = [1, 2, 3];
  const longer = count > 3;
  const total = formatMoney(feeKurus * count);

  return (
    <Modal
      open
      title={`Aidat al · ${student.name}`}
      onClose={onClose}
      closeDisabled={busy}
      dismissOnOverlay={false}
      footer={
        <>
          {/* Enter'ın aldığı düğme (formun ilk gönder düğmesi) nakittir; görsel sırada sağda durur. */}
          <Button type="submit" form="pay-form" size="md" variant="success" loading={busy && values.method === "cash"} disabled={busy} data-method="cash" className="order-last">
            Nakit al · {total}
          </Button>
          <Button type="submit" form="pay-form" size="md" variant="secondary" loading={busy && values.method === "eft"} disabled={busy} data-method="eft">
            Havale ile al
          </Button>
        </>
      }
    >
      <form
        id="pay-form"
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const method = ((e.nativeEvent as SubmitEvent).submitter as HTMLElement | null)?.dataset.method === "eft" ? "eft" : "cash";
          setValues((v) => ({ ...v, method }));
          submit(method);
        }}
      >
        {result && !result.ok && !result.fieldErrors ? <Alert>{result.error}</Alert> : null}

        {/* Özet: ne alınıyor, hangi antrenmanları kapsıyor */}
        <div className="rounded-xl bg-surface/80 px-4 py-3" aria-live="polite">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-[15px] font-semibold text-ink">{count * SESSIONS_PER_PACK} antrenman hakkı</span>
            <span className="text-xl font-bold tabular-nums text-ink">{total}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {plan ? (
              <>
                İlk antrenman {dayLabel(plan.from, false)} · sonraki ödeme <span className="font-semibold text-ink">{dayLabel(plan.until, false)}</span>
              </>
            ) : current?.error ? (
              current.error
            ) : (
              "Tarihler hesaplanıyor…"
            )}
          </p>
          {plan && plan.until <= today ? <p className="mt-1 text-sm font-semibold text-red-700">Bu tarihler geçmişte kalıyor; “Ödeme tarihinden” seçin.</p> : null}
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Kaç antrenman?</legend>
          <div className="grid grid-cols-4 gap-2">
            {packs.map((n) => (
              <Choice key={n} on={count === n} onClick={() => setValues((v) => ({ ...v, periodCount: String(n) }))}>
                <span className="block text-base font-bold tabular-nums">{n * SESSIONS_PER_PACK}</span>
                <span className="block text-xs font-medium opacity-75">{formatMoney(feeKurus * n)}</span>
              </Choice>
            ))}
            <label className={["relative flex min-h-12 cursor-pointer items-center justify-center rounded-xl border text-center text-sm transition", longer ? "border-gs-red bg-gs-red-soft font-semibold text-gs-red ring-1 ring-gs-red" : "border-control bg-white text-ink hover:border-gray-400"].join(" ")}>
              <span>{longer ? `${count * SESSIONS_PER_PACK}` : "Daha uzun"}</span>
              <select aria-label="Daha uzun paket" value={longer ? values.periodCount : ""} onChange={(e) => e.target.value && setValues((v) => ({ ...v, periodCount: e.target.value }))} className="absolute inset-0 cursor-pointer opacity-0">
                <option value="">Seçin</option>
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {n * SESSIONS_PER_PACK} antrenman · {formatMoney(feeKurus * n)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <DayChoice id="pay-date" today={today} value={values.paidOn} onChange={(d) => setValues((v) => ({ ...v, paidOn: d }))} error={errors.paidOn} />

        {both && current ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">Hak nereden başlasın?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["chain", "restart"] as const).map((k) => {
                const p = current[k]!;
                const on = start === k;
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setStartChoice(k)}
                    className={[
                      "min-h-16 cursor-pointer rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                      on ? "border-gs-red bg-gs-red-soft ring-1 ring-gs-red" : "border-control bg-white hover:border-gray-400",
                    ].join(" ")}
                  >
                    <span className={`flex items-center gap-2 text-sm font-semibold ${on ? "text-gs-red" : "text-ink"}`}>
                      {k === "chain" ? (current.hadPaid ? "Kaldığı yerden" : "Kayıt tarihinden") : "Ödeme tarihinden"}
                      {current.suggested === k ? <span className="rounded bg-emerald-50 px-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Önerilen</span> : null}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      İlk antrenman {dayLabel(p.from, false)} · sonraki ödeme {dayLabel(p.until, false)}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[13px] text-muted">
              {start === "chain"
                ? current.hadPaid
                  ? "Ödenmemiş paketi kapatır; aradaki antrenmanlar bu haktan düşer."
                  : "Hak okula kayıttan sonraki ilk antrenmandan sayılır."
                : current.hadPaid
                  ? "Ara vermiş sayılır: ödenmemiş eski paket kullanılmadı diye kapanır, hak ödeme gününden başlar."
                  : "Hak, ödeme gününden sonraki ilk antrenmandan sayılır."}
            </p>
          </fieldset>
        ) : null}

        {showNote || values.note ? (
          <Field label="Not" htmlFor="pay-note">
            <Input id="pay-note" value={values.note} onChange={(e) => setValues((v) => ({ ...v, note: e.target.value }))} maxLength={300} autoFocus={showNote && !values.note} />
          </Field>
        ) : (
          <button type="button" onClick={() => setShowNote(true)} className="-mt-2 inline-flex min-h-9 cursor-pointer items-center justify-self-start rounded-lg px-1 text-sm font-semibold text-gs-red hover:underline pointer-coarse:min-h-11">
            + Not ekle
          </button>
        )}
        {errors.method ? <p className="text-sm font-medium text-red-700">{errors.method}</p> : null}
      </form>
    </Modal>
  );
}

/** Ödeme günü: sık olanlar tek dokunuş (Bugün / Dün), eski bir gün takvimden. İleri tarih seçilemez. */
export function DayChoice({ id, today, value, onChange, error, legend = "Ödeme günü" }: { id: string; today: string; value: string; onChange: (day: string) => void; error?: string; legend?: string }) {
  const yesterday = addDaysTo(today, -1);
  const [pick, setPick] = useState(value !== today && value !== yesterday);
  const other = value !== today && value !== yesterday;
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid grid-cols-3 gap-2">
        <Choice on={value === today && !pick} onClick={() => (setPick(false), onChange(today))}>
          <span className="font-semibold">Bugün</span>
        </Choice>
        <Choice on={value === yesterday && !pick} onClick={() => (setPick(false), onChange(yesterday))}>
          <span className="font-semibold">Dün</span>
        </Choice>
        <Choice on={pick || other} onClick={() => setPick(true)}>
          <span className="font-semibold">{other ? dayLabel(value, false) : "Başka gün"}</span>
        </Choice>
      </div>
      {pick ? (
        <div className="mt-2">
          <DatePicker id={id} value={value} onChange={onChange} max={today} invalid={Boolean(error)} />
        </div>
      ) : null}
      {error ? <p className="mt-1.5 text-sm font-medium text-red-700">{error}</p> : null}
    </fieldset>
  );
}

/** Kasa defterindeki (ya da öğrenci dosyasındaki) bir ödemenin düzeltilecek kadarı. */
export type CorrectTarget = { kind: "aidat" | "forma"; id: number; studentName: string; amountKurus: number; what: string; receiptNo: string | null; method: PaymentMethod; day: string; note: string | null };

/**
 * Yanlış girilen ödemeyi düzeltir: şekli, günü (aidatta notu). Tutar ve antrenman hakkı değişmez; onlar için aidat
 * iptal edilip yeniden alınır. Aidatta "Ödemeyi iptal et" de buradan açılır (onVoid).
 */
export function CorrectPaymentDialog({ target, today, onClose, onVoid, onSaved }: { target: CorrectTarget; today: string; onClose: () => void; onVoid?: () => void; onSaved?: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>(target.method);
  const [day, setDay] = useState(target.day);
  const [note, setNote] = useState(target.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const changed = method !== target.method || day !== target.day || (target.kind === "aidat" && note.trim() !== (target.note ?? ""));
  const save = () =>
    startTransition(async () => {
      const res = target.kind === "aidat" ? await updatePaymentAction(target.id, { method, paidOn: day, note }) : await updateKitPaymentAction(target.id, { method, paidOn: day });
      if (!res.ok) return setError(res.error);
      toast({ text: `${target.studentName}: ödeme düzeltildi.` });
      router.refresh();
      onSaved?.();
      onClose();
    });
  return (
    <Modal
      open
      title="Ödemeyi düzelt"
      onClose={onClose}
      closeDisabled={busy}
      dismissOnOverlay={false}
      footer={
        <>
          {onVoid ? (
            <Button type="button" size="md" variant="ghost" className="mr-auto text-red-700 hover:bg-red-50" disabled={busy} onClick={onVoid}>
              Ödemeyi iptal et
            </Button>
          ) : null}
          <Button type="button" size="md" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" size="md" onClick={save} loading={busy} disabled={!changed}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        {error ? <Alert>{error}</Alert> : null}
        <div className="rounded-xl bg-surface/80 px-4 py-3">
          <p className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[15px] font-semibold text-ink">{target.studentName}</span>
            <span className="text-xl font-bold tabular-nums text-ink">{formatMoney(target.amountKurus)}</span>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {target.kind === "forma" ? target.what : `Aidat · ${target.what}`}
            {target.receiptNo ? ` · makbuz ${target.receiptNo}` : ""}
          </p>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Nasıl ödedi?</legend>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <Choice key={m} on={method === m} onClick={() => setMethod(m)}>
                <span className="font-semibold">{PAYMENT_METHOD_LABELS[m]}</span>
              </Choice>
            ))}
          </div>
        </fieldset>
        <DayChoice id="fix-day" today={today} value={day} onChange={setDay} />
        {target.kind === "aidat" ? (
          <Field label="Not" htmlFor="fix-note">
            <Input id="fix-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          </Field>
        ) : null}
        <p className="text-sm text-muted">
          {target.kind === "aidat" ? "Tutar ve antrenman hakkı tarihleri değişmez. Onları değiştirmek için ödemeyi iptal edip yeniden alın." : "Tutarı değiştirmek için Forma sayfasından kaydı açın."}
        </p>
      </div>
    </Modal>
  );
}

/** Seçmeli kutucuk (ay sayısı, ödeme şekli gibi). */
export function Choice({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={[
        "min-h-12 cursor-pointer rounded-xl border px-2 py-1.5 text-center text-sm transition active:scale-[0.97]",
        on ? "border-gs-red bg-gs-red-soft text-gs-red ring-1 ring-gs-red" : "border-control bg-white text-ink hover:border-gray-400",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ---------------- Öğrencinin aidatı (dosyada ve aidat ekranında) ---------------- */

export function BillingPanel({ studentId, target, onPay, showSummary = true }: { studentId: number; target: PayTarget; onPay: () => void; /** Durum ve ödeme düğmeleri sayfada başka yerde gösteriliyorsa gizlenir. */ showSummary?: boolean }) {
  const [data, setData] = useState<StudentBilling | null>(null);
  const [reason, setReason] = useState<{ title: string; label: string; confirm: string; run: (r: string) => Promise<ActionResult> } | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [correcting, setCorrecting] = useState<CorrectTarget | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const load = () => getStudentBillingAction(studentId).then(setData);
  useEffect(() => {
    let alive = true;
    getStudentBillingAction(studentId).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [studentId, target.access.state, target.access.paidUntil]);

  const after = async (res: ActionResult, ok: string) => {
    toast(res.ok ? { text: ok } : { kind: "error", text: res.error });
    if (res.ok) {
      await load();
      router.refresh();
    }
    return res;
  };

  const a = data?.access ?? target.access;
  const today = data?.today ?? "";
  const reminder = reminderHref({ ...target, access: a }, today);
  const periods = data ? (showAll ? data.periods : data.periods.slice(0, 4)) : [];

  return (
    <div className="grid gap-5">
      <div className={showSummary ? "flex flex-wrap items-center justify-between gap-3" : "hidden"}>
        <div className="min-w-0">
          <PayPill access={a} today={today} />
          <p className="mt-1 text-[15px] font-medium text-ink">{accessLine(a, today)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reminder ? (
            <a href={reminder} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs transition hover:bg-gray-50 pointer-coarse:min-h-11">
              <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Hatırlat
            </a>
          ) : null}
          {data?.canCollect && target.feeKurus > 0 ? (
            <Button type="button" size="md" variant={a.state === "paid" ? "secondary" : "success"} onClick={onPay}>
              <Receipt className="h-4 w-4" aria-hidden="true" />
              {a.state === "paid" ? "Peşin aidat al" : "Aidat al"}
            </Button>
          ) : null}
        </div>
      </div>

      {data ? (
        <>
          <dl className="grid gap-3 rounded-xl bg-surface/70 p-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium text-muted">Aidat · {SESSIONS_PER_PACK} antrenman</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{formatMoney(target.feeKurus)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted">{a.state === "paid" ? "Sonraki ödeme" : "Aidat bekleniyor"}</dt>
              <dd className="mt-0.5 text-[15px] font-semibold text-ink">{a.state === "paid" ? (a.paidUntil ? dayLabel(a.paidUntil, false) : "—") : a.dueDate ? dayLabel(a.dueDate, false) : "—"}</dd>
              {data.canCollect && data.periods.some((p) => p.status === "paid") ? (
                <Link href={`/admin/aidat/hak?ogrenci=${studentId}`} className="mt-0.5 inline-flex min-h-8 items-center text-xs font-semibold text-gs-red hover:underline pointer-coarse:min-h-11">
                  Kalan hakkı düzelt
                </Link>
              ) : null}
            </div>
            <DiscountFact data={data} studentId={studentId} onSaved={async () => void (await load(), router.refresh())} />
          </dl>

          <div className="grid gap-5">
            <section>
              <h3 className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">
                Hak paketleri
                {data.periods.length > 4 ? (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="cursor-pointer rounded-md px-1.5 text-xs font-semibold text-gs-red hover:bg-gs-red-soft">
                    {showAll ? "Daha az" : `Tümü (${data.periods.length})`}
                  </button>
                ) : null}
              </h3>
              {data.periods.length === 0 ? <p className="py-2 text-sm text-muted">Henüz paket açılmadı.</p> : null}
              <ul className="divide-y divide-line rounded-xl border border-line">
                {periods.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 text-ink">
                      {periodRangeLabel(p.startDate, p.endDate)}
                      <span className="block text-xs text-muted">{SESSIONS_PER_PACK} antrenman · sonraki ödeme {dayLabel(p.endDate, false)}</span>
                    </span>
                    <span className="tabular-nums text-muted">{formatMoney(p.amountKurus)}</span>
                    <span
                      className={[
                        "rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                        p.status === "paid" ? "bg-emerald-50 text-emerald-800 ring-emerald-600/20" : p.status === "void" ? "bg-stone-100 text-stone-500 ring-stone-500/15" : p.startDate > data.today ? "bg-stone-100 text-stone-700 ring-stone-500/15" : "bg-amber-50 text-amber-800 ring-amber-600/25",
                      ].join(" ")}
                      title={p.note ?? undefined}
                    >
                      {p.status === "paid" ? "Ödendi" : p.status === "void" ? "Kaldırıldı" : p.startDate > data.today ? "Gelecek" : "Ödenmedi"}
                    </span>
                    {data.canCollect && p.status === "open" ? (
                      <button
                        type="button"
                        className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 text-xs font-semibold text-muted hover:bg-stone-100 hover:text-ink pointer-coarse:min-h-11"
                        onClick={() => setReason({ title: "Paketi kaldır (ücretsiz say)", label: "Neden kaldırılıyor?", confirm: "Kaldır", run: (r) => voidPeriodAction(p.id, r) })}
                      >
                        Kaldır
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="mb-1.5 text-sm font-semibold text-ink">Ödemeler</h3>
              {data.payments.length === 0 ? <p className="py-2 text-sm text-muted">Ödeme yok.</p> : null}
              {data.payments.length ? (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {data.payments.map((p) => (
                    <li key={p.id} className={["flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-2 text-sm", p.voidedAt ? "opacity-60" : ""].join(" ")}>
                      <span className="min-w-0 flex-1 text-ink">
                        {dayLabel(p.paidOn, false)} · {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method}
                        <span className="block text-xs text-muted">{p.periodCount > 1 ? `${p.periodCount} aidat · ` : ""}{p.periodCount * SESSIONS_PER_PACK} antrenman hakkı</span>
                        {p.voidedAt ? <span className="block text-xs font-semibold text-red-700">İptal: {p.voidReason}</span> : null}
                      </span>
                      <span className="font-semibold tabular-nums text-ink">{formatMoney(p.amountKurus)}</span>
                      <a href={`/admin/aidat/makbuz/${p.id}`} target="_blank" rel="noopener" className="rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold text-gs-red hover:bg-gs-red-soft" title="Makbuz">
                        {p.receiptNo}
                      </a>
                      {data.canCollect && !p.voidedAt ? (
                        <button
                          type="button"
                          className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 text-xs font-semibold text-muted hover:bg-stone-100 hover:text-ink pointer-coarse:min-h-11"
                          onClick={() =>
                            setCorrecting({
                              kind: "aidat",
                              id: p.id,
                              studentName: target.name,
                              amountKurus: p.amountKurus,
                              what: `${p.periodCount * SESSIONS_PER_PACK} antrenman`,
                              receiptNo: p.receiptNo,
                              method: p.method as PaymentMethod,
                              day: p.paidOn,
                              note: p.note,
                            })
                          }
                        >
                          Düzelt
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </div>

          {data.canOverride && (a.state === "locked" || a.state === "grace" || (a.state === "override" && a.override)) ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4 text-sm text-muted">
              <CalendarClock className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
              {a.state === "override" && a.override ? (
                <>
                  <span className="min-w-0 flex-1">
                    Ödeme sözü: <span className="font-semibold text-ink">{dayLabel(a.override.endsOn)}</span>
                    {a.override.reason !== PROMISE_DEFAULT ? ` · ${a.override.reason}` : ""}
                  </span>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setOverrideOpen(true)}>
                    Günü değiştir
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => startTransition(async () => void (await after(await revokeOverrideAction(a.override!.id), "Ödeme sözü kaldırıldı.")))}>
                    Sözü kaldır
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1">Veli ödeyeceği günü söylediyse girin; o güne kadar antrenmana devam eder.</span>
                  <Button type="button" size="sm" variant="secondary" onClick={() => setOverrideOpen(true)}>
                    Ödeme sözü ekle
                  </Button>
                </>
              )}
            </div>
          ) : null}

          {data.overrides.length > 0 ? (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-muted hover:text-ink">Ödeme sözleri ({data.overrides.length})</summary>
              <ul className="mt-2 divide-y divide-line">
                {data.overrides.map((o) => {
                  const status = o.fulfilledAt ? ["ödendi", "text-emerald-700"] : o.revokedAt ? ["kaldırıldı", "text-muted"] : o.endsOn < data.today ? ["gelmedi", "text-red-700"] : ["bekleniyor", "text-sky-800"];
                  return (
                    <li key={o.id} className="flex flex-wrap gap-x-2 py-1.5 text-ink">
                      <span>
                        {dayLabel(o.startsOn, false)} tarihinde söz: <span className="font-semibold">{dayLabel(o.endsOn)}</span>
                        {o.reason !== PROMISE_DEFAULT ? ` · ${o.reason}` : ""}
                      </span>
                      <span className={`font-semibold ${status[1]}`}>{status[0]}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <div className="grid gap-2" aria-hidden="true">
          <div className="h-16 animate-pulse rounded-xl bg-surface" />
          <div className="h-28 animate-pulse rounded-xl bg-surface" />
        </div>
      )}

      {reason ? (
        <ReasonDialog
          title={reason.title}
          label={reason.label}
          confirm={reason.confirm}
          onClose={() => setReason(null)}
          onConfirm={async (r) => {
            const res = await after(await reason.run(r), "Kaydedildi.");
            if (res.ok) setReason(null);
            return res;
          }}
        />
      ) : null}
      {correcting && data ? (
        <CorrectPaymentDialog
          target={correcting}
          today={data.today}
          onClose={() => setCorrecting(null)}
          onSaved={() => void load()}
          onVoid={() => {
            const p = correcting;
            setCorrecting(null);
            setReason({ title: `Makbuz ${p.receiptNo} iptal`, label: "İptal gerekçesi", confirm: "Ödemeyi iptal et", run: (r) => voidPaymentAction(p.id, r) });
          }}
        />
      ) : null}
      {overrideOpen && data ? (
        <PromiseDialog
          name={target.name}
          today={data.today}
          current={a.state === "override" ? a.override : null}
          onClose={() => setOverrideOpen(false)}
          onConfirm={async (endsOn, note) => {
            const res = await after(await createOverrideAction(studentId, endsOn, note), `Ödeme sözü kaydedildi: ${dayLabel(endsOn, false)}.`);
            if (res.ok) setOverrideOpen(false);
            return res;
          }}
        />
      ) : null}
    </div>
  );
}

function DiscountFact({ data, studentId, onSaved }: { data: StudentBilling; studentId: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(data.discountName ?? "");
  const [percent, setPercent] = useState(data.discountPercent ? String(data.discountPercent) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const save = (remove: boolean) =>
    startTransition(async () => {
      const res = await setDiscountAction(studentId, remove ? "" : name, remove ? null : Number(percent.replace(",", ".")) || null);
      if (!res.ok) return setError(res.error);
      toast({ text: remove ? "İndirim kaldırıldı." : "İndirim kaydedildi; ödenmemiş dönemler güncellendi." });
      setEditing(false);
      onSaved();
    });
  const suggestions = data.discountSuggestions.filter((d) => !name || d.name.toLocaleLowerCase("tr-TR").includes(name.toLocaleLowerCase("tr-TR")));
  return (
    <div className={editing ? "sm:col-span-3" : ""}>
      <dt className="text-xs font-medium text-muted">İndirim</dt>
      <dd className="mt-0.5 text-[15px] text-ink">
        {!editing ? (
          <span className="flex flex-wrap items-center gap-1">
            {data.discountName ? (
              <span>
                <span className="font-semibold">{data.discountName}</span> · %{data.discountPercent}
              </span>
            ) : (
              <span className="text-muted">Yok</span>
            )}
            {data.canCollect ? (
              <button type="button" className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 text-sm font-semibold text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-11" onClick={() => setEditing(true)}>
                {data.discountName ? "Değiştir" : "Uygula"}
              </button>
            ) : null}
            {data.canCollect && data.discountName ? (
              <button type="button" disabled={busy} className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-2 text-sm font-semibold text-red-700 hover:bg-red-50 pointer-coarse:min-h-11" onClick={() => save(true)}>
                Kaldır
              </button>
            ) : null}
          </span>
        ) : (
          <div className="mt-1 grid gap-3">
            {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <Field label="İndirim adı" htmlFor="disc-name">
                <Input id="disc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ör. Kardeş indirimi" autoComplete="off" className="min-h-11" />
              </Field>
              <Field label="Oran (%)" htmlFor="disc-pct">
                <Input id="disc-pct" inputMode="numeric" value={percent} onChange={(e) => setPercent(e.target.value)} className="min-h-11" />
              </Field>
            </div>
            {suggestions.length ? (
              <div className="flex flex-wrap gap-1.5">
                {suggestions.slice(0, 6).map((d) => (
                  <button key={d.name} type="button" onClick={() => (setName(d.name), setPercent(String(d.percent)))} className="min-h-9 cursor-pointer rounded-full border border-gs-red/30 bg-white px-3 text-sm font-semibold text-gs-red hover:bg-gs-red-soft">
                    {d.name} · %{d.percent}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button type="button" size="sm" loading={busy} onClick={() => save(false)}>
                Kaydet
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Vazgeç
              </Button>
            </div>
          </div>
        )}
      </dd>
    </div>
  );
}

export function ReasonDialog({ title, label, confirm, onClose, onConfirm }: { title: string; label: string; confirm: string; onClose: () => void; onConfirm: (reason: string) => Promise<ActionResult> }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <Button type="button" size="md" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            size="md"
            variant="danger"
            loading={busy}
            onClick={() =>
              startTransition(async () => {
                const res = await onConfirm(text);
                if (!res.ok) setError(res.error);
              })
            }
          >
            {confirm}
          </Button>
        </>
      }
    >
      <Field label={label} htmlFor="reason-text" required error={error ?? undefined}>
        <Input id="reason-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} autoFocus />
      </Field>
    </Modal>
  );
}

/**
 * Ödeme sözü: veli ödeyeceği günü söyledi. Söz günü dahil antrenmana devam eder; ödeme gelince söz kapanır,
 * gelmezse listede "ödeyecekti, gelmedi" görünür.
 */
export function PromiseDialog({
  name,
  today,
  current,
  onClose,
  onConfirm,
}: {
  name: string;
  today: string;
  current?: { endsOn: string; reason: string } | null;
  onClose: () => void;
  onConfirm: (endsOn: string, note: string) => Promise<ActionResult>;
}) {
  const [endsOn, setEndsOn] = useState(current?.endsOn ?? "");
  const [note, setNote] = useState(current && current.reason !== PROMISE_DEFAULT ? current.reason : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const quick = promiseQuickDays(today);
  return (
    <Modal
      open
      title={`Ödeme sözü · ${name}`}
      onClose={onClose}
      closeDisabled={busy}
      footer={
        <>
          <Button type="button" size="md" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            size="md"
            loading={busy}
            disabled={!endsOn}
            onClick={() =>
              startTransition(async () => {
                const res = await onConfirm(endsOn, note);
                if (!res.ok) setError(res.error);
              })
            }
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm text-muted">Veli ödeyeceği günü söylediyse girin. O güne kadar antrenmana devam eder; ödeme gelince söz kendiliğinden kapanır. Gelmezse listede “ödeyecekti, gelmedi” görünür.</p>
        {error ? <Alert>{error}</Alert> : null}
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink">Ne zaman ödeyecek?</legend>
          <div className="grid grid-cols-3 gap-2">
            {quick.map((q) => (
              <Choice key={q.label} on={endsOn === q.day} onClick={() => setEndsOn(q.day)}>
                <span className="block font-semibold">{q.label}</span>
                <span className="block text-xs opacity-75">{dayLabel(q.day, false)}</span>
              </Choice>
            ))}
          </div>
          <div className="mt-2">
            <DatePicker id="promise-day" value={endsOn} onChange={setEndsOn} min={today} max={addDaysTo(today, 31)} placeholder="Başka bir gün seçin" />
          </div>
        </fieldset>
        <Field label="Not (isteğe bağlı)" htmlFor="promise-note">
          <Input id="promise-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Ör. maaş gününde getirecek" />
        </Field>
      </div>
    </Modal>
  );
}

/** Hızlı seçimler: yarın, sıradaki hafta sonu (antrenman günü), bir hafta sonra. */
function promiseQuickDays(today: string): { label: string; day: string }[] {
  const { y, m, d } = parseDay(today);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const toSaturday = (6 - js + 7) % 7 || 7;
  // Yarın Cumartesi ise ikinci seçenek Pazar olur.
  const weekend = toSaturday === 1 ? { label: "Pazar", day: addDaysTo(today, 2) } : { label: "Cumartesi", day: addDaysTo(today, toSaturday) };
  return [{ label: "Yarın", day: addDaysTo(today, 1) }, weekend, { label: "1 hafta sonra", day: addDaysTo(today, 7) }];
}
