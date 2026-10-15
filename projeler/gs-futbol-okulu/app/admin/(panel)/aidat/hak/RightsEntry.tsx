"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { EmptyState, Page, PageHeader, Panel } from "@/components/admin/kit";
import { useToast } from "@/components/admin/Toast";
import { Button } from "@/components/ui";
import { dayLabel, SESSIONS_PER_PACK, type Access } from "@/lib/billing-shared";
import { accessLine, PayPill, PaymentDialog, type PayTarget } from "../BillingParts";
import { setSessionsLeftAction } from "../actions";

export type RightsStudent = {
  id: number;
  name: string;
  studentNo: number | null;
  parentName: string;
  phone: string;
  feeKurus: number;
  access: Access;
  /** Ödenmiş aidatı var (yoksa önce aidat alınır). */
  hasPaid: boolean;
  /** Peşin ödenmiş aidat sayısı: kalan hak en az 8 × bu kadar. */
  ahead: number;
  lastPaidOn: string | null;
};

type Props = {
  today: string;
  groups: { id: number; name: string; count: number }[];
  groupId: number | null;
  students: RightsStudent[];
  /** Grubun henüz yapılmamış antrenman günleri (bugün biten düşülmüş). */
  upcoming: string[];
  canCollect: boolean;
  canOpenFile: boolean;
  /** Öğrenci dosyasından gelindiyse o satır gösterilir. */
  focusId?: number | null;
};

const SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const shortDay = (day: string) => `${SHORT[(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7]} ${dayLabel(day, false)}`;

/** Sistemdeki kalan hak (ödemesi yoksa null). */
const currentLeft = (s: RightsStudent): number | null => (!s.hasPaid ? null : s.access.state === "paid" ? (s.access.sessionsLeft ?? 0) : 0);

