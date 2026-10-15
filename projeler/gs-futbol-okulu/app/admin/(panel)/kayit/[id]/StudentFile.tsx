"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  CalendarClock,
  CalendarPlus,
  CalendarX,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  Ellipsis,
  GitMerge,
  IdCard,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Ruler,
  Trash,
  TrendingUp,
  Undo2,
  UserCheck,
  UserMinus,
  UserX,
  Wallet,
} from "lucide-react";
import { Avatar, Badge, EmptyState, Facts, KeeperBadge, Page, Panel, TextLink, type Tone } from "@/components/admin/kit";
import { Menu, type MenuItem } from "@/components/admin/Menu";
import { NotesEditor, noteLines } from "@/components/admin/Notes";
import { fixHref, isInfoComplete, issuesOf } from "@/lib/data-issues";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui";
import { adminFetch } from "@/lib/admin-fetch";
import type { RegistrationDto } from "@/lib/api";
import { effectiveGroup, formatYearRange, type AgeGroupView } from "@/lib/age-groups";
import type { AttendanceSummary } from "@/lib/attendance";
import { dayLabel, formatMoney, PAYMENT_METHOD_LABELS, type Access, type PaymentMethod } from "@/lib/billing-shared";
import { BackLink } from "@/components/admin/BackLink";
import type { EquipmentItem } from "@/lib/db/schema";
import type { OrderRow } from "@/lib/equipment";
import { isFormaItem } from "@/lib/equipment-shared";
import { formatDateTimeTr, formatDateTr, formatDayLongTr, formatTimeTr, istanbulDayKey } from "@/lib/format";
import type { BillingOptions } from "@/lib/panel-data";
import { formatPhone, toInternationalPhone } from "@/lib/phone";
import { STATUS_BADGE, STATUS_LABELS, isRegistrationStatus, type RegistrationStatus } from "@/lib/registration-status";
import { appointmentMessage, firstContactMessage, missedMessage, telLink, whatsappLink } from "@/lib/whatsapp";
import { cancelAppointmentAction, changeStatusAction, markLeftAction, markNoShowAction, notDuplicateAction, rejoinAction, restoreProcessAction, setGoalkeeperAction, setStatusAction, type ActionResult } from "../../actions";
import { createOverrideAction } from "../../aidat/actions";
import { accessLine, BillingPanel, Choice, PayPill, PaymentDialog, PromiseDialog, reminderHref, type PayTarget } from "../../aidat/BillingParts";
import { RegistrationCompare } from "../../CompareDialog";
import { ConsentPanel } from "../../ConsentPanel";
import { KitLines, OrderDialog, useOrderStep } from "../../malzeme/EquipmentManager";
import { AppointmentDialog, type BookedSlot } from "../../ProcessDialogs";
import { inviteGuardianAction } from "../../veliler/actions";

export type FileData = {
  reg: RegistrationDto;
  groups: AgeGroupView[];
  related: RegistrationDto[];
  booked: BookedSlot[];
  billing: BillingOptions;
  access: Access | null;
  feeKurus: number;
  orders: OrderRow[] | null;
  items: EquipmentItem[];
  attendance: { summary: AttendanceSummary; recent: { date: string; status: string }[] } | null;
  guardians: { id: number; name: string | null; phone: string | null; email: string | null; status: string; lastLoginAt: string | null }[] | null;
  card: { code: string; issuedAt: string; printedAt: string | null } | null;
  history: { id: number; at: string; who: string | null; summary: string }[] | null;
  /** Okula kaydı yapan kullanıcı (işlem geçmişinden). */
  enrolledBy?: string | null;
  /** Son aidat ödemesi; aidat izni yoksa undefined, ödeme yoksa null. */
  lastPayment?: { paidOn: string; method: string; amountKurus: number; takenBy: string | null; createdAt: string } | null;
  can: { edit: boolean; remove: boolean; collect: boolean; billing: boolean; development: boolean; guardians: boolean; promise: boolean; /** Grup sayfasını açabilir (program.yonet). */ groups?: boolean };
};

function messageFor(r: RegistrationDto): string {
  if (r.status === "scheduled" && r.appointmentAt) return appointmentMessage(r.contact.fullName, r.studentFullName, r.appointmentAt);
  if (r.status === "no_show") return missedMessage(r.contact.fullName, r.studentFullName);
  return firstContactMessage(r.contact.fullName, r.studentFullName);
}

