"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Check, ChevronDown, CircleAlert, FolderOpen, IdCard, MessageCircle, Printer } from "lucide-react";
import { Page, PageHeader, Panel } from "@/components/admin/kit";
import { SizePicker } from "@/components/admin/SizePicker";
import { DatePicker } from "@/components/Calendar";
import { useToast } from "@/components/admin/Toast";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import type { RegistrationDto } from "@/lib/api";
import { effectiveGroup, formatYearRange, type AgeGroupView } from "@/lib/age-groups";
import { dayLabel, dayLabelAt, discountedFee, formatMoney } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { formatDateTr, formatDayLongTr, istanbulDayKey } from "@/lib/format";
import { defaultSockDelivery, hasSocks, isFormaItem, type Delivery } from "@/lib/equipment-shared";
import type { BillingOptions } from "@/lib/panel-data";
import { welcomeMessage, whatsappLink, type WelcomeInfo } from "@/lib/whatsapp";
import { enrollAction, type ActionResult, type EnrollFormValues } from "../../../actions";
import { Choice } from "../../../aidat/BillingParts";

type Done = { studentNo: number | null; paymentId?: number };
type Item = { id: number; name: string; priceKurus: number };
/** Forma zorunlu (istiyor sayılır), eşofman isteğe bağlı. Her biri: parası verdi mi × teslim edildi mi / sipariş verilecek mi, ya da zaten var. */
type Kit = {
  want: boolean;
  paid: boolean | null;
  delivery: "" | "delivered" | "to_order";
  /** Forma-şort (ya da eşofman) bedeni. */
  size: string;
  /** Tozluk numarası ve teslimi (tozluklu üründe); teslim boşsa formaya göre (defaultSockDelivery). */
  sockSize: string;
  sockDelivery: "" | Delivery;
  /** Kendisinde zaten var: satış yok, ücret yok. */
  owned?: boolean;
};

const DELIVERY_CHOICES = [
  ["delivered", "Teslim aldı"],
  ["to_order", "Sipariş verilecek"],
] as const;

/** Forma/eşofman için dört durum (parası × teslim), tek dokunuşla seçilir. */
const KIT_STATES = [
  { key: "paid-delivered", paid: true, delivery: "delivered" },
  { key: "paid-order", paid: true, delivery: "to_order" },
  { key: "unpaid-delivered", paid: false, delivery: "delivered" },
  { key: "unpaid-order", paid: false, delivery: "to_order" },
] as const;

const isRequiredItem = (i: Item) => isFormaItem(i.name);

/** Tozluğun kayıtta seçilebilen durumları. */
const SOCK_CHOICES: [Delivery, string][] = [
  ["delivered", "Teslim aldı"],
  ["waiting", "Verilmedi"],
  ["to_order", "Sipariş verilecek"],
];

/** Ödeme sözü için hızlı günler: yarın, sıradaki Cumartesi, bir hafta sonra. */
function promiseChoices(today: string): { label: string; day: string }[] {
  const [y, m, d] = today.split("-").map(Number);
  const js = new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
  const toSaturday = (6 - js + 7) % 7 || 7;
  return [
    { label: "Yarın", day: addDaysTo(today, 1) },
    ...(toSaturday > 1 ? [{ label: "Cumartesi", day: addDaysTo(today, toSaturday) }] : [{ label: "Pazar", day: addDaysTo(today, 2) }]),
    { label: "1 hafta sonra", day: addDaysTo(today, 7) },
  ];
}

/**
 * Asıl kayıt: her aday durumundan (randevulu, randevusuz, gelmedi, vazgeçti) doğrudan yapılır.
 * Önerilen grup ve bugünkü tarih hazır gelir; boy/kilo isteğe bağlı. Kayıtlı öğrencide grup ve ölçü düzenlenir.
 */