export function RightsEntry({ today, groups, groupId, students, upcoming, canCollect, canOpenFile, focusId }: Props) {
  const [values, setValues] = useState<Record<number, number>>({});
  const [saved, setSaved] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [payFor, setPayFor] = useState<RightsStudent | null>(null);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (focusId) document.getElementById(`hak-${focusId}`)?.scrollIntoView({ block: "center" });
  }, [focusId]);

  const valueOf = (s: RightsStudent) => values[s.id] ?? currentLeft(s) ?? 0;
  const dirty = students.filter((s) => s.hasPaid && values[s.id] !== undefined && values[s.id] !== currentLeft(s));
  const set = (s: RightsStudent, v: number) => {
    const min = s.ahead * SESSIONS_PER_PACK;
    const max = (s.ahead + 1) * SESSIONS_PER_PACK;
    setValues((m) => ({ ...m, [s.id]: Math.min(max, Math.max(min, v)) }));
    setSaved((m) => ({ ...m, [s.id]: "" }));
    setErrors((m) => ({ ...m, [s.id]: "" }));
  };

  const save = (list: RightsStudent[]) =>
    startTransition(async () => {
      let ok = 0;
      for (const s of list) {
        const res = await setSessionsLeftAction(s.id, valueOf(s));
        if (res.ok) {
          ok++;
          setSaved((m) => ({ ...m, [s.id]: res.paidUntil ? `Kaydedildi · sonraki ödeme ${dayLabel(res.paidUntil, false)}` : "Kaydedildi" }));
          setValues((m) => {
            const next = { ...m };
            delete next[s.id];
            return next;
          });
        } else setErrors((m) => ({ ...m, [s.id]: res.error }));
      }
      router.refresh();
      if (list.length > 1) toast({ text: ok === list.length ? `${ok} öğrencinin hakkı kaydedildi.` : `${ok} / ${list.length} kaydedildi; hatalı olanlara bakın.` });
    });

  const group = groups.find((g) => g.id === groupId);
  const noProgram = !upcoming.length;

  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: "/admin/aidat", label: "Aidat" }}
        title="Hak girişi"
        description="Kağıttaki listeye bakarak her öğrencinin kalan antrenman hakkını girin. Ödeme ve makbuzlar değişmez; yalnız sonraki ödeme günü kayar."
      />

      <div className="mb-4 rounded-2xl bg-stone-50 px-4 py-3 text-[15px] text-ink ring-1 ring-inset ring-line">
        <p>
          <span className="font-semibold">Hak, antrenman günü gelince düşer;</span> öğrenci gelmese de. Bugünkü antrenman bittiyse sayılmaz.
        </p>
        <p className="mt-1.5 text-sm text-muted">Kağıttaki sayıyı girdikten sonra geçmişte yapılmayan antrenmanları ayrıca iptal etmeyin; sayı zaten onlara göre. Bundan sonra yapılmayan antrenmanı aynı gün iptal edin.</p>
        {upcoming.length ? (
          <p className="mt-1.5 text-sm text-muted">
            {group?.name ?? "Bu grubun"} sıradaki antrenmanları: {upcoming.slice(0, 5).map(shortDay).join(" · ")}
          </p>
        ) : null}
      </div>

      {/* Grup seçimi */}
      <nav aria-label="Grup" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {groups.map((g) => {
          const on = g.id === groupId;
          return (
            <Link
              key={g.id}
              href={`/admin/aidat/hak?grup=${g.id}`}
              replace
              aria-current={on ? "page" : undefined}
              className={[
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-[15px] font-semibold transition",
                on ? "bg-ink text-white" : "bg-white text-ink ring-1 ring-inset ring-line hover:bg-stone-50",
              ].join(" ")}
            >
              {g.name}
              <span className={["rounded-full px-1.5 text-xs tabular-nums", on ? "bg-white/20" : "bg-stone-100 text-stone-600"].join(" ")}>{g.count}</span>
            </Link>
          );
        })}
      </nav>

      {noProgram && students.length ? (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-inset ring-amber-600/25">
          Bu grubun antrenman programı yok; haklar hafta sonuna göre sayılıyor. Önce grubun antrenman günlerini girin.
        </p>
      ) : null}

      {students.length === 0 ? (
        <Panel>
          <EmptyState title="Bu grupta kayıtlı öğrenci yok" />
        </Panel>
      ) : (
        <ul className="grid gap-3">
          {students.map((s) => (
            <Row
              key={s.id}
              s={s}
              today={today}
              value={valueOf(s)}
              upcoming={upcoming}
              isDirty={dirty.includes(s)}
              focused={s.id === focusId}
              saved={saved[s.id] ?? ""}
              error={errors[s.id] ?? ""}
              busy={busy}
              canCollect={canCollect}
              canOpenFile={canOpenFile}
              onChange={(v) => set(s, v)}
              onSave={() => save([s])}
              onReset={() => set(s, currentLeft(s) ?? 0)}
              onPay={() => setPayFor(s)}
            />
          ))}
        </ul>
      )}

      {dirty.length ? (
        <div className="no-print sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg lg:bottom-4">
          <p className="min-w-0 flex-1 text-[15px] font-semibold text-ink">{dirty.length} öğrencide değişiklik var</p>
          <Button type="button" size="md" onClick={() => save(dirty)} loading={busy}>
            Hepsini kaydet
          </Button>
        </div>
      ) : null}

      {payFor ? (
        <PaymentDialog
          student={{ id: payFor.id, name: payFor.name, parentName: payFor.parentName, phone: payFor.phone, feeKurus: payFor.feeKurus, access: payFor.access } satisfies PayTarget}
          today={today}
          onClose={() => setPayFor(null)}
          onDone={() => router.refresh()}
        />
      ) : null}
    </Page>
  );
}

