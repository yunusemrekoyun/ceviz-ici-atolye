"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { ChevronRight, CornerDownRight, FileSpreadsheet, FileText, Plus, Search, X } from "lucide-react";
import { EmptyState, FilterTabs, KeeperBadge } from "@/components/admin/kit";
import { SizePicker } from "@/components/admin/SizePicker";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { formatMoney, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, parseMoney, type PaymentMethod } from "@/lib/billing-shared";
import type { EquipmentItem } from "@/lib/db/schema";
import type { OrderRow } from "@/lib/equipment";
import { defaultSockDelivery, DELIVERY_LABEL, hasSocks, isFormaItem, kitTables, KIT_STAGES, shirtLabel, sizeMissing, socksOpen, type Delivery, type KitStage, type KitTable } from "@/lib/equipment-shared";
import { normalizeForSearch } from "@/lib/search";
import { useRememberList, useUrlFilters } from "@/lib/use-url-filters";
import { deleteOrderAction, markOrderedAction, saveItemAction, saveOrderAction, setItemActiveAction } from "./actions";
import { Choice, DayChoice } from "../aidat/BillingParts";

export type EquipmentStudent = { id: number; name: string; studentNo: number | null; group: string | null; groupId?: number | null; isGoalkeeper?: boolean };
type Student = EquipmentStudent;
type Filter = "all" | "sizes" | "unpaid" | "to_order" | "not_delivered" | "socks" | "none";
type Tab = "students" | "sizes" | "items";
type Props = {
  students: Student[];
  orders: OrderRow[];
  items: EquipmentItem[];
  groups: { id: number; name: string }[];
  canEdit: boolean;
  initialStage?: KitStage;
};

export { DELIVERY_LABEL };
export const DELIVERY_STYLE: Record<Delivery, string> = {
  waiting: "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-500/15",
  to_order: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25",
  ordered: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20",
  delivered: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20",
};

const FILTERS: [Filter, string][] = [
  ["all", "Tümü"],
  ["sizes", "Bedeni eksik"],
  ["unpaid", "Parası alınmadı"],
  ["to_order", "Sipariş verilecek"],
  ["not_delivered", "Teslim edilmedi"],
  ["socks", "Tozluk verilmedi"],
  ["none", "Forması girilmedi"],
];

/** Adresteki durum anahtarı ↔ süzgeç (?durum=odemedi). */
const FILTER_PARAM: Record<Filter, string> = { all: "", sizes: "beden", unpaid: "odemedi", to_order: "siparis", not_delivered: "teslim", socks: "tozluk", none: "formasiz" };
const PARAM_FILTER = Object.fromEntries(Object.entries(FILTER_PARAM).map(([f, p]) => [p, f])) as Record<string, Filter>;