export function StudentFile({ data }: { data: FileData }) {
  const { reg, groups, can } = data;
  const router = useRouter();
  const toast = useToast();
  const [busy, startTransition] = useTransition();
  const [appointment, setAppointment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [promising, setPromising] = useState(false);
  const orderStep = useOrderStep();
  const [compare, setCompare] = useState<{ kind: "submission"; id: number } | { kind: "merge"; id: number; otherId: number } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [order, setOrder] = useState<{ order: OrderRow | null } | null>(null);

  const student = reg.status === "enrolled" || reg.status === "left";
  const candidate = !student;
  const today = istanbulDayKey(new Date());
  const g = effectiveGroup(reg, groups);
  const backHref = student ? "/admin/ogrenciler" : reg.status === "scheduled" ? "/admin/randevular" : "/admin/on-kayitlar";
  const backLabel = student ? "Öğrenciler" : reg.status === "scheduled" ? "Randevular" : "Başvurular";
  const enrollHref = `/admin/kayit/${reg.id}/asil-kayit`;
  const payTarget: PayTarget | null = data.access ? { id: reg.id, name: reg.studentFullName, parentName: reg.contact.fullName, phone: reg.contact.phone, feeKurus: data.feeKurus, access: data.access } : null;

  /** Hızlı işlem + "Geri Al" düğmeli bildirim. */
  function quick(action: () => Promise<ActionResult>, success: string) {
    const previous = { status: reg.status, noShowCount: reg.noShowCount, appointmentAt: reg.appointmentAt };
    startTransition(async () => {
      const res = await action();
      if (!res.ok) return toast({ kind: "error", text: res.error });
      router.refresh();
      toast({
        text: success,
        action: {
          label: "Geri Al",
          onClick: () =>
            startTransition(async () => {
              const undo = await restoreProcessAction(reg.id, previous);
              toast(undo.ok ? { text: "İşlem geri alındı." } : { kind: "error", text: undo.error });
              router.refresh();
            }),
        },
      });
    });
  }

  const menu: MenuItem[] = [];
  if (can.edit) {
    menu.push({ label: "Bilgileri düzenle", icon: <Pencil />, href: `/admin/kayit/${reg.id}/duzenle` });
    if (reg.status === "enrolled") menu.push({ label: "Grup, kaleci ve ölçüleri düzenle", icon: <Ruler />, href: enrollHref });
    if (candidate) {
      menu.push({ label: reg.status === "scheduled" ? "Randevuyu değiştir" : "Randevu ver", icon: <CalendarPlus />, onSelect: () => setAppointment(true) });
      if (reg.status === "scheduled") menu.push({ label: "Randevuyu geri al", icon: <Undo2 />, hint: "Randevu bekliyor durumuna döner", onSelect: () => quick(() => cancelAppointmentAction(reg.id), "Randevu geri alındı.") });
      menu.push({ label: "Durumu düzelt…", icon: <RotateCcw />, onSelect: () => setStatusOpen(true) });
      if (reg.status !== "cancelled") menu.push({ label: "Veli vazgeçti", icon: <UserX />, onSelect: () => quick(() => setStatusAction(reg.id, "cancelled"), "Vazgeçti olarak işaretlendi.") });
    }
    if (reg.status === "enrolled") menu.push({ label: "Okuldan ayrıldı", icon: <UserMinus />, hint: "Aidat durur, kart iptal olur", onSelect: () => quick(() => markLeftAction(reg.id), "Ayrıldı olarak işaretlendi.") });
  }
  if (can.remove) {
    if (menu.length) menu.push({ divider: true });
    menu.push({ label: "Kaydı sil", icon: <Trash />, tone: "danger", onSelect: () => setDeleting(true) });
  }

  const showBilling = Boolean(payTarget && can.billing);
  const showKit = Boolean(student && data.orders !== null);
  const sections = [
    showBilling ? { id: "aidat", label: "Aidat" } : null,
    { id: "notlar", label: "Notlar", count: noteLines(reg.adminNote).length },
    showKit ? { id: "forma", label: "Forma", count: data.orders?.length } : null,
    { id: "bilgiler", label: "Bilgiler" },
    data.attendance ? { id: "devam", label: "Devam" } : null,
    { id: "surec", label: "Süreç" },
  ].filter((x): x is { id: string; label: string; count?: number } => x !== null);

  const statusTone = isRegistrationStatus(reg.status) ? STATUS_BADGE[reg.status] : "";
  const issues = issuesOf(reg, new Map(data.related.map((r) => [r.id, r])));

  return (
    <Page width="wide">
      <BackLink path={backHref} label={backLabel} />

      {/* Başlık */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar name={reg.studentFullName} photoId={reg.photoFileId} size="lg" />
          <div className="min-w-0">
            <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[28px]">{reg.studentFullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${statusTone}`}>{STATUS_LABELS[reg.status as RegistrationStatus] ?? reg.status}</span>
              {data.access && data.access.state !== "inactive" ? <PayPill access={data.access} today={today} /> : null}
              {reg.isGoalkeeper ? <KeeperBadge /> : null}
              {isInfoComplete(reg) ? (
                <Badge tone="green" className="gap-0.5">
                  <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" /> Bilgiler tamam
                </Badge>
              ) : reg.missing.length ? (
                <Badge tone="amber">Eksik bilgi</Badge>
              ) : null}
            </div>
            <p className="mt-1 max-w-2xl text-[15px] text-muted">
              {[reg.studentNo ? `No ${reg.studentNo}` : null, g.group ? `${g.group.name}${g.suggested ? " (önerilen)" : ""}` : null, reg.age !== null ? `${reg.age} yaş` : null].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {reg.contact.phone ? (
            <>
              <a href={telLink(reg.contact.phone)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-control bg-white px-3.5 text-[15px] font-semibold text-ink shadow-xs transition hover:bg-gray-50 active:scale-[0.97] pointer-coarse:min-h-11 sm:flex-none">
                <Phone className="h-4 w-4 text-gs-red" aria-hidden="true" /> Ara
              </a>
              <a href={whatsappLink(reg.contact.phone, messageFor(reg))} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-control bg-white px-3.5 text-[15px] font-semibold text-ink shadow-xs transition hover:bg-gray-50 active:scale-[0.97] pointer-coarse:min-h-11 sm:flex-none">
                <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" /> WhatsApp
              </a>
            </>
          ) : null}
          {menu.length ? (
            <Menu
              label="Diğer işlemler"
              items={menu}
              trigger={(p) => (
                <button type="button" {...p} aria-label="Diğer işlemler" className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-control bg-white text-ink shadow-xs transition hover:bg-gray-50 active:scale-[0.97] pointer-coarse:h-11 pointer-coarse:w-11">
                  <Ellipsis className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            />
          ) : null}
        </div>
      </header>

      {student ? <EnrollmentFacts data={data} /> : null}

      <NextStep data={data} busy={busy} enrollHref={enrollHref} onAppointment={() => setAppointment(true)} onPay={() => setPaying(true)} onPromise={() => setPromising(true)} quick={quick} />

      {/* Telefonda bölüm kısayolları: uzun dosyada tek dokunuşla ilgili bölüme */}
      <nav aria-label="Dosya bölümleri" className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-20 -mx-4 mb-4 flex gap-1.5 overflow-x-auto bg-surface/95 px-4 py-2 backdrop-blur-sm [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden">
        {sections.map((sec) => (
          <a key={sec.id} href={`#${sec.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink shadow-xs active:scale-[0.97]">
            {sec.label}
            {sec.count ? <span className="rounded-full bg-stone-200/70 px-1.5 text-xs tabular-nums text-stone-700">{sec.count}</span> : null}
          </a>
        ))}
      </nav>

      {/* Düzeltilecekler: hatalı/şüpheli bilgi, olası tekrar, veliden gelen, eksik bilgi — her biri tek tıkla */}
      {issues.length ? (
        <section className="mb-5 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(28_23_21/0.04)]" aria-label="Düzeltilecekler">
          <ul className="divide-y divide-line">
            {issues.map((issue) => {
              const href = fixHref(reg.id, issue.fix);
              const other = issue.fix.kind === "merge" ? data.related.find((o) => o.id === (issue.fix as { otherId: number }).otherId) : null;
              const tone = issue.severity === "error" ? "bg-red-100 text-red-700" : issue.severity === "warn" ? "bg-violet-100 text-violet-800" : "bg-amber-100 text-amber-800";
              return (
                <li key={issue.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4 ${tone}`}>{issue.fix.kind === "merge" ? <GitMerge /> : <CircleAlert />}</span>
                    <p className="min-w-0 text-sm">
                      <span className="font-semibold text-ink">{issue.label}</span>
                      {other ? (
                        <span className="block text-muted">
                          {other.studentFullName} · {STATUS_LABELS[other.status as RegistrationStatus] ?? other.status} · {formatDateTr(other.createdAt.slice(0, 10))}
                        </span>
                      ) : issue.detail ? (
                        <span className={["block break-words", issue.type === "tc" || issue.type === "phone" ? "font-mono font-semibold text-red-700" : "text-muted"].join(" ")}>{issue.detail}</span>
                      ) : null}
                    </p>
                  </div>
                  {can.edit ? (
                    <div className="flex flex-wrap justify-end gap-1.5 pl-10 sm:pl-0">
                      {href ? (
                        <Link href={href} className="inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-lg bg-gs-red px-3 text-sm font-semibold text-white transition hover:bg-gs-red-dark active:scale-[0.97] pointer-coarse:min-h-11">
                          {issue.type === "group" ? "Grup ata" : issue.type === "missing" ? "Tamamla" : "Düzelt"}
                        </Link>
                      ) : null}
                      {issue.fix.kind === "submission" ? (
                        <Button type="button" size="sm" onClick={() => setCompare({ kind: "submission", id: reg.id })}>
                          Karşılaştır
                        </Button>
                      ) : null}
                      {other ? (
                        <>
                          <Link href={`/admin/kayit/${other.id}`} className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-sm font-semibold text-muted hover:bg-surface hover:text-ink pointer-coarse:min-h-11">
                            Aç
                          </Link>
                          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => quick(() => notDuplicateAction(reg.id, other.id), "Farklı kişiler olarak işaretlendi.")}>
                            Farklı kişiler
                          </Button>
                          <Button type="button" size="sm" onClick={() => setCompare({ kind: "merge", id: reg.id, otherId: other.id })}>
                            Birleştir
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="grid min-w-0 grid-cols-1 gap-5">
          {showBilling && payTarget ? (
            <Panel id="aidat" title="Aidat" actions={<TextLink href="/admin/aidat">Tüm aidatlar</TextLink>}>
              <BillingPanel studentId={reg.id} target={payTarget} onPay={() => setPaying(true)} showSummary={payTarget.access.state !== "grace" && payTarget.access.state !== "locked"} />
            </Panel>
          ) : null}

          <Panel id="notlar" title="Notlar" description={noteLines(reg.adminNote).length ? undefined : "Veliyle konuşulanlar, sözler, hatırlatmalar. Yazdığınız not tarihiyle eklenir."}>
            <NotesEditor id={reg.id} note={reg.adminNote} canEdit={can.edit} limit={4} />
          </Panel>

          {showKit && data.orders ? (
            <Panel
              id="forma"
              title="Forma ve eşofman"
              actions={
                can.collect && data.items.length ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setOrder({ order: null })}>
                    <Plus className="h-4 w-4" aria-hidden="true" /> Ekle
                  </Button>
                ) : null
              }
            >
              {!data.orders.some((o) => isFormaItem(o.itemName)) ? <p className="mb-2 text-sm font-medium text-amber-800">Forması girilmedi (zorunlu).</p> : null}
              <KitLines orders={[...data.orders].sort((a, b) => Number(isFormaItem(b.itemName)) - Number(isFormaItem(a.itemName)))} canEdit={can.collect} onEdit={(o) => setOrder({ order: o })} step={orderStep} />
            </Panel>
          ) : null}

          <InfoPanel reg={reg} canEdit={can.edit} />

          {data.attendance ? <AttendancePanel att={data.attendance} devHref={can.development ? `/admin/gelisim/ogrenci/${reg.id}` : null} /> : null}
        </div>

        <aside className="grid min-w-0 grid-cols-1 gap-5">
          <ProcessPanel reg={reg} />
          <Panel
            title="Grup, kaleci ve ölçüler"
            actions={reg.status === "enrolled" && can.edit ? <TextLink href={enrollHref}>Düzenle</TextLink> : null}
          >
            <Facts
              columns={1}
              items={[
                {
                  label: "Grup",
                  value: g.group ? (
                    <>
                      {can.groups && !g.suggested ? (
                        <Link href={`/admin/gruplar/${g.group.id}`} className="font-semibold text-gs-red hover:underline">
                          {g.group.name}
                        </Link>
                      ) : (
                        g.group.name
                      )}{" "}
                      ({formatYearRange(g.group)}){g.suggested ? " · doğum yılına göre önerilen" : ""}
                    </>
                  ) : g.suggested ? (
                    "Doğum yılı hiçbir grubun aralığında değil"
                  ) : (
                    "Grupsuz"
                  ),
                },
                student ? { label: "Kaleci mi?", value: can.edit ? <GoalkeeperSwitch id={reg.id} name={reg.studentFullName} value={reg.isGoalkeeper} /> : reg.isGoalkeeper ? "Evet, kaleci" : "Hayır, oyuncu" } : null,
                student ? { label: "Boy / kilo", value: reg.heightCm || reg.weightKg !== null ? `${reg.heightCm ?? "—"} cm · ${reg.weightKg !== null ? String(reg.weightKg).replace(".", ",") : "—"} kg` : "Girilmedi" } : null,
              ]}
            />
            {student && can.development ? (
              <Link href={`/admin/gelisim/ogrenci/${reg.id}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gs-red hover:underline">
                <TrendingUp className="h-4 w-4" aria-hidden="true" /> Gelişim dosyası
              </Link>
            ) : null}
          </Panel>


          {reg.status === "enrolled" ? (
            <Fold title="Onaylar" hint="Açık rıza, fotoğraf izni, kurallar">
              <ConsentPanel registrationId={reg.id} canEdit={can.edit} />
            </Fold>
          ) : null}

          {data.guardians !== null ? <GuardianPanel reg={reg} guardians={data.guardians} /> : null}

          {data.card || reg.status === "enrolled" ? (
            <Panel title="Öğrenci kartı" actions={<TextLink href="/admin/kartlar">Kartlar</TextLink>}>
              {data.card ? (
                <p className="flex items-center gap-2 text-sm text-ink">
                  <IdCard className="h-4 w-4 text-muted" aria-hidden="true" />
                  <span className="font-mono font-semibold">{data.card.code}</span>
                  <Badge tone={data.card.printedAt ? "green" : "amber"}>{data.card.printedAt ? "Basıldı" : "Basılmadı"}</Badge>
                </p>
              ) : (
                <p className="text-sm text-muted">Etkin kart yok.</p>
              )}
            </Panel>
          ) : null}

          {data.history ? (
            <Fold title="İşlem geçmişi" hint={data.history.length ? `${data.history.length} işlem` : undefined}>
              {data.history.length === 0 ? (
                <p className="text-sm text-muted">Kayıt yok.</p>
              ) : (
                <ol className="grid gap-3">
                  {data.history.slice(0, 12).map((h) => (
                    <li key={h.id} className="text-sm">
                      <p className="text-ink">{h.summary}</p>
                      <p className="text-xs text-muted">
                        {formatDateTimeTr(h.at)}
                        {h.who ? ` · ${h.who}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Fold>
          ) : null}
        </aside>
      </div>

      {appointment ? (
        <AppointmentDialog
          reg={reg}
          booked={data.booked}
          onClose={() => setAppointment(false)}
          onDone={(text) => {
            setAppointment(false);
            toast({ text });
            router.refresh();
          }}
        />
      ) : null}
      {paying && payTarget ? <PaymentDialog student={payTarget} today={istanbulDayKey(new Date())} onClose={() => setPaying(false)} /> : null}
      {promising && payTarget ? (
        <PromiseDialog
          name={reg.studentFullName}
          today={istanbulDayKey(new Date())}
          current={payTarget.access.state === "override" ? payTarget.access.override : null}
          onClose={() => setPromising(false)}
          onConfirm={async (endsOn, note) => {
            const res = await createOverrideAction(reg.id, endsOn, note);
            if (res.ok) {
              toast({ text: `Ödeme sözü kaydedildi: ${dayLabel(endsOn, false)}.` });
              setPromising(false);
              router.refresh();
            }
            return res;
          }}
        />
      ) : null}
      {compare ? (
        <RegistrationCompare
          compare={compare}
          byId={new Map([reg, ...data.related].map((r) => [r.id, r]))}
          onClose={() => setCompare(null)}
          onDone={(text) => {
            setCompare(null);
            toast({ text });
            router.refresh();
          }}
        />
      ) : null}
      {order ? <OrderDialog student={{ id: reg.id, name: reg.studentFullName, studentNo: reg.studentNo, group: g.group?.name ?? null }} order={order.order} items={data.items} onClose={() => setOrder(null)} /> : null}
      {statusOpen ? <StatusDialog reg={reg} enrollHref={enrollHref} onClose={() => setStatusOpen(false)} onPick={(s) => (setStatusOpen(false), s === "scheduled" && !reg.appointmentAt ? setAppointment(true) : quick(() => changeStatusAction(reg.id, s), `Durum: ${STATUS_LABELS[s as RegistrationStatus]}`))} /> : null}
      {deleting ? <DeleteDialog reg={reg} onClose={() => setDeleting(false)} onDeleted={() => (toast({ text: `${reg.studentFullName} kaydı silindi.` }), router.push(backHref))} /> : null}
    </Page>
  );
}

/* ---------------- Sıradaki adım ---------------- */

function NextStep({
  data,
  busy,
  enrollHref,
  onAppointment,
  onPay,
  onPromise,
  quick,
}: {
  data: FileData;
  busy: boolean;
  enrollHref: string;
  onAppointment: () => void;
  onPay: () => void;
  onPromise: () => void;
  quick: (action: () => Promise<ActionResult>, success: string) => void;
}) {
  const { reg, can } = data;
  const today = istanbulDayKey(new Date());
  let tone: Tone = "neutral";
  let icon: ReactNode = null;
  let title: ReactNode = null;
  let text: ReactNode = null;
  let actions: ReactNode = null;
  const enroll = (label: string, primary: boolean) => (
    <Link
      href={enrollHref}
      className={[
        "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-[15px] font-semibold transition active:scale-[0.97] pointer-coarse:min-h-11",
        primary ? "bg-gs-red text-white hover:bg-gs-red-dark" : "border border-control bg-white text-ink shadow-xs hover:bg-gray-50",
      ].join(" ")}
    >
      <UserCheck className="h-4 w-4" aria-hidden="true" /> {label}
    </Link>
  );

  switch (reg.status) {
    case "pending":
      tone = "amber";
      icon = <CalendarPlus />;
      title = "Randevu verilecek";
      text = "Veliyi arayıp kayıt için gün ve saat belirleyin. Veli şu an buradaysa randevusuz, doğrudan kaydedebilirsiniz.";
      actions = can.edit ? (
        <>
          <Button type="button" size="md" onClick={onAppointment}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Randevu ver
          </Button>
          {enroll("Okula kaydet", false)}
        </>
      ) : null;
      break;
    case "scheduled": {
      const at = reg.appointmentAt;
      const day = at ? istanbulDayKey(at) : "";
      const past = at ? at < new Date().toISOString() && day !== today : false;
      tone = past ? "red" : "sky";
      icon = <CalendarClock />;
      title = at ? (
        <>
          Randevu {day === today ? "bugün" : formatDayLongTr(day)} · {formatTimeTr(at)}
          {past ? <span className="ml-2 align-middle text-xs font-semibold text-red-700">sonucu girilmedi</span> : null}
        </>
      ) : (
        "Randevu verildi"
      );
      text = "Veli gelince grubu seçip kaydı tamamlayın; boy ve kilo isteğe bağlı. Gelmezse “Gelmedi” deyin, yeni randevu verebilirsiniz.";
      actions = can.edit ? (
        <>
          {enroll("Geldi, kaydı tamamla", true)}
          <Button type="button" size="md" variant="secondary" disabled={busy} onClick={() => quick(() => markNoShowAction(reg.id), "Gelmedi olarak işaretlendi.")}>
            <CalendarX className="h-4 w-4" aria-hidden="true" /> Gelmedi
          </Button>
        </>
      ) : null;
      break;
    }
    case "no_show":
      tone = "red";
      icon = <CalendarX />;
      title = `Randevuya gelmedi${reg.noShowCount > 1 ? ` (${reg.noShowCount} kez)` : ""}`;
      text = "Veliyi arayıp yeni randevu verin. Veli şimdi geldiyse doğrudan kaydedebilirsiniz.";
      actions = can.edit ? (
        <>
          <Button type="button" size="md" onClick={onAppointment}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Yeni randevu
          </Button>
          {enroll("Kaydı tamamla", false)}
        </>
      ) : null;
      break;
    case "cancelled":
      icon = <UserX />;
      title = "Veli vazgeçti";
      text = "Tekrar ilgilenirse süreci yeniden başlatın ya da doğrudan kaydedin.";
      actions = can.edit ? (
        <>
          <Button type="button" size="md" variant="secondary" disabled={busy} onClick={() => quick(() => setStatusAction(reg.id, "pending"), "Süreç yeniden başlatıldı.")}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Süreci yeniden başlat
          </Button>
          {enroll("Kaydet", false)}
        </>
      ) : null;
      break;
    case "left":
      icon = <UserMinus />;
      title = `Okuldan ayrıldı${reg.leftAt ? ` · ${formatDateTr(reg.leftAt.slice(0, 10))}` : ""}`;
      text = "Aidat dönemi açılmaz, kartı geçersizdir. Geri dönerse etkinleştirin; aidat bugünden başlar.";
      actions = can.edit ? (
        <Button type="button" size="md" variant="secondary" disabled={busy} onClick={() => quick(() => rejoinAction(reg.id), "Öğrenci yeniden etkinleştirildi. Aidat bugünden başlar.")}>
          <UserCheck className="h-4 w-4" aria-hidden="true" /> Geri döndü, etkinleştir
        </Button>
      ) : null;
      break;
    case "enrolled": {
      const a = data.access;
      if (!a || !can.billing || (a.state !== "grace" && a.state !== "locked")) return null;
      tone = a.state === "locked" ? "red" : "amber";
      icon = <Wallet />;
      title = a.promiseMissed ? "Ödeme sözü tutulmadı" : a.state === "locked" ? (a.firstPack ? "Aidatı gelmedi" : "Antrenman hakkı bitti") : a.firstPack ? "İlk aidat bekleniyor" : "Aidat bekleniyor";
      // Başlık durumu söylüyor; açıklama tekrar etmesin ("Aidat gelmedi · İlk antrenman …").
      const line = accessLine(a, today).replace(/^Aidat gelmedi · /, "");
      text = `${line.charAt(0).toLocaleUpperCase("tr-TR")}${line.slice(1)}`;
      const reminder = reminderHref({ phone: reg.contact.phone, parentName: reg.contact.fullName, name: reg.studentFullName, access: a }, today);
      actions = (
        <>
          {can.collect && data.feeKurus > 0 ? (
            <Button type="button" size="md" variant="success" onClick={onPay}>
              Aidat al
            </Button>
          ) : null}
          {can.promise ? (
            <Button type="button" size="md" variant="secondary" onClick={onPromise}>
              <CalendarClock className="h-4 w-4 text-sky-700" aria-hidden="true" /> Ödeme sözü
            </Button>
          ) : null}
          {reminder ? (
            <a href={reminder} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-control bg-white px-4 text-[15px] font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:min-h-11">
              <MessageCircle className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Hatırlat
            </a>
          ) : null}
        </>
      );
      break;
    }
    default:
      return null;
  }

  const iconTone: Record<Tone, string> = {
    neutral: "bg-stone-100 text-stone-600",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    sky: "bg-sky-100 text-sky-800",
    green: "bg-emerald-100 text-emerald-800",
    violet: "bg-violet-100 text-violet-800",
    brand: "bg-gs-red-soft text-gs-red",
  };
  return (
    <section className="mb-5 flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgb(28_23_21/0.04)] sm:p-5 lg:flex-row lg:items-center" aria-label="Sıradaki adım">
      <div className="flex min-w-0 flex-1 gap-3.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5 ${iconTone[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          <p className="mt-0.5 text-[15px] text-muted">{text}</p>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2 max-lg:[&>*]:flex-1">{actions}</div> : null}
    </section>
  );
}

/* ---------------- Bilgiler ---------------- */

/** Kayıt ve aidat özeti: ne zaman başvurdu, ne zaman kim kaydetti, son aidatı ne zaman, nasıl, kime ödedi. */
function EnrollmentFacts({ data }: { data: FileData }) {
  const { reg, access, lastPayment } = data;
  const items: { label: string; value: ReactNode }[] = [
    { label: "Başvuru", value: dayLabel(istanbulDayKey(reg.createdAt)) },
    {
      label: reg.status === "left" ? "Okula kayıt · ayrıldı" : "Okula kayıt",
      value: (
        <>
          {reg.enrolledAt ? dayLabel(istanbulDayKey(reg.enrolledAt)) : "—"}
          {data.enrolledBy ? <span className="block text-xs text-muted">Kaydeden: {data.enrolledBy}</span> : null}
          {reg.status === "left" && reg.leftAt ? <span className="block text-xs text-muted">Ayrıldı: {dayLabel(istanbulDayKey(reg.leftAt))}</span> : null}
        </>
      ),
    },
  ];
  if (lastPayment !== undefined)
    items.push({
      label: "Son aidat",
      value: lastPayment ? (
        <>
          {dayLabel(lastPayment.paidOn)} · {PAYMENT_METHOD_LABELS[lastPayment.method as PaymentMethod] ?? lastPayment.method}
          <span className="block text-xs text-muted">
            {formatMoney(lastPayment.amountKurus)}
            {lastPayment.takenBy ? ` · Alan: ${lastPayment.takenBy}` : ""}
          </span>
        </>
      ) : (
        <span className="text-muted">Henüz ödeme yok</span>
      ),
    });
  if (access && access.state !== "inactive")
    items.push({
      label: access.state === "paid" ? "Sonraki ödeme" : "Aidat",
      value:
        access.state === "paid" && access.paidUntil ? (
          <>
            {dayLabel(access.paidUntil)}
            {access.sessionsLeft != null ? <span className="block text-xs text-muted">{access.sessionsLeft} antrenman hakkı kaldı</span> : null}
          </>
        ) : access.dueDate ? (
          `Bekleniyor (${dayLabel(access.dueDate, false)})`
        ) : (
          "Bekleniyor"
        ),
    });
  return (
    <dl className="mb-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_1px_2px_rgb(28_23_21/0.04)] sm:px-5 lg:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium text-muted">{it.label}</dt>
          <dd className="mt-0.5 text-[15px] font-semibold text-ink">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PhoneLink({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <a href={`tel:${toInternationalPhone(value)}`} className="font-medium text-ink underline decoration-stone-300 underline-offset-2 hover:text-gs-red hover:decoration-gs-red">
      {formatPhone(value)}
    </a>
  );
}

/** Seyrek bakılan bölüm: başlığa dokununca açılır (telefonda dosyayı kısaltır). */
function Fold({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(28_23_21/0.04)]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold text-ink">{title}</span>
          {hint ? <span className="block truncate text-sm text-muted">{hint}</span> : null}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="border-t border-line px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}

function InfoPanel({ reg, canEdit }: { reg: RegistrationDto; canEdit: boolean }) {
  const sub = "mb-2 mt-5 text-sm font-semibold text-ink first:mt-0";
  return (
    <Panel id="bilgiler" title="Bilgiler" actions={canEdit ? <TextLink href={`/admin/kayit/${reg.id}/duzenle`}>Düzenle</TextLink> : null}>
      <h3 className={sub}>Öğrenci</h3>
      <Facts
        items={[
          { label: "Doğum tarihi", value: reg.birthDate ? `${formatDateTr(reg.birthDate)}${reg.age !== null ? ` · ${reg.age} yaş` : ""}` : "" },
          { label: "T.C. kimlik no", value: reg.studentTc ? <span className="font-mono">{reg.studentTc}</span> : "" },
          { label: "İrtibat telefonu", value: <PhoneLink value={reg.studentPhone} /> },
          { label: "Kan grubu", value: reg.bloodGroup },
          { label: "E-posta", value: reg.email ? <a href={`mailto:${reg.email}`} className="hover:text-gs-red">{reg.email}</a> : "" },
          { label: "Ev adresi", value: reg.homeAddress ? <span className="whitespace-pre-wrap">{reg.homeAddress}</span> : "", wide: true },
        ]}
      />
      <h3 className={sub}>Aile</h3>
      <Facts
        items={[
          { label: "İletişim velisi", value: reg.contact.fullName ? <span><Badge tone="brand" className="mr-1.5">{reg.contact.typeLabel}</Badge>{reg.contact.fullName}{reg.contact.phone ? <> · <PhoneLink value={reg.contact.phone} /></> : null}</span> : "", wide: true },
          { label: "Anne", value: reg.motherFullName ? <span>{reg.motherFullName}{reg.motherPhone ? <> · <PhoneLink value={reg.motherPhone} /></> : null}</span> : "" },
          { label: "Anne T.C.", value: reg.motherTc ? <span className="font-mono">{reg.motherTc}</span> : "" },
          { label: "Baba", value: reg.fatherFullName ? <span>{reg.fatherFullName}{reg.fatherPhone ? <> · <PhoneLink value={reg.fatherPhone} /></> : null}</span> : "" },
          { label: "Baba T.C.", value: reg.fatherTc ? <span className="font-mono">{reg.fatherTc}</span> : "" },
        ]}
      />
      <h3 className={sub}>Acil durumda ulaşılacak kişi</h3>
      <Facts
        items={[
          { label: "Adı soyadı", value: reg.emergencyFullName ? `${reg.emergencyFullName}${reg.emergencyRelation ? ` (${reg.emergencyRelation})` : ""}` : "" },
          { label: "Telefon", value: <PhoneLink value={reg.emergencyPhone} /> },
        ]}
      />
      <p className="mt-5 border-t border-line pt-3 text-xs text-muted">
        Başvuru #{reg.id} · {formatDateTimeTr(reg.createdAt)} · son güncelleme {formatDateTimeTr(reg.updatedAt)}
      </p>
    </Panel>
  );
}

/* ---------------- Süreç, not, devam ---------------- */

function ProcessPanel({ reg }: { reg: RegistrationDto }) {
  const steps: { label: string; detail: string; state: "done" | "current" | "todo" | "warn" }[] = [
    { label: "Başvuru", detail: formatDateTimeTr(reg.createdAt), state: "done" },
    {
      label: "Randevu",
      detail: reg.appointmentAt ? `${formatDateTimeTr(reg.appointmentAt)}${reg.noShowCount ? ` · ${reg.noShowCount} kez gelmedi` : ""}` : reg.status === "enrolled" || reg.status === "left" ? "Randevusuz kayıt" : "Verilmedi",
      state: reg.status === "pending" ? "current" : reg.status === "no_show" ? "warn" : reg.status === "scheduled" ? "current" : reg.status === "cancelled" ? "todo" : "done",
    },
    {
      label: "Okula kayıt",
      detail: reg.enrolledAt ? `${formatDateTr(reg.enrolledAt.slice(0, 10))}${reg.studentNo ? ` · No ${reg.studentNo}` : ""}` : "Henüz yapılmadı",
      state: reg.status === "enrolled" || reg.status === "left" ? "done" : "todo",
    },
  ];
  if (reg.status === "left") steps.push({ label: "Ayrıldı", detail: reg.leftAt ? formatDateTr(reg.leftAt.slice(0, 10)) : "", state: "warn" });
  if (reg.status === "cancelled") steps.push({ label: "Vazgeçti", detail: formatDateTr(reg.updatedAt.slice(0, 10)), state: "warn" });
  const dot = { done: "bg-emerald-600 text-white", current: "bg-gs-red text-white ring-4 ring-gs-red/15", todo: "bg-stone-200 text-stone-500", warn: "bg-red-100 text-red-700 ring-4 ring-red-50" };
  return (
    <Panel id="surec" title="Süreç">
      <ol className="relative grid gap-4">
        {steps.map((s, i) => (
          <li key={s.label} className="relative flex gap-3">
            {i < steps.length - 1 ? <span className="absolute left-[11px] top-7 h-[calc(100%-4px)] w-px bg-line" aria-hidden="true" /> : null}
            <span className={`relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${dot[s.state]}`} aria-hidden="true">
              {s.state === "done" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.state === "warn" ? "!" : i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm font-semibold ${s.state === "todo" ? "text-muted" : "text-ink"}`}>{s.label}</p>
              <p className="text-xs text-muted">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function AttendancePanel({ att, devHref }: { att: NonNullable<FileData["attendance"]>; devHref: string | null }) {
  const s = att.summary;
  const colors: Record<string, string> = { present: "bg-emerald-500", absent: "bg-red-500", excused: "bg-sky-400" };
  const labels: Record<string, string> = { present: "Geldi", absent: "Gelmedi", excused: "İzinli" };
  return (
    <Panel id="devam" title="Antrenman devamı" actions={devHref ? <TextLink href={devHref}>Gelişim</TextLink> : null}>
      {s.present + s.absent + s.excused === 0 ? (
        <EmptyState title="Henüz yoklama yok">Yoklama alınan antrenmanlar burada görünür.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6">
          <div className="flex gap-6">
            <div>
              <p className="text-3xl font-bold tabular-nums tracking-tight text-ink">{s.rate === null ? "—" : `%${s.rate}`}</p>
              <p className="text-xs text-muted">katılım</p>
            </div>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Geldi</dt>
                <dd className="font-semibold tabular-nums text-ink">{s.present}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Gelmedi</dt>
                <dd className="font-semibold tabular-nums text-ink">{s.absent}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">İzinli</dt>
                <dd className="font-semibold tabular-nums text-ink">{s.excused}</dd>
              </div>
            </dl>
          </div>
          <div>
            <p className="mb-1.5 text-xs text-muted">Son antrenmanlar (soldaki en yeni)</p>
            <ol className="flex flex-wrap gap-1">
              {att.recent.map((r, i) => (
                <li key={i} title={`${formatDateTr(r.date)} · ${labels[r.status] ?? r.status}`} className={`h-6 w-6 rounded-md ${colors[r.status] ?? "bg-stone-200"}`}>
                  <span className="sr-only">
                    {formatDateTr(r.date)}: {labels[r.status] ?? r.status}
                  </span>
                </li>
              ))}
            </ol>
            {s.absentStreak >= 2 ? <p className="mt-2 text-sm font-medium text-red-700">Son {s.absentStreak} antrenmana gelmedi.</p> : null}
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Veli hesabı ---------------- */

function GuardianPanel({ reg, guardians }: { reg: RegistrationDto; guardians: NonNullable<FileData["guardians"]> }) {
  const [invite, setInvite] = useState<{ link: string; message: string; phone: string | null } | null>(null);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const send = () =>
    startTransition(async () => {
      const res = await inviteGuardianAction(reg.id);
      if (!res.ok || !res.link) return toast({ kind: "error", text: res.ok ? "Bağlantı üretilemedi." : res.error });
      setInvite({ link: res.link, message: res.message ?? res.link, phone: res.phone ?? (reg.contact.phone || null) });
      router.refresh();
    });
  const labels: Record<string, { text: string; tone: Tone }> = { active: { text: "Giriş yapabiliyor", tone: "green" }, invited: { text: "Davet bekliyor", tone: "amber" }, disabled: { text: "Pasif", tone: "neutral" } };
  return (
    <Panel title="Veli hesabı" actions={<TextLink href="/admin/veliler">Veliler</TextLink>}>
      {guardians.length === 0 ? (
        <p className="text-sm text-muted">Veli hesabı açılmadı. Veli portaldan aidat, devam ve duyuruları görebilir.</p>
      ) : (
        <ul className="grid gap-2">
          {guardians.map((u) => (
            <li key={u.id} className="text-sm">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                {u.name ?? "Veli"} <Badge tone={labels[u.status]?.tone ?? "neutral"}>{labels[u.status]?.text ?? u.status}</Badge>
              </p>
              <p className="text-xs text-muted">{[u.phone ? formatPhone(u.phone) : null, u.email, u.lastLoginAt ? `son giriş ${formatDateTr(u.lastLoginAt.slice(0, 10))}` : null].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
      {reg.status === "enrolled" ? (
        <Button type="button" size="sm" variant="secondary" className="mt-3" loading={busy} onClick={send}>
          {guardians.length ? "Yeni giriş bağlantısı" : "Hesap aç ve davet et"}
        </Button>
      ) : null}
      {invite ? (
        <Modal open title="Veli giriş bağlantısı" onClose={() => setInvite(null)}>
          <div className="grid gap-4">
            <p className="text-sm text-muted">Bağlantı 7 gün geçerli. Veli bağlantıyla şifresini belirleyip portala girer.</p>
            <div className="flex gap-2">
              <input readOnly value={invite.link} aria-label="Davet bağlantısı" className="h-11 min-w-0 flex-1 rounded-xl border border-control bg-surface px-3 font-mono text-sm" onFocus={(e) => e.target.select()} />
              <Button
                type="button"
                size="md"
                variant="secondary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(invite.link);
                    toast({ text: "Kopyalandı." });
                  } catch {
                    toast({ kind: "error", text: "Kopyalanamadı." });
                  }
                }}
              >
                <Copy className="h-4 w-4" aria-hidden="true" /> Kopyala
              </Button>
            </div>
            {invite.phone ? (
              <a href={whatsappLink(invite.phone, invite.message)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-semibold text-white hover:bg-emerald-800">
                <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp ile gönder
              </a>
            ) : null}
          </div>
        </Modal>
      ) : null}
    </Panel>
  );
}

/* ---------------- Durum düzelt, sil ---------------- */

function StatusDialog({ reg, enrollHref, onClose, onPick }: { reg: RegistrationDto; enrollHref: string; onClose: () => void; onPick: (status: string) => void }) {
  const options = (["pending", "scheduled", "no_show", "cancelled"] as const).filter((s) => s !== reg.status);
  return (
    <Modal open title="Durumu düzelt" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">Yanlış işaretlemeyi düzeltmek için. Kayda almak için “Okula kaydet”i kullanın.</p>
      <div className="grid gap-2">
        {options.map((s) => (
          <button key={s} type="button" onClick={() => onPick(s)} className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-line px-4 text-left text-[15px] font-semibold text-ink transition hover:border-gray-400 hover:bg-surface">
            {STATUS_LABELS[s]}
            {s === "scheduled" && !reg.appointmentAt ? <span className="text-xs font-normal text-muted">randevu seçilir</span> : null}
          </button>
        ))}
        <Link href={enrollHref} className="flex min-h-12 items-center justify-between rounded-xl border border-gs-red/30 bg-gs-red-soft px-4 text-[15px] font-semibold text-gs-red">
          Okula kaydet <span className="text-xs font-normal">kayıt sayfası →</span>
        </Link>
      </div>
    </Modal>
  );
}

function DeleteDialog({ reg, onClose, onDeleted }: { reg: RegistrationDto; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = async () => {
    setBusy(true);
    try {
      const res = await adminFetch(`/api/admin/registrations/${reg.id}`, { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; formError?: string };
      if (res.ok && body.ok) onDeleted();
      else setError(body.formError ?? "Kayıt silinemedi.");
    } catch {
      setError("Kayıt silinemedi (bağlantı hatası).");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title="Kaydı sil"
      onClose={() => !busy && onClose()}
      closeDisabled={busy}
      footer={
        <>
          <Button type="button" size="md" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" size="md" variant="danger" onClick={confirm} loading={busy}>
            Evet, sil
          </Button>
        </>
      }
    >
      <p className="text-[15px] text-ink">
        <span className="font-semibold">{reg.studentFullName}</span> kaydı tamamen silinecek. Bu işlem geri alınamaz. Geçerli ödemesi olan kayıt silinemez; önce ödemeyi iptal edin.
      </p>
      <p className="mt-2 text-sm text-muted">Veli vazgeçtiyse silmek yerine “Veli vazgeçti”, öğrenci ayrıldıysa “Okuldan ayrıldı” kullanın.</p>
      {error ? <p className="mt-3 text-sm font-semibold text-red-700">{error}</p> : null}
    </Modal>
  );
}

/** Kaleci / oyuncu: tek dokunuşla değişir, "Geri al"lı. */
function GoalkeeperSwitch({ id, name, value }: { id: number; name: string; value: boolean }) {
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const save = (next: boolean) =>
    startTransition(async () => {
      if (next === value) return;
      const res = await setGoalkeeperAction(id, next);
      if (!res.ok) return toast({ kind: "error", text: res.error });
      toast({
        text: next ? `${name} kaleci olarak işaretlendi.` : `${name} artık oyuncu olarak görünüyor.`,
        action: { label: "Geri al", onClick: () => startTransition(async () => void ((await setGoalkeeperAction(id, value)).ok && router.refresh())) },
      });
      router.refresh();
    });
  return (
    <span className="mt-1 grid max-w-xs grid-cols-2 gap-2" role="group" aria-label="Kaleci mi?">
      <Choice on={!value} onClick={() => save(false)} className={busy ? "opacity-60" : ""}>
        <span className="font-semibold">Oyuncu</span>
      </Choice>
      <Choice on={value} onClick={() => save(true)} className={busy ? "opacity-60" : ""}>
        <span className="font-semibold">Kaleci</span>
      </Choice>
    </span>
  );
}