export function EnrollForm({
  reg,
  groups,
  billing,
  items = [],
  sessions = {},
  overToday = [],
  program = {},
  consentTexts = { required: [], photo: false },
}: {
  reg: RegistrationDto;
  groups: AgeGroupView[];
  billing: BillingOptions;
  items?: Item[];
  /** Grup kimliği → yakındaki antrenman günleri ("0": grupsuz, hafta sonu). */
  sessions?: Record<string, string[]>;
  /** Bugünkü antrenmanı bitmiş gruplar (bugün kaydolanın hakkı ertesi günden başlar). */
  overToday?: number[];
  /** Grup kimliği → haftalık program satırları ve yol tarifi (hoş geldin mesajı için). */
  program?: Record<string, { slots: { weekday: number; startTime: string; text: string }[]; mapUrl: string | null }>;
  /** Yayındaki zorunlu onay metinlerinin adları ve fotoğraf izni metni var mı (kâğıt formdaki onaylar). */
  consentTexts?: { required: string[]; photo: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const today = istanbulDayKey(new Date());
  const suggested = effectiveGroup(reg, groups).group;
  const editing = reg.status === "enrolled";
  const [values, setValues] = useState<EnrollFormValues>({
    heightCm: reg.heightCm ? String(reg.heightCm) : "",
    weightKg: reg.weightKg ? String(reg.weightKg).replace(".", ",") : "",
    groupId: String(reg.groupId ?? suggested?.id ?? ""),
    isGoalkeeper: reg.isGoalkeeper,
    enrolledOn: editing && reg.enrolledAt ? istanbulDayKey(reg.enrolledAt) : today,
    firstPayment: "",
    promiseOn: "",
    billingDay: "",
    discountOn: Boolean(reg.discountName),
    discountName: reg.discountName ?? "",
    discountPercent: reg.discountPercent ? String(reg.discountPercent) : "",
  });
  const [kit, setKit] = useState<Record<number, Kit>>({});
  const [note, setNote] = useState("");
  const [consents, setConsents] = useState<{ signed: boolean; photo: "" | "yes" | "no" }>({ signed: false, photo: "" });
  const askConsents = !editing && (consentTexts.required.length > 0 || consentTexts.photo);
  const [kitError, setKitError] = useState(false);
  const itemById = new Map(items.map((i) => [i.id, i]));
  const kitOf = (id: number): Kit => kit[id] ?? { want: isRequiredItem(itemById.get(id)!), paid: null, delivery: "", size: "", sockSize: "", sockDelivery: "" };
  const sockOf = (k: Kit): Delivery => k.sockDelivery || defaultSockDelivery(k.delivery || "to_order", Boolean(k.owned));
  const setKitOf = (id: number, patch: Partial<Kit>) => setKit((k) => ({ ...k, [id]: { ...kitOf(id), ...patch } }));
  const chosenKit = items.filter((i) => kitOf(i.id).want);
  const kitIncomplete = (i: Item) => kitOf(i.id).want && (kitOf(i.id).paid === null || !kitOf(i.id).delivery);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [pending, startTransition] = useTransition();
  const errors = result && !result.ok ? (result.fieldErrors ?? {}) : {};
  const set = (key: keyof EnrollFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const canBill = !editing && billing.canCollect;
  const pct = Number((values.discountPercent ?? "").replace(",", "."));
  const packFee = values.discountOn && pct > 0 && pct <= 100 ? discountedFee(billing.feeKurus, pct) : billing.feeKurus;
  const group = groups.find((g) => String(g.id) === values.groupId) ?? null;
  // Hak önizlemesi: kayıt gününden itibaren grubun antrenmanları; 1. antrenman hakkın başlangıcı, 9.'su yenileme.
  const skipToday = values.enrolledOn === today && group !== null && overToday.includes(group.id);
  const upcoming = (sessions[group ? String(group.id) : "0"] ?? []).filter((d) => d >= values.enrolledOn && !(skipToday && d === today));
  const firstSession = upcoming[0] ?? null;
  const renewal = upcoming[8] ?? null;
  // Bugün elden alınan: kayıtta verilen aidat + parası verilen forma/eşofman
  const collectedToday = (canBill && values.firstPayment ? packFee : 0) + chosenKit.filter((i) => kitOf(i.id).paid === true && !kitOf(i.id).owned).reduce((sum, i) => sum + i.priceKurus, 0);
  const suggestions = useMemo(
    () => billing.discounts.filter((d) => !values.discountName || d.name.toLocaleLowerCase("tr-TR").includes((values.discountName ?? "").toLocaleLowerCase("tr-TR"))).slice(0, 6),
    [billing.discounts, values.discountName],
  );

  function submit() {
    if (!editing && items.some(kitIncomplete)) {
      setKitError(true);
      document.getElementById("kit-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    startTransition(async () => {
      const orders = editing
        ? []
        : chosenKit.map((i) => {
            const k = kitOf(i.id);
            return { itemId: i.id, paid: k.paid === true, delivery: k.delivery, size: k.size, owned: Boolean(k.owned), ...(hasSocks(i.name) ? { sockSize: k.sockSize, sockDelivery: sockOf(k) } : {}) };
          });
      const res = await enrollAction(reg.id, { ...values, orders, note: editing ? "" : note, consents: askConsents ? consents : undefined });
      setResult(res);
      if (!res.ok) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (editing) {
        toast({ text: "Grup, kaleci ve ölçüler güncellendi." });
        router.push(`/admin/kayit/${reg.id}`);
        router.refresh();
        return;
      }
      setDone({ studentNo: (res as { studentNo?: number | null }).studentNo ?? null, paymentId: (res as { paymentId?: number }).paymentId });
      window.scrollTo({ top: 0 });
      router.refresh();
    });
  }

  if (reg.status === "left")
    return (
      <Page width="narrow">
        <PageHeader back={{ href: `/admin/kayit/${reg.id}`, label: reg.studentFullName }} title="Okula kayıt" />
        <Alert kind="info">Bu öğrenci okuldan ayrılmış. Geri döndüyse dosyasındaki “Geri döndü, etkinleştir” düğmesini kullanın.</Alert>
      </Page>
    );

  if (done) {
    // Veliye gidecek bilgiler: grup, günler, ilk antrenman, aidat ve forma
    const plan = group ? program[String(group.id)] : undefined;
    const weekday = (day: string) => ((new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const firstTime = firstSession ? plan?.slots.find((x) => x.weekday === weekday(firstSession))?.startTime : undefined;
    const fee =
      billing.feeKurus <= 0
        ? null
        : done.paymentId
          ? `Aidat: ${formatMoney(packFee)} alındı (8 antrenman).${renewal ? ` Sonraki ödeme ${formatDayLongTr(renewal)}.` : ""}`
          : values.promiseOn
            ? `Aidat: ${formatMoney(packFee)} (8 antrenman), ${dayLabelAt(values.promiseOn)} ödenecek.`
            : `Aidat: ${formatMoney(packFee)} = 8 antrenman.`;
    const kitLines = chosenKit
      .filter((i) => !kitOf(i.id).owned)
      .map((i) => {
        const k = kitOf(i.id);
        const label = isFormaItem(i.name) ? "Forma" : i.name;
        const state = k.delivery === "delivered" ? `teslim edildi${hasSocks(i.name) && sockOf(k) === "waiting" ? " (tozluk ayrıca verilecek)" : ""}` : "sipariş verilecek, gelince haber vereceğiz";
        return `${label}: ${state}${k.paid === false ? ` · ücreti (${formatMoney(i.priceKurus)}) henüz ödenmedi` : ""}.`;
      });
    const welcome: WelcomeInfo = {
      parentName: reg.contact.fullName,
      studentName: reg.studentFullName,
      studentNo: done.studentNo,
      group: group ? { name: group.name, years: formatYearRange(group) } : null,
      slots: plan?.slots.map((x) => x.text),
      firstTraining: firstSession ? `${formatDayLongTr(firstSession)}${firstTime ? ` ${firstTime}` : ""}` : null,
      mapUrl: plan?.mapUrl ?? null,
      fee,
      kit: kitLines,
    };
    return <Success reg={reg} done={done} group={group} welcome={welcome} />;
  }

  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: `/admin/kayit/${reg.id}`, label: reg.studentFullName }}
        title={editing ? "Grup, kaleci ve ölçüler" : "Okula kayıt"}
        description={
          <>
            <span className="font-semibold text-ink">{reg.studentFullName}</span>
            {reg.birthDate ? ` · ${formatDateTr(reg.birthDate)}${reg.age !== null ? ` (${reg.age} yaş)` : ""}` : " · doğum tarihi girilmemiş"}
            {reg.contact.fullName ? ` · ${reg.contact.typeLabel}: ${reg.contact.fullName}` : ""}
          </>
        }
      />

      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {result && !result.ok ? <Alert>{result.error}</Alert> : null}
        {!editing && reg.missing.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20 sm:flex-row sm:items-center">
            <CircleAlert className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <p className="flex-1">
              <span className="font-semibold">Eksik bilgi:</span> {reg.missing.join(", ")}. Kayıt yine de tamamlanır; veli buradayken tamamlamak iyi olur.
            </p>
            <Link href={`/admin/kayit/${reg.id}/duzenle`} className="font-semibold underline underline-offset-2">
              Bilgileri tamamla
            </Link>
          </div>
        ) : null}

        <Panel title="Grup" description={suggested ? `Doğum yılına göre önerilen: ${suggested.name}` : reg.birthDate ? "Doğum yılı hiçbir grubun aralığında değil; elle seçin." : "Doğum tarihi yok; grubu elle seçin."}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Grup">
            {groups.map((g) => {
              const on = values.groupId === String(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setValues((v) => ({ ...v, groupId: String(g.id) }))}
                  className={[
                    "relative min-h-16 cursor-pointer rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                    on ? "border-gs-red bg-gs-red-soft ring-1 ring-gs-red" : "border-control bg-white hover:border-gray-400",
                  ].join(" ")}
                >
                  <span className={`block font-semibold ${on ? "text-gs-red" : "text-ink"}`}>{g.name}</span>
                  <span className="block text-xs text-muted">{formatYearRange(g)} doğumlu</span>
                  {g.id === suggested?.id ? <span className="absolute right-2 top-2 rounded-md bg-emerald-50 px-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">Önerilen</span> : null}
                </button>
              );
            })}
          </div>
          {errors.groupId ? <p className="mt-2 text-sm font-medium text-red-700">{errors.groupId}</p> : null}
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm font-semibold text-ink">Kaleci mi?</legend>
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              {(
                [
                  [false, "Hayır, oyuncu"],
                  [true, "Evet, kaleci"],
                ] as const
              ).map(([v, label]) => (
                <Choice key={label} on={Boolean(values.isGoalkeeper) === v} onClick={() => setValues((x) => ({ ...x, isGoalkeeper: v }))}>
                  <span className="font-semibold">{label}</span>
                </Choice>
              ))}
            </div>
          </fieldset>
        </Panel>

        <Panel title="Kayıt tarihi">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { day: today, label: "Bugün" },
              { day: addDaysTo(today, -1), label: "Dün" },
            ].map((o) => (
              <Choice key={o.label} on={values.enrolledOn === o.day} onClick={() => setValues((v) => ({ ...v, enrolledOn: o.day }))} className="min-h-11 px-4">
                <span className="font-semibold">{o.label}</span>
              </Choice>
            ))}
            <div className="min-w-56 flex-1 sm:flex-none">
              <DatePicker id="enrolledOn" value={values.enrolledOn} onChange={(day) => setValues((v) => ({ ...v, enrolledOn: day }))} max={today} invalid={Boolean(errors.enrolledOn)} />
            </div>
          </div>
        </Panel>

        {canBill ? (
          <Panel title="Aidat · 8 antrenman hakkı" description={billing.feeKurus > 0 ? `Bir aidat (${formatMoney(billing.feeKurus)}) grubun sıradaki 8 antrenmanını kapsar. Aidatı gelene hak verilir.` : "Aidat tutarı henüz girilmedi (Ayarlar)."}>
            <div className="grid gap-5">
              {billing.feeKurus > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-semibold text-ink">Aidatını verdi mi? ({formatMoney(packFee)})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["", "Henüz vermedi"],
                        ["cash", "Verdi · nakit"],
                        ["eft", "Verdi · havale"],
                      ] as const
                    ).map(([v, label]) => (
                      <Choice key={v} on={(values.firstPayment ?? "") === v} onClick={() => setValues((x) => ({ ...x, firstPayment: v, promiseOn: v ? "" : x.promiseOn }))}>
                        <span className="font-semibold">{label}</span>
                      </Choice>
                    ))}
                  </div>
                  <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm text-ink">
                    {values.firstPayment
                      ? firstSession
                        ? `8 antrenman hakkı verilir: ${formatDayLongTr(firstSession)} ile başlar${renewal ? `, yenileme ${formatDayLongTr(renewal)}` : ""}.`
                        : "8 antrenman hakkı verilir."
                      : firstSession
                        ? `Hak aidatı gelince başlar. İlk antrenmanı ${formatDayLongTr(firstSession)}; aidatı ${billing.graceDays} gün içinde gelmezse antrenmana katılamaz.`
                        : "Hak aidatı gelince başlar."}
                  </p>
                  {values.firstPayment && values.enrolledOn < today ? (
                    <p className="mt-2 text-sm text-muted">Ödeme kayıt günü olan {dayLabel(values.enrolledOn, false)} tarihine yazılır; kasada o günün içinde görünür.</p>
                  ) : null}
                  {!values.firstPayment && billing.canPromise ? (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-ink">
                        Ne zaman ödeyecek? <span className="font-normal text-muted">(isteğe bağlı)</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {promiseChoices(today).map((o) => (
                          <Choice key={o.label} on={values.promiseOn === o.day} onClick={() => setValues((v) => ({ ...v, promiseOn: v.promiseOn === o.day ? "" : o.day }))} className="min-h-11 px-4">
                            <span className="font-semibold">{o.label}</span>
                          </Choice>
                        ))}
                        <div className="min-w-56 flex-1 sm:flex-none">
                          <DatePicker id="promiseOn" value={values.promiseOn ?? ""} onChange={(day) => setValues((v) => ({ ...v, promiseOn: day }))} min={today} max={addDaysTo(today, 31)} placeholder="Başka gün" clearable />
                        </div>
                      </div>
                      <p className="mt-2 text-[13px] text-muted">
                        {values.promiseOn ? `Ödeme sözü: ${dayLabelAt(values.promiseOn)} ödeyecek; o güne kadar antrenmana devam eder. Gelmezse aidat listesinde “ödeyecekti, gelmedi” görünür.` : "Veli ödeyeceği günü söylediyse seçin; aidat listesinde o gün hatırlatılır."}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-ink">
                  <input type="checkbox" className="h-5 w-5 cursor-pointer accent-[var(--color-gs-red)]" checked={Boolean(values.discountOn)} onChange={(e) => setValues((v) => ({ ...v, discountOn: e.target.checked }))} />
                  İndirim uygula
                </label>
                {values.discountOn ? (
                  <div className="mt-3 grid gap-3">
                    {suggestions.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((d) => (
                          <button key={d.name} type="button" onClick={() => setValues((v) => ({ ...v, discountName: d.name, discountPercent: String(d.percent) }))} className="min-h-9 cursor-pointer rounded-full border border-gs-red/30 bg-white px-3 text-sm font-semibold text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-10">
                            {d.name} · %{d.percent}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                      <Field label="İndirim adı" htmlFor="discountName" error={errors.discountName}>
                        <Input id="discountName" value={values.discountName ?? ""} onChange={set("discountName")} placeholder="Ör. Kardeş indirimi" autoComplete="off" invalid={Boolean(errors.discountName)} className="min-h-11" />
                      </Field>
                      <Field label="Oran (%)" htmlFor="discountPercent" error={errors.discountPercent}>
                        <Input id="discountPercent" inputMode="numeric" value={values.discountPercent ?? ""} onChange={set("discountPercent")} placeholder="20" invalid={Boolean(errors.discountPercent)} className="min-h-11" />
                      </Field>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>
        ) : null}

        {!editing && items.length ? (
          <Panel id="kit-panel" title="Forma ve eşofman" description="Forma zorunlu, eşofman isteğe bağlı. Durumuna bir kez dokunun.">
            <div className="grid gap-4">
              {items.map((item) => {
                const k = kitOf(item.id);
                const required = isRequiredItem(item);
                const missing = kitError && kitIncomplete(item);
                return (
                  <div key={item.id} className={["grid gap-3 rounded-xl border p-3", missing ? "border-red-300 bg-red-50/40" : "border-line"].join(" ")}>
                    <p className="flex flex-wrap items-baseline justify-between gap-2 text-[15px] font-semibold text-ink">
                      <span>
                        {item.name} <span className="text-xs font-normal text-muted">{required ? "zorunlu" : "isteğe bağlı"}</span>
                      </span>
                      <span className="text-sm font-normal text-muted">{item.priceKurus > 0 ? formatMoney(item.priceKurus) : "fiyat girilmemiş"}</span>
                    </p>
                    {/* Tek dokunuş: parası × teslim (4 durum); eşofmanda ayrıca "İstemiyor" */}
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={`${item.name} durumu`}>
                      {!required ? (
                        <Choice on={!k.want} onClick={() => setKitOf(item.id, { want: false, paid: null, delivery: "", owned: false })} className="col-span-2">
                          <span className="font-semibold">İstemiyor</span>
                        </Choice>
                      ) : null}
                      {KIT_STATES.map((st) => (
                        <Choice key={st.key} on={k.want && !k.owned && k.paid === st.paid && k.delivery === st.delivery} onClick={() => setKitOf(item.id, { want: true, owned: false, paid: st.paid, delivery: st.delivery })}>
                          <span className="block font-semibold">{st.delivery === "delivered" ? "Teslim aldı" : "Sipariş verilecek"}</span>
                          <span className={["block text-xs font-medium", st.paid ? "text-emerald-700" : "text-amber-800"].join(" ")}>{st.paid ? "Parası verildi" : "Parası verilmedi"}</span>
                        </Choice>
                      ))}
                      <Choice on={k.want && Boolean(k.owned)} onClick={() => setKitOf(item.id, { want: true, owned: true, paid: true, delivery: "delivered" })} className="col-span-2">
                        <span className="block font-semibold">Zaten var</span>
                        <span className="block text-xs font-medium opacity-75">Kendisinde vardı (eski sezon, kardeşten); ücret alınmaz, sipariş verilmez</span>
                      </Choice>
                    </div>
                    {k.want ? <SizePicker id={`size-${item.id}`} kind="shirt" legend={hasSocks(item.name) ? "Forma-şort bedeni" : "Beden"} value={k.size} onChange={(v) => setKitOf(item.id, { size: v })} /> : null}
                    {k.want && hasSocks(item.name) ? (
                      <div className="grid gap-3 rounded-xl bg-surface/70 p-3">
                        <SizePicker id={`sock-${item.id}`} kind="sock" legend="Tozluk numarası" value={k.sockSize} onChange={(v) => setKitOf(item.id, { sockSize: v })} />
                        <fieldset>
                          <legend className="mb-1.5 text-sm font-semibold text-ink">Tozluk</legend>
                          <div className="grid grid-cols-3 gap-2">
                            {SOCK_CHOICES.map(([d, label]) => (
                              <Choice key={d} on={sockOf(k) === d} onClick={() => setKitOf(item.id, { sockDelivery: d })}>
                                <span className="text-sm font-semibold">{label}</span>
                              </Choice>
                            ))}
                          </div>
                        </fieldset>
                      </div>
                    ) : null}
                    {missing ? <p className="text-sm font-medium text-red-700">{item.name} için durumu seçin.</p> : null}
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}

        {askConsents ? (
          <Panel title="Veli onayları" description="Veli kâğıt kayıt formunu imzaladıysa işaretleyin; öğrenci dosyasındaki Onaylar'a yazılır. Sonra dosyadan da girilebilir.">
            <div className="grid gap-4">
              {consentTexts.required.length ? (
                <Choice on={consents.signed} onClick={() => setConsents((c) => ({ ...c, signed: !c.signed }))} className="px-4 text-left">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${consents.signed ? "border-gs-red bg-gs-red text-white" : "border-control bg-white"}`} aria-hidden="true">
                      {consents.signed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                    </span>
                    Kâğıt kayıt formunu imzaladı
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{consentTexts.required.join(", ")}</span>
                </Choice>
              ) : null}
              {consentTexts.photo ? (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-ink">Fotoğraf izni (kart ve yoklama için)</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["yes", "Verdi"],
                        ["no", "Vermedi"],
                        ["", "Sorulmadı"],
                      ] as const
                    ).map(([v, label]) => (
                      <Choice key={label} on={consents.photo === v} onClick={() => setConsents((c) => ({ ...c, photo: v }))}>
                        <span className="font-semibold">{label}</span>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
              ) : null}
            </div>
          </Panel>
        ) : null}

        {/* Seyrek doldurulanlar katlı: boy/kilo (sonra Gelişim'den de girilir) ve not */}
        <details className="group rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(28_23_21/0.04)]" open={editing || Boolean(values.heightCm || values.weightKg || note)}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block text-[15px] font-semibold text-ink">{editing ? "Boy ve kilo" : "Boy, kilo ve not"}</span>
              <span className="block text-sm text-muted">İsteğe bağlı{editing ? "" : "; boy ve kilo sonra Gelişim'den de girilebilir"}</span>
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-4 border-t border-line px-4 py-4 sm:px-5">
            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
              <Field label="Boy (cm)" htmlFor="heightCm" error={errors.heightCm}>
                <Input id="heightCm" inputMode="numeric" value={values.heightCm} onChange={set("heightCm")} invalid={Boolean(errors.heightCm)} placeholder="128" className="min-h-11" />
              </Field>
              <Field label="Kilo (kg)" htmlFor="weightKg" error={errors.weightKg}>
                <Input id="weightKg" inputMode="decimal" value={values.weightKg} onChange={set("weightKg")} invalid={Boolean(errors.weightKg)} placeholder="27,5" className="min-h-11" />
              </Field>
            </div>
            {!editing ? (
              <Field label="Not" htmlFor="enroll-note" hint="Öğrenci dosyasındaki notlara eklenir.">
                <Textarea id="enroll-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} placeholder="Ör. kardeşi de gelecek dönem başlayacak" className="min-h-16 py-2 text-[15px]" />
              </Field>
            ) : null}
          </div>
        </details>

        <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(28_23_21/0.04)] sm:p-5">
          <ul className="mb-4 grid gap-1.5 text-sm text-ink">
            <Summary ok={Boolean(group)}>
              {group ? `${group.name} grubuna` : "Grup seçilmedi"}
              {values.isGoalkeeper ? " · kaleci" : ""}
            </Summary>
            <Summary ok>{formatDayLongTr(values.enrolledOn)} tarihinde kayıt</Summary>
            {canBill && billing.feeKurus > 0 ? (
              <>
                <Summary ok={Boolean(values.firstPayment)}>
                  {values.firstPayment
                    ? `Aidat ${formatMoney(packFee)} ${values.firstPayment === "cash" ? "nakit" : "havale ile"} alındı → 8 antrenman hakkı${renewal ? `, yenileme ${formatDayLongTr(renewal)}` : ""}`
                    : `Aidat henüz verilmedi (${formatMoney(packFee)})${values.promiseOn ? ` · ${dayLabelAt(values.promiseOn)} ödeyecek` : firstSession ? ` · ilk antrenman ${formatDayLongTr(firstSession)}` : ""}`}
                  {values.discountOn && values.discountName ? ` · ${values.discountName} %${values.discountPercent || "?"}` : ""}
                </Summary>
              </>
            ) : null}
            {askConsents ? (
              <Summary ok={consents.signed || consents.photo !== ""}>
                {[consents.signed ? "Kayıt formu imzalı" : "Onaylar işaretlenmedi (sonra dosyadan)", consents.photo === "yes" ? "fotoğraf izni var" : consents.photo === "no" ? "fotoğraf izni yok" : null].filter(Boolean).join(" · ")}
              </Summary>
            ) : null}
            {chosenKit.map((i) => {
              const k = kitOf(i.id);
              return (
                <Summary key={i.id} ok={!kitIncomplete(i)}>
                  {i.name}: {k.owned ? "zaten var, ücret yok" : k.paid === null || !k.delivery ? "durumu seçilmedi" : `${DELIVERY_CHOICES.find(([v]) => v === k.delivery)?.[1].toLocaleLowerCase("tr-TR")}, ${k.paid ? "parası verildi" : "parası verilmedi"}`}
                </Summary>
              );
            })}
          </ul>
        </div>

        {/* Kaydırırken hep görünür: bugün alınan tutar ve tamamla (telefonda alt menünün üstünde) */}
        <div className="no-print sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 -mx-4 flex items-center gap-3 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border lg:bottom-4">
          {!editing ? (
            <p className="min-w-0 flex-1 text-sm leading-tight text-muted">
              {collectedToday > 0 ? (
                <>
                  {values.enrolledOn < today ? `${dayLabel(values.enrolledOn, false)} alınan` : "Bugün alınan"}
                  <span className="block text-lg font-bold tabular-nums text-ink">{formatMoney(collectedToday)}</span>
                </>
              ) : (
                "Ödeme alınmıyor"
              )}
            </p>
          ) : (
            <Link href={`/admin/kayit/${reg.id}`} className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 font-semibold text-muted hover:bg-surface hover:text-ink">
              Vazgeç
            </Link>
          )}
          <Button type="submit" loading={pending} className="ml-auto min-w-44 sm:min-w-56">
            <Check className="h-5 w-5" aria-hidden="true" />
            {editing ? "Kaydet" : "Kaydı tamamla"}
          </Button>
        </div>
      </form>
    </Page>
  );
}

function Summary({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${ok ? "bg-emerald-600 text-white" : "bg-stone-200 text-stone-500"}`} aria-hidden="true">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function Success({ reg, done, group, welcome }: { reg: RegistrationDto; done: Done; group: AgeGroupView | null; welcome: WelcomeInfo }) {
  const link = "flex min-h-14 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-[15px] font-semibold text-ink transition hover:border-gray-400 hover:bg-surface active:scale-[0.99] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-muted";
  return (
    <Page width="narrow">
      <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-[0_1px_2px_rgb(28_23_21/0.04)] sm:p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <Check className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Kayıt tamamlandı</h1>
        <p className="mt-1 text-[15px] text-muted">
          <span className="font-semibold text-ink">{reg.studentFullName}</span>
          {group ? ` · ${group.name}` : ""}
        </p>
        {done.studentNo ? (
          <p className="mt-4 inline-flex items-baseline gap-2 rounded-xl bg-surface px-4 py-2">
            <span className="text-sm text-muted">Öğrenci no</span>
            <span className="text-2xl font-bold tabular-nums text-ink">{done.studentNo}</span>
          </p>
        ) : null}
      </div>
      <p className="mb-2 mt-6 text-sm font-semibold text-ink">Sıradaki adımlar</p>
      <div className="grid gap-2">
        {reg.contact.phone ? (
          <a href={whatsappLink(reg.contact.phone, welcomeMessage(welcome))} target="_blank" rel="noopener noreferrer" className={link}>
            <MessageCircle className="!text-emerald-600" aria-hidden="true" />
            <span>
              Veliye hoş geldin mesajı gönder
              <span className="block text-sm font-normal text-muted">Grup, antrenman günleri, ilk antrenman, yol tarifi, aidat ve forma</span>
            </span>
          </a>
        ) : null}
        {reg.missing.length ? (
          <Link href={`/admin/kayit/${reg.id}/duzenle`} className={link}>
            <CircleAlert className="!text-amber-600" aria-hidden="true" />
            <span>
              Eksik bilgileri tamamla
              <span className="block text-sm font-normal text-muted">Veli buradayken: {reg.missing.join(", ")}</span>
            </span>
          </Link>
        ) : null}
        {done.paymentId ? (
          <a href={`/admin/aidat/makbuz/${done.paymentId}`} target="_blank" rel="noopener" className={link}>
            <Printer aria-hidden="true" /> İlk aidat makbuzunu yazdır
          </a>
        ) : null}
        <a href={`/admin/kartlar/baski?ids=${reg.id}`} target="_blank" rel="noopener" className={link}>
          <IdCard aria-hidden="true" /> Öğrenci kartını yazdır
        </a>
        <Link href={`/admin/kayit/${reg.id}`} className={`${link} border-gs-red/30 text-gs-red [&>svg]:!text-gs-red`}>
          <FolderOpen aria-hidden="true" /> Öğrenci dosyasına git
        </Link>
      </div>
    </Page>
  );
}