export function EquipmentManager({ students, orders, items, groups, canEdit, initialStage = "to_order" }: Props) {
  // Süzgeçler adreste: öğrenci dosyasından geri gelince aynı liste
  useRememberList();
  const { values: u, set, reset, changed } = useUrlFilters({ sekme: "", durum: "", grup: "", q: "" }, { typed: ["q"] });
  const tab: Tab = u.sekme === "bedenler" || u.sekme === "siparis" ? "sizes" : u.sekme === "urunler" ? "items" : "students";
  const setTab = (t: Tab) => set({ sekme: t === "sizes" ? "bedenler" : t === "items" ? "urunler" : "" });
  const filter: Filter = PARAM_FILTER[u.durum] ?? "all";
  const setFilter = (f: Filter) => set({ durum: FILTER_PARAM[f] });
  const groupId = u.grup;
  const setGroupId = (g: string) => set({ grup: g });
  const query = u.q;
  const setQuery = (q: string) => set({ q });
  const [edit, setEdit] = useState<{ student: Student; order: OrderRow | null } | null>(null);
  const step = useOrderStep();
  const byStudent = useMemo(() => {
    const m = new Map<number, OrderRow[]>();
    // Önce forma, sonra diğer malzemeler
    for (const o of [...orders].sort((a, b) => Number(isFormaItem(b.itemName)) - Number(isFormaItem(a.itemName)) || a.itemId - b.itemId)) m.set(o.registrationId, [...(m.get(o.registrationId) ?? []), o]);
    return m;
  }, [orders]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const matches = (s: Student, f: Filter) => {
    const os = byStudent.get(s.id) ?? [];
    if (f === "sizes") return os.some(sizeMissing);
    if (f === "unpaid") return os.some((o) => !o.paid);
    if (f === "to_order") return os.some((o) => o.delivery === "to_order" || o.sockDelivery === "to_order");
    if (f === "not_delivered") return os.some((o) => o.delivery !== "delivered");
    if (f === "socks") return os.some(socksOpen);
    if (f === "none") return !os.some((o) => isFormaItem(o.itemName));
    return true;
  };
  const q = normalizeForSearch(query);
  const inGroup = (s: Student) => !groupId || String(s.groupId ?? "") === groupId;
  const scoped = students.filter(inGroup);
  const visible = scoped.filter((s) => matches(s, filter) && (!q || normalizeForSearch(s.name).includes(q) || String(s.studentNo ?? "") === query.trim()));
  const count = (f: Filter) => scoped.filter((s) => matches(s, f)).length;
  const sections = [
    ...groups.map((g) => ({ key: String(g.id), name: g.name, list: visible.filter((s) => s.groupId === g.id) })),
    { key: "none", name: "Grupsuz", list: visible.filter((s) => !s.groupId || !groups.some((g) => g.id === s.groupId)) },
  ].filter((sec) => sec.list.length > 0);

  const enrolledOrders = orders.filter((o) => studentById.has(o.registrationId));
  const unpaidTotal = enrolledOrders.filter((o) => !o.paid).reduce((s, o) => s + o.priceKurus, 0);
  const openEdit = (o: OrderRow) => {
    const s = studentById.get(o.registrationId);
    if (s) setEdit({ student: s, order: o });
  };
  const show = (f: Filter) => set({ sekme: "", durum: FILTER_PARAM[f] });

  return (
    <div className="mt-5">
      {/* Telefonda sayılar süzgeçlerde; kutular yalnız geniş ekranda. Dokununca listeyi açar. */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-5">
        <Stat label="Bedeni eksik" value={String(count("sizes"))} tone={count("sizes") ? "warn" : undefined} onClick={() => show("sizes")} />
        <Stat label="Sipariş verilecek" value={String(count("to_order"))} onClick={() => show("to_order")} />
        <Stat label="Forması teslim edilmedi" value={String(count("not_delivered"))} onClick={() => show("not_delivered")} />
        <Stat label="Tozluğu verilmedi" value={String(count("socks"))} onClick={() => show("socks")} />
        <Stat label="Ödenmemiş" value={formatMoney(unpaidTotal)} tone={unpaidTotal ? "warn" : undefined} onClick={() => show("unpaid")} />
      </div>

      <div className="mt-5 flex gap-1 rounded-xl bg-surface p-1" role="tablist">
        {(
          [
            ["students", "Öğrenciler"],
            ["sizes", "Bedenler"],
            ["items", "Ürünler"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={["min-h-11 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold", tab === k ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"].join(" ")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "students" ? (
        <section className="mt-4">
          <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-20 -mx-4 flex flex-col gap-2 bg-surface/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1 lg:max-w-72">
                <span className="sr-only">Öğrenci ara</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Öğrenci adı ya da no" className="h-11 w-full rounded-xl border border-control bg-white pl-9 pr-3 text-[16px] shadow-xs outline-none placeholder:text-stone-500 focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10 lg:h-10 lg:text-[15px]" />
              </label>
              <label className="w-36 shrink-0 sm:w-44">
                <span className="sr-only">Grup</span>
                <Select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="h-11 lg:h-10">
                  <option value="">Tüm gruplar</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </label>
              {changed(["sekme"]) > 0 ? (
                <button type="button" onClick={() => reset(["sekme"])} aria-label="Filtreleri sıfırla" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-[15px] font-semibold text-gs-red hover:bg-gs-red-soft lg:min-h-10">
                  <X className="h-4 w-4" aria-hidden="true" />
                  <span className="max-sm:sr-only">Filtreleri sıfırla</span>
                </button>
              ) : null}
            </div>
            <FilterTabs<Filter> value={filter} onChange={setFilter} label="Duruma göre" options={FILTERS.map(([k, label]) => ({ value: k, label, count: count(k) }))} />
          </div>

          {sections.map((sec) => (
            <div key={sec.key} className="mt-5">
              <h2 className="mb-2 flex items-baseline gap-2 px-1 text-[15px] font-bold text-ink">
                {sec.name}
                <span className="text-sm font-normal text-muted">{sec.list.length} öğrenci</span>
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                {sec.list.map((s) => {
                  const os = byStudent.get(s.id) ?? [];
                  return (
                    <li key={s.id} className="grid gap-2 px-3 py-3 sm:px-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-5">
                      <div className="flex items-start justify-between gap-2 lg:flex-col lg:justify-start">
                        <div className="min-w-0">
                          <p className="font-bold text-ink">{s.name}</p>
                          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
                            No {s.studentNo ?? "—"}
                            {s.isGoalkeeper ? <KeeperBadge /> : null}
                          </p>
                        </div>
                        {canEdit ? (
                          <button type="button" onClick={() => setEdit({ student: s, order: null })} className="-mr-1 inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-11 lg:-ml-2 lg:mr-0">
                            <Plus className="h-4 w-4" aria-hidden="true" /> Malzeme
                          </button>
                        ) : null}
                      </div>
                      <div className="grid gap-1.5">
                        {!os.some((o) => isFormaItem(o.itemName)) ? <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-sm font-medium text-amber-800">Forması girilmedi (zorunlu).</p> : null}
                        <KitLines orders={os} canEdit={canEdit} onEdit={(o) => setEdit({ student: s, order: o })} step={step} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {visible.length === 0 ? <p className="mt-8 text-center text-muted">Bu süzgeçte öğrenci yok.</p> : null}
        </section>
      ) : tab === "sizes" ? (
        <SizeBoard orders={enrolledOrders} canEdit={canEdit} onEdit={openEdit} initialStage={initialStage} />
      ) : (
        <Items items={items} canEdit={canEdit} />
      )}

      {edit ? <OrderDialog student={edit.student} order={edit.order} items={items.filter((i) => i.active || i.id === edit.order?.itemId)} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function Stat({ label, value, tone, onClick }: { label: string; value: string; tone?: "warn"; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={["cursor-pointer rounded-2xl border p-4 text-left transition hover:shadow-sm", tone === "warn" ? "border-amber-200 bg-amber-50 hover:border-amber-300" : "border-line bg-white hover:border-gray-300"].join(" ")}>
      <p className="text-xl font-bold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </button>
  );
}

/* ---------------- Satırlar ---------------- */

type StepPatch = { paid?: boolean; delivery?: Delivery; sockDelivery?: Delivery };
type Step = { label: string; done: string; patch: StepPatch };

const kitWord = (name: string) => (isFormaItem(name) ? "forma" : name.toLocaleLowerCase("tr-TR"));

/** Kaydın sıradaki adımı: önce para, sonra sipariş, sonra teslim (tek dokunuş, "Geri al"lı). */
export function nextStep(o: OrderRow): Step | null {
  if (o.owned) return null;
  const w = kitWord(o.itemName);
  if (!o.paid) return { label: "Parası alındı", done: `${w} parası alındı`, patch: { paid: true } };
  if (o.delivery === "to_order") return { label: "Sipariş verildi", done: `${w} sipariş verildi`, patch: { delivery: "ordered" } };
  if (o.delivery === "ordered" || o.delivery === "waiting") return { label: "Teslim edildi", done: `${w} teslim edildi`, patch: { delivery: "delivered" } };
  return null;
}

/** Tozluğun sıradaki adımı (formadan ayrı teslim edilir). */
export function sockStep(o: OrderRow): Step | null {
  if (o.sockDelivery === "to_order") return { label: "Sipariş verildi", done: "tozluk sipariş verildi", patch: { sockDelivery: "ordered" } };
  if (o.sockDelivery === "ordered" || o.sockDelivery === "waiting") return { label: "Teslim edildi", done: "tozluk teslim edildi", patch: { sockDelivery: "delivered" } };
  return null;
}

function orderInput(o: OrderRow) {
  return {
    itemId: o.itemId,
    size: o.size ?? "",
    sockSize: o.sockSize ?? "",
    sockDelivery: (o.sockDelivery ?? undefined) as Delivery | undefined,
    priceKurus: o.priceKurus,
    paid: o.paid,
    owned: o.owned,
    delivery: o.delivery as Delivery,
    note: o.note ?? "",
  };
}

export function useOrderStep() {
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const run = (o: OrderRow, step: Step) =>
    startTransition(async () => {
      const before = orderInput(o);
      const res = await saveOrderAction(o.id, o.registrationId, { ...before, ...step.patch });
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({
        text: `${o.studentName}: ${step.done}.`,
        action: {
          label: "Geri al",
          onClick: () =>
            startTransition(async () => {
              const undo = await saveOrderAction(o.id, o.registrationId, before);
              toast(undo.ok ? { text: "Geri alındı." } : { kind: "error", text: undo.error });
              router.refresh();
            }),
        },
      });
      router.refresh();
    });
  return { busy, run };
}

/** Öğrencinin malzemeleri: her biri bir satır (ad, beden, ödeme, teslim, sıradaki adım); tozluk formanın altında ayrı satır. */
export function KitLines({ orders, canEdit, onEdit, step }: { orders: OrderRow[]; canEdit: boolean; onEdit: (o: OrderRow) => void; step: ReturnType<typeof useOrderStep> }) {
  if (orders.length === 0) return null;
  return (
    <ul className="grid gap-1.5">
      {orders.map((o) => (
        <li key={o.id} className="grid gap-1">
          <KitLine label={isFormaItem(o.itemName) ? "Forma" : o.itemName} title={o.itemName} size={shirtLabel(o.size)} missing={!o.size && o.delivery !== "delivered" ? "Beden yok" : null} canEdit={canEdit} onEdit={() => onEdit(o)} next={nextStep(o)} onStep={(s) => step.run(o, s)} busy={step.busy}>
            {o.owned ? (
              <span className="rounded px-1.5 text-xs font-bold ring-1 ring-inset ring-sky-600/20 bg-sky-50 text-sky-800">Zaten var</span>
            ) : (
              <>
                <span className={["rounded px-1.5 text-xs font-bold", o.paid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"].join(" ")}>{o.paid ? "Ödendi" : `Ödenmedi · ${formatMoney(o.priceKurus)}`}</span>
                <DeliveryPill state={o.delivery} />
              </>
            )}
            {o.note ? <span className="w-full text-xs text-muted">{o.note}</span> : null}
          </KitLine>
          {o.sockDelivery ? (
            <KitLine sub label="Tozluk" size={o.sockSize} missing={!o.sockSize && o.sockDelivery !== "delivered" ? "Numara yok" : null} canEdit={canEdit} onEdit={() => onEdit(o)} next={sockStep(o)} onStep={(s) => step.run(o, s)} busy={step.busy}>
              <DeliveryPill state={o.sockDelivery} />
            </KitLine>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function KitLine({
  label,
  title,
  size,
  missing,
  sub,
  canEdit,
  onEdit,
  next,
  onStep,
  busy,
  children,
}: {
  label: string;
  title?: string;
  size: string | null;
  missing: string | null;
  sub?: boolean;
  canEdit: boolean;
  onEdit: () => void;
  next: Step | null;
  onStep: (s: Step) => void;
  busy: boolean;
  children: ReactNode;
}) {
  return (
    <div className={["flex items-center gap-1 rounded-xl pr-1.5", sub ? "ml-5 bg-surface/60" : "bg-surface"].join(" ")}>
      <button type="button" disabled={!canEdit} onClick={onEdit} title={title} className="flex min-w-0 flex-1 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:cursor-default">
        <span className="inline-flex min-w-16 items-center gap-1 font-semibold text-ink">
          {sub ? <CornerDownRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" /> : null}
          {label}
        </span>
        {size ? (
          <span className="inline-flex min-w-[4.5rem] justify-center rounded-md border border-line bg-white px-1.5 py-0.5 text-[13px] font-bold tabular-nums text-ink">{size}</span>
        ) : missing ? (
          <span className="inline-flex min-w-[4.5rem] justify-center rounded-md border border-dashed border-amber-400 bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800">{missing}</span>
        ) : (
          <span className="inline-flex min-w-[4.5rem] justify-center text-xs text-muted">—</span>
        )}
        {children}
      </button>
      {canEdit && next ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStep(next)}
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-lg border border-control bg-white px-2.5 text-sm font-semibold text-ink shadow-xs transition hover:bg-gray-50 active:scale-[0.97] disabled:opacity-60 pointer-coarse:min-h-11"
        >
          {next.label}
        </button>
      ) : null}
    </div>
  );
}

function DeliveryPill({ state }: { state: string }) {
  return <span className={`rounded px-1.5 text-xs font-bold ${DELIVERY_STYLE[state as Delivery] ?? ""}`}>{DELIVERY_LABEL[state as Delivery] ?? state}</span>;
}

/* ---------------- Çıktı (sipariş için beden tabloları) ---------------- */

const STAGE_PARAM: Record<KitStage, string> = { to_order: "siparis", open: "teslim", all: "tumu" };
const kitOutputHref = (stage: KitStage, bicim: "pdf" | "xlsx", group = "") => `/api/admin/cikti?tur=forma&asama=${STAGE_PARAM[stage]}${group ? `&grup=${group}` : ""}&bicim=${bicim}`;
/* ---------------- Bedenler ---------------- */

/** Beden tablosu: her ürün (forma-şort, tozluk, eşofman) için bedene göre adet; kaleci ayrı. Satıra dokununca kimler olduğu açılır. */
function SizeBoard({ orders, canEdit, onEdit, initialStage }: { orders: OrderRow[]; canEdit: boolean; onEdit: (o: OrderRow) => void; initialStage: KitStage }) {
  const [stage, setStage] = useState<KitStage>(initialStage);
  const tables = kitTables(orders, stage);
  const openSocks = kitTables(orders, "open").find((t) => t.part === "socks")?.total ?? 0;
  const href = (bicim: "pdf" | "xlsx") => kitOutputHref(stage, bicim);
  const link = "inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-control bg-white px-3 text-sm font-semibold text-ink shadow-xs transition hover:bg-gray-50 active:scale-[0.97] pointer-coarse:min-h-11";
  return (
    <section className="mt-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs<KitStage> value={stage} onChange={setStage} label="Hangi kayıtlar" options={KIT_STAGES.map((s) => ({ value: s.key, label: s.label }))} />
        {tables.length ? (
          <div className="flex gap-2">
            <a href={href("pdf")} target="_blank" rel="noopener" className={link}>
              <FileText className="h-4 w-4" aria-hidden="true" /> PDF
            </a>
            <a href={href("xlsx")} download className={link}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> Excel
            </a>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted">{KIT_STAGES.find((s) => s.key === stage)!.hint}</p>
      {stage === "to_order" && openSocks > 0 && !tables.some((t) => t.part === "socks") ? (
        <p className="mt-2 text-sm text-ink">
          Sipariş verilecek tozluk yok; {openSocks} öğrencinin tozluğu henüz verilmedi.{" "}
          <button type="button" onClick={() => setStage("open")} className="cursor-pointer font-semibold text-gs-red underline-offset-2 hover:underline">
            Numaralarını göster
          </button>
        </p>
      ) : null}
      {tables.length === 0 ? (
        <EmptyState title={stage === "to_order" ? "Sipariş verilecek malzeme yok" : "Bu süzgeçte malzeme yok"}>Öğrencilere forma girildikçe bedenler burada toplanır.</EmptyState>
      ) : (
        <div className="mt-3 grid items-start gap-4 lg:grid-cols-2">
          {tables.map((t) => (
            <SizeTable key={t.key} table={t} canEdit={canEdit} onEdit={onEdit} />
          ))}
        </div>
      )}
    </section>
  );
}

function SizeTable({ table: t, canEdit, onEdit }: { table: KitTable<OrderRow>; canEdit: boolean; onEdit: (o: OrderRow) => void }) {
  const [armed, setArmed] = useState(false);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const stateOf = (o: OrderRow) => (t.part === "socks" ? (o.sockDelivery ?? "") : o.delivery);
  const orderable = t.orders.filter((o) => stateOf(o) === "to_order" || stateOf(o) === "waiting");
  const split = t.keepers > 0;
  const cols = split ? "grid-cols-[minmax(0,1fr)_3.75rem_3.75rem_4rem]" : "grid-cols-[minmax(0,1fr)_4rem]";
  const markAll = () => {
    // İki adımlı: ilk dokunuş kaç adet olduğunu sorar, ikincisi işaretler
    if (!armed) {
      setArmed(true);
      window.setTimeout(() => setArmed(false), 5000);
      return;
    }
    startTransition(async () => {
      const res = await markOrderedAction(
        orderable.map((o) => o.id),
        t.part,
      );
      setArmed(false);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({ text: `${t.title}: ${res.count ?? orderable.length} adet sipariş verildi olarak işaretlendi.` });
      router.refresh();
    });
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-2 px-4 pb-3 pt-4">
        <div>
          <h2 className="text-lg font-bold text-ink">{t.title}</h2>
          <p className="text-sm text-muted">
            {t.total} adet{t.keepers ? ` · ${t.keepers} kaleci` : ""}
          </p>
        </div>
        {canEdit && orderable.length ? (
          <Button type="button" size="sm" variant={armed ? "primary" : "secondary"} disabled={busy} onClick={markAll}>
            {armed ? `${orderable.length} adet · Evet, işaretle` : "Hepsi sipariş verildi"}
          </Button>
        ) : null}
      </header>
      {t.missing ? (
        <p className="mx-4 mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {t.missing} öğrencinin {t.part === "socks" ? "tozluk numarası" : "bedeni"} girilmedi. Aşağıda satıra dokunup adına basın, oradan seçin.
        </p>
      ) : null}
      <div className={`grid ${cols} gap-2 border-y border-line bg-surface px-4 py-2 text-xs font-semibold text-muted`}>
        <span>{t.part === "socks" ? "Numara" : "Beden"}</span>
        {split ? (
          <>
            <span className="text-right">Oyuncu</span>
            <span className="text-right">Kaleci</span>
          </>
        ) : null}
        <span className="text-right">{split ? "Toplam" : "Adet"}</span>
      </div>
      <div className="divide-y divide-line">
        {t.rows.map((r) => (
          <details key={r.size ?? "yok"} className="group">
            <summary className={`grid ${cols} min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-2 transition hover:bg-surface/60 [&::-webkit-details-marker]:hidden`}>
              <span className={["flex min-w-0 items-center gap-1.5 font-semibold", r.size ? "text-ink" : "text-amber-800"].join(" ")}>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-90" aria-hidden="true" />
                <span className="truncate">{r.label}</span>
              </span>
              {split ? (
                <>
                  <span className="text-right tabular-nums text-ink">{r.players.length || <span className="text-muted">—</span>}</span>
                  <span className="text-right tabular-nums text-ink">{r.keepers.length || <span className="text-muted">—</span>}</span>
                </>
              ) : null}
              <span className="text-right text-lg font-bold tabular-nums text-ink">{r.players.length + r.keepers.length}</span>
            </summary>
            <ul className="grid gap-0.5 bg-surface/50 px-2 pb-2 pt-1">
              {[...r.players, ...r.keepers].map((o) => (
                <li key={o.id}>
                  <button type="button" disabled={!canEdit} onClick={() => onEdit(o)} className="flex w-full cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white disabled:cursor-default">
                    <span className="font-semibold text-ink">{o.studentName}</span>
                    <span className="text-muted">{o.groupName ?? "Grupsuz"}</span>
                    {o.isGoalkeeper ? <KeeperBadge /> : null}
                    <span className="ml-auto">{t.part === "main" && o.owned ? <span className="rounded bg-sky-100 px-1.5 text-xs font-bold text-sky-800">Zaten var</span> : <DeliveryPill state={stateOf(o)} />}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <div className={`grid ${cols} gap-2 border-t-2 border-line bg-surface px-4 py-2.5 font-bold text-ink`}>
        <span>Toplam</span>
        {split ? (
          <>
            <span className="text-right tabular-nums">{t.total - t.keepers}</span>
            <span className="text-right tabular-nums">{t.keepers}</span>
          </>
        ) : null}
        <span className="text-right text-lg tabular-nums">{t.total}</span>
      </div>
    </section>
  );
}

/* ---------------- Malzeme penceresi ---------------- */

export function OrderDialog({ student, order, items, onClose }: { student: Student; order: OrderRow | null; items: EquipmentItem[]; onClose: () => void }) {
  const first = items.find((i) => isFormaItem(i.name)) ?? items[0];
  const [itemId, setItemId] = useState(order?.itemId ?? first?.id ?? 0);
  const [size, setSize] = useState(order?.size ?? "");
  const [sockSize, setSockSize] = useState(order?.sockSize ?? "");
  /** Yeni kayıtta boş: tozluk formanın teslim durumunu izler. */
  const [sockDelivery, setSockDelivery] = useState<Delivery | null>((order?.sockDelivery as Delivery | null) ?? null);
  const [price, setPrice] = useState(String((order?.priceKurus ?? first?.priceKurus ?? 0) / 100));
  const [owned, setOwned] = useState(order?.owned ?? false);
  const [paid, setPaid] = useState(order?.owned ? false : (order?.paid ?? false));
  const [today] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date()));
  const [paidMethod, setPaidMethod] = useState<PaymentMethod>(order?.paidMethod === "eft" ? "eft" : "cash");
  const [paidOn, setPaidOn] = useState(order?.paidOn ?? today);
  const [delivery, setDelivery] = useState<Delivery>((order?.delivery as Delivery) ?? "to_order");
  const [note, setNote] = useState(order?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const item = items.find((i) => i.id === itemId);
  const socks = item ? hasSocks(item.name) : false;
  const sockState: Delivery = sockDelivery ?? defaultSockDelivery(delivery, owned);
  const done = (text: string) => {
    toast({ text });
    onClose();
    router.refresh();
  };
  const save = () =>
    startTransition(async () => {
      const kurus = owned ? 0 : parseMoney(price);
      if (kurus === null) return setError("Geçerli bir tutar yazın.");
      const sockPart = socks ? { sockSize, sockDelivery: sockState } : {};
      const res = await saveOrderAction(
        order?.id ?? null,
        student.id,
        owned
          ? { itemId, size, ...sockPart, priceKurus: 0, paid: true, owned: true, delivery: "delivered", note }
          : { itemId, size, ...sockPart, priceKurus: kurus, paid, paidOn: paid ? paidOn : null, paidMethod: paid ? paidMethod : null, owned: false, delivery, note },
      );
      if (!res.ok) return setError(res.error);
      done("Kaydedildi.");
    });
  return (
    <Modal
      open
      title={`${student.name} · malzeme`}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          {order ? (
            <Button
              type="button"
              variant={armed ? "danger" : "ghost"}
              className={armed ? "mr-auto" : "mr-auto text-red-700 hover:bg-red-50"}
              disabled={busy}
              onClick={() => {
                // İki adımlı silme: ilk dokunuş sorar, ikincisi siler (üst üste pencere açılmaz).
                if (!armed) {
                  setArmed(true);
                  window.setTimeout(() => setArmed(false), 4000);
                  return;
                }
                startTransition(async () => {
                  const res = await deleteOrderAction(order.id, student.id);
                  if (!res.ok) return setError(res.error);
                  done(`${order.itemName} kaydı silindi.`);
                });
              }}
            >
              {armed ? "Evet, sil" : "Sil"}
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" onClick={save} loading={busy}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-5">
        {error ? <Alert>{error}</Alert> : null}
        {items.length === 0 ? <Alert kind="info">Önce “Ürünler” sekmesinden ürün ekleyin.</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <Field label="Ürün" htmlFor="eq-item">
            <Select
              id="eq-item"
              value={itemId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setItemId(id);
                if (!order) setPrice(String((items.find((i) => i.id === id)?.priceKurus ?? 0) / 100));
              }}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
          {!owned ? (
            <Field label="Ücret (₺)" htmlFor="eq-price">
              <Input id="eq-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          ) : null}
        </div>
        <SizePicker id="eq-size" kind="shirt" legend={socks ? "Forma-şort bedeni" : "Beden"} value={size} onChange={setSize} />
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Nereden?</legend>
          <div className="grid grid-cols-2 gap-2">
            <Choice on={!owned} onClick={() => setOwned(false)}>
              <span className="font-semibold">Okuldan alıyor</span>
            </Choice>
            <Choice on={owned} onClick={() => setOwned(true)}>
              <span className="block font-semibold">Zaten var</span>
              <span className="block text-xs font-medium opacity-75">Kendisinde vardı, ücret yok</span>
            </Choice>
          </div>
        </fieldset>
        {!owned ? (
          <>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink">Parası</legend>
              <div className="grid grid-cols-2 gap-2">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" aria-pressed={paid === v} onClick={() => setPaid(v)} className={["min-h-12 cursor-pointer rounded-xl border-2 font-semibold", paid === v ? (v ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-red-600 bg-red-50 text-red-800") : "border-line text-ink"].join(" ")}>
                    {v ? "Verdi" : "Vermedi"}
                  </button>
                ))}
              </div>
            </fieldset>
            {paid ? (
              <div className="grid gap-4 rounded-xl bg-surface/70 p-3">
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-ink">Nasıl ödedi?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <Choice key={m} on={paidMethod === m} onClick={() => setPaidMethod(m)}>
                        <span className="font-semibold">{PAYMENT_METHOD_LABELS[m]}</span>
                      </Choice>
                    ))}
                  </div>
                </fieldset>
                <DayChoice id="eq-paid-on" legend="Ne zaman ödedi?" today={today} value={paidOn} onChange={setPaidOn} />
              </div>
            ) : null}
            <DeliveryChoice legend={socks ? "Forma ve şort teslimi" : "Teslim"} value={delivery} onChange={setDelivery} hint />
          </>
        ) : null}
        {socks ? (
          <div className="grid gap-4 rounded-xl border border-line p-3">
            <p className="-mb-1 text-[15px] font-bold text-ink">Tozluk</p>
            <SizePicker id="eq-sock" kind="sock" legend="Tozluk numarası" value={sockSize} onChange={setSockSize} />
            <DeliveryChoice legend="Tozluk teslimi" value={sockState} onChange={setSockDelivery} />
          </div>
        ) : null}
        <Field label="Not" htmlFor="eq-note">
          <Input id="eq-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
      </div>
    </Modal>
  );
}

function DeliveryChoice({ legend, value, onChange, hint }: { legend: string; value: Delivery; onChange: (d: Delivery) => void; hint?: boolean }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-semibold text-ink">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        {(["to_order", "ordered", "waiting", "delivered"] as Delivery[]).map((d) => (
          <button key={d} type="button" aria-pressed={value === d} onClick={() => onChange(d)} className={["min-h-12 cursor-pointer rounded-xl border-2 px-2 text-sm font-semibold", value === d ? "border-gs-red bg-gs-red-soft text-gs-red" : "border-line text-ink"].join(" ")}>
            {DELIVERY_LABEL[d]}
          </button>
        ))}
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted">Sipariş verilecek → sipariş verilince “Sipariş verildi” → gelip öğrenciye verilince “Teslim edildi”. Okulda duruyor ama verilmediyse “Teslim edilmedi”.</p> : null}
    </fieldset>
  );
}

function Items({ items, canEdit }: { items: EquipmentItem[]; canEdit: boolean }) {
  const [edit, setEdit] = useState<EquipmentItem | "new" | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <div className="mt-4">
      {canEdit ? (
        <div className="mb-3 flex justify-end">
          <Button type="button" className="min-h-11" onClick={() => setEdit("new")}>
            + Ürün ekle
          </Button>
        </div>
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {items.map((i) => (
          <li key={i.id} className={["flex items-center gap-2 rounded-2xl border bg-white p-4 shadow-sm", i.active ? "border-line" : "border-dashed opacity-70"].join(" ")}>
            <span className="min-w-0 flex-1">
              <span className="block font-bold text-ink">{i.name}</span>
              <span className="text-sm text-muted">
                {i.priceKurus ? formatMoney(i.priceKurus) : "Fiyat girilmedi"}
                {hasSocks(i.name) ? " · tozluk numarası ve teslimi ayrı izlenir" : ""}
              </span>
            </span>
            {canEdit ? (
              <>
                <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEdit(i)}>
                  Düzenle
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-10 px-3 text-sm"
                  disabled={busy}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await setItemActiveAction(i.id, !i.active);
                      toast(res.ok ? { text: "Kaydedildi." } : { kind: "error", text: res.error });
                      router.refresh();
                    })
                  }
                >
                  {i.active ? "Kaldır" : "Etkinleştir"}
                </Button>
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {edit ? <ItemDialog item={edit === "new" ? null : edit} onClose={() => setEdit(null)} /> : null}
    </div>
  );
}

function ItemDialog({ item, onClose }: { item: EquipmentItem | null; onClose: () => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.priceKurus / 100) : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Modal
      open
      title={item ? "Ürünü düzenle" : "Ürün ekle"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            loading={busy}
            onClick={() =>
              startTransition(async () => {
                const kurus = parseMoney(price || "0");
                if (kurus === null) return setError("Geçerli bir fiyat yazın.");
                const res = await saveItemAction(item?.id ?? null, { name, priceKurus: kurus });
                if (!res.ok) return setError(res.error);
                toast({ text: "Kaydedildi." });
                onClose();
                router.refresh();
              })
            }
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error ? <Alert>{error}</Alert> : null}
        <Field label="Ürün adı" htmlFor="it-name" hint="Adında “forma” geçen ürün zorunlu sayılır; “forma” ve “tozluk” geçende tozluk ayrı izlenir.">
          <Input id="it-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Fiyat (₺)" htmlFor="it-price">
          <Input id="it-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