function Row(p: {
  s: RightsStudent;
  today: string;
  value: number;
  upcoming: string[];
  isDirty: boolean;
  focused: boolean;
  saved: string;
  error: string;
  busy: boolean;
  canCollect: boolean;
  canOpenFile: boolean;
  onChange: (v: number) => void;
  onSave: () => void;
  onReset: () => void;
  onPay: () => void;
}) {
  const { s, value, upcoming } = p;
  const min = s.ahead * SESSIONS_PER_PACK;
  const max = (s.ahead + 1) * SESSIONS_PER_PACK;
  const next = upcoming[0];
  const last = value > 0 ? upcoming[value - 1] : undefined;
  const renew = upcoming[value];
  const preview =
    value === 0 ? (next ? `Hakkı bitti · ${shortDay(next)} antrenmanı için aidat gerekir` : "Hakkı bitti") : last && renew ? `Son antrenmanı ${shortDay(last)} · sonraki ödeme ${dayLabel(renew, false)}` : null;
  const name = p.canOpenFile ? (
    <Link href={`/admin/kayit/${s.id}#aidat`} className="hover:text-gs-red hover:underline">
      {s.name}
    </Link>
  ) : (
    s.name
  );

  return (
    <li id={`hak-${s.id}`} className={["scroll-mt-24 rounded-2xl bg-white p-4 shadow-xs ring-inset", p.isDirty || p.focused ? "ring-2 ring-gs-red/50" : "ring-1 ring-line"].join(" ")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-snug text-ink">{name}</p>
          <p className="text-sm text-muted">
            {s.studentNo ? `No ${s.studentNo}` : "Numara yok"}
            {s.lastPaidOn ? ` · son ödeme ${dayLabel(s.lastPaidOn, false)}` : ""}
          </p>
        </div>
        <PayPill access={s.access} today={p.today} />
      </div>

      {s.hasPaid ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-[15px] font-semibold text-ink">Kalan antrenman</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`${s.name}: bir azalt`}
                disabled={value <= min || p.busy}
                onClick={() => p.onChange(value - 1)}
                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl bg-stone-100 text-ink transition hover:bg-stone-200 disabled:cursor-default disabled:opacity-40"
              >
                <Minus className="h-5 w-5" aria-hidden="true" />
              </button>
              <input
                aria-label={`${s.name}: kalan antrenman`}
                inputMode="numeric"
                value={String(value)}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/\D/g, ""));
                  if (Number.isFinite(n)) p.onChange(n);
                }}
                onFocus={(e) => e.target.select()}
                className="h-12 w-16 rounded-xl border border-control bg-white text-center text-2xl font-bold tabular-nums text-ink outline-none focus:border-gs-red focus:ring-2 focus:ring-gs-red/20"
              />
              <button
                type="button"
                aria-label={`${s.name}: bir artır`}
                disabled={value >= max || p.busy}
                onClick={() => p.onChange(value + 1)}
                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl bg-stone-100 text-ink transition hover:bg-stone-200 disabled:cursor-default disabled:opacity-40"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {p.isDirty ? (
              <div className="flex items-center gap-2">
                <Button type="button" size="md" onClick={p.onSave} loading={p.busy}>
                  Kaydet
                </Button>
                <button type="button" onClick={p.onReset} disabled={p.busy} className="min-h-11 cursor-pointer rounded-lg px-2 text-sm font-semibold text-muted hover:text-ink">
                  Geri al
                </button>
              </div>
            ) : null}
          </div>
          {p.error ? (
            <p className="mt-2 text-sm font-semibold text-red-700">{p.error}</p>
          ) : p.saved && !p.isDirty ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <Check className="h-4 w-4" aria-hidden="true" /> {p.saved}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">{p.isDirty ? (preview ?? "") : accessLine(s.access, p.today)}</p>
          )}
          {s.ahead ? <p className="mt-1 text-xs text-muted">Peşin ödenmiş {s.ahead} aidatı var; kalan hak {min}–{max} arası olabilir.</p> : null}
        </>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-sm text-muted">Ödemesi girilmemiş. Aidatını aldıysanız önce ödemeyi girin, sonra kalan hakkı burada düzeltin.</p>
          {p.canCollect ? (
            <Button type="button" size="md" variant="secondary" onClick={p.onPay}>
              Aidat al
            </Button>
          ) : null}
        </div>
      )}
    </li>
  );
}
