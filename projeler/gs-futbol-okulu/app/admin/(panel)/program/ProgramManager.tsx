"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useConfirm } from "@/components/admin/Confirm";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/Calendar";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import type { ActionResult } from "@/lib/admin-action";
import { dayLabel } from "@/lib/billing-shared";
import type { GroupSchedule, Venue } from "@/lib/db/schema";
import { directionLinks } from "@/lib/maps";
import type { SessionView } from "@/lib/program";
import {
  addSessionAction,
  cancelSessionAction,
  deleteScheduleAction,
  moveSessionAction,
  restoreSessionAction,
  saveScheduleAction,
  saveVenueAction,
  setGroupCoachesAction,
  setVenueActiveAction,
  type MoveFormValues,
  type ScheduleFormValues,
  type VenueFormValues,
} from "./actions";

export const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

type Props = {
  today: string;
  groups: { id: number; name: string }[];
  venues: Venue[];
  schedules: GroupSchedule[];
  coaches: { groupId: number; userId: number; name: string }[];
  staff: { id: number; name: string; roleName: string; portal: string }[];
  sessions: SessionView[];
};

type Tab = "program" | "calendar" | "venues";

export function useAct() {
  const toast = useToast();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const act = (fn: () => Promise<ActionResult>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      toast(res.ok ? { text: ok } : { kind: "error", text: res.error });
      if (res.ok) {
        after?.();
        router.refresh();
      }
    });
  return { busy, act };
}

export function ProgramManager(props: Props) {
  const [tab, setTab] = useState<Tab>("program");
  return (
    <div className="mt-5">
      <div className="flex gap-1 rounded-xl bg-surface p-1" role="tablist">
        {(
          [
            ["program", "Haftalık program"],
            ["calendar", "Takvim"],
            ["venues", `Sahalar (${props.venues.filter((v) => v.active).length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={["min-h-11 flex-1 cursor-pointer whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition", tab === k ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tab === "program" ? <WeeklyProgram {...props} /> : tab === "calendar" ? <SessionCalendar {...props} /> : <Venues venues={props.venues} />}</div>
    </div>
  );
}

/* ---------------- Haftalık program ---------------- */

function WeeklyProgram({ groups, venues, schedules, coaches, staff }: Props) {
  const [edit, setEdit] = useState<{ schedule: GroupSchedule | null; groupId: number } | null>(null);
  const [coachFor, setCoachFor] = useState<number | null>(null);
  const venueName = (id: number | null) => venues.find((v) => v.id === id)?.name ?? "Saha seçilmedi";
  const { busy, act } = useAct();
  const [confirm, confirmDialog] = useConfirm();

  if (groups.length === 0) return <Alert kind="info">Önce Gruplar sayfasından yaş grubu ekleyin.</Alert>;

  return (
    <>
      {venues.length === 0 ? (
        <div className="mb-4">
          <Alert kind="info">Henüz saha eklenmedi. “Sahalar” sekmesinden antrenman yerlerini ekleyin; velilere yol tarifi buradan gider.</Alert>
        </div>
      ) : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {groups.map((g) => {
          const rows = schedules.filter((s) => s.groupId === g.id);
          const groupCoaches = coaches.filter((c) => c.groupId === g.id);
          return (
            <li key={g.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-ink">
                  <Link href={`/admin/gruplar/${g.id}`} className="hover:text-gs-red hover:underline">
                    {g.name}
                  </Link>
                </h2>
                <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEdit({ schedule: null, groupId: g.id })}>
                  + Gün ekle
                </Button>
              </div>
              <p className="mt-1 max-w-2xl text-[15px] text-muted">
                Antrenör: {groupCoaches.length ? groupCoaches.map((c) => c.name).join(", ") : "atanmadı"}{" "}
                <button type="button" className="-my-2 inline-flex min-h-9 cursor-pointer items-center rounded-lg px-1.5 font-semibold text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-11" onClick={() => setCoachFor(g.id)}>
                  Değiştir
                </button>
              </p>
              {rows.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Program yok.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line/70">
                  {rows.map((s) => (
                    <li key={s.id} className="flex items-center gap-1 py-2 text-[15px]">
                      <span className="min-w-0 flex-1">
                        <span className="block text-ink">
                          <span className="font-semibold">{WEEKDAYS[s.weekday - 1]}</span> <span className="tabular-nums">{s.startTime}–{s.endTime}</span>
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {venueName(s.venueId)}
                          {s.validFrom || s.validTo ? ` · ${s.validFrom ? dayLabel(s.validFrom, false) : "…"}–${s.validTo ? dayLabel(s.validTo, false) : "…"}` : ""}
                        </span>
                      </span>
                      <button type="button" className="inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-sm font-semibold text-gs-red hover:bg-gs-red-soft pointer-coarse:min-h-11" onClick={() => setEdit({ schedule: s, groupId: g.id })}>
                        Düzenle
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="ml-1 inline-flex min-h-9 cursor-pointer items-center rounded-lg px-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 pointer-coarse:min-h-11"
                        onClick={async () => {
                          const ok = await confirm({
                            title: `${g.name} · ${WEEKDAYS[s.weekday - 1]} ${s.startTime} silinsin mi?`,
                            text: "Bu haftalık antrenman programdan kalkar ve gelecekteki seansları silinir. Geçmiş yoklamalar kalır.",
                            confirmLabel: "Programdan sil",
                          });
                          if (ok) act(() => deleteScheduleAction(s.id), "Silindi. Gelecek seanslar kaldırıldı.");
                        }}
                      >
                        Sil
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {edit ? <ScheduleDialog schedule={edit.schedule} groupId={edit.groupId} groups={groups} venues={venues.filter((v) => v.active || v.id === edit.schedule?.venueId)} onClose={() => setEdit(null)} /> : null}
      {coachFor !== null ? (
        <CoachDialog group={groups.find((g) => g.id === coachFor)!} staff={staff} selected={coaches.filter((c) => c.groupId === coachFor).map((c) => c.userId)} onClose={() => setCoachFor(null)} />
      ) : null}
      {confirmDialog}
    </>
  );
}

export function ScheduleDialog({ schedule, groupId, groups, venues, onClose }: { schedule: GroupSchedule | null; groupId: number; groups: Props["groups"]; venues: Venue[]; onClose: () => void }) {
  const [values, setValues] = useState<ScheduleFormValues>({
    groupId: String(schedule?.groupId ?? groupId),
    weekday: String(schedule?.weekday ?? ""),
    startTime: schedule?.startTime ?? "17:00",
    endTime: schedule?.endTime ?? "18:30",
    venueId: String(schedule?.venueId ?? venues[0]?.id ?? ""),
    validFrom: schedule?.validFrom ?? "",
    validTo: schedule?.validTo ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, act } = useAct();
  const set = (k: keyof ScheduleFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const submit = () =>
    act(
      async () => {
        const res = await saveScheduleAction(schedule?.id ?? null, values);
        if (!res.ok) setErrors(res.fieldErrors ?? { form: res.error });
        return res;
      },
      "Program kaydedildi.",
      onClose,
    );
  return (
    <Modal
      open
      title={schedule ? "Programı düzenle" : "Antrenman günü ekle"}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" onClick={submit} loading={busy}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form ? <Alert>{errors.form}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Grup" htmlFor="sc-group" required>
            <Select id="sc-group" value={values.groupId} onChange={set("groupId")}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gün" htmlFor="sc-day" required error={errors.weekday}>
            <Select id="sc-day" value={values.weekday} onChange={set("weekday")} invalid={Boolean(errors.weekday)}>
              <option value="">Gün seçin</option>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Başlangıç" htmlFor="sc-start" required error={errors.startTime}>
            <Input id="sc-start" type="time" value={values.startTime} onChange={set("startTime")} invalid={Boolean(errors.startTime)} />
          </Field>
          <Field label="Bitiş" htmlFor="sc-end" required error={errors.endTime}>
            <Input id="sc-end" type="time" value={values.endTime} onChange={set("endTime")} invalid={Boolean(errors.endTime)} />
          </Field>
          <Field label="Saha" htmlFor="sc-venue">
            <Select id="sc-venue" value={values.venueId} onChange={set("venueId")}>
              <option value="0">Saha seçilmedi</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <details className="rounded-xl border border-line p-3">
          <summary className="cursor-pointer text-sm font-semibold text-ink">Dönemsel program (yaz / kış)</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Başlangıç tarihi" htmlFor="sc-from" error={errors.validFrom}>
              <DatePicker id="sc-from" value={values.validFrom} onChange={(d) => setValues((v) => ({ ...v, validFrom: d }))} clearable />
            </Field>
            <Field label="Bitiş tarihi" htmlFor="sc-to" error={errors.validTo}>
              <DatePicker id="sc-to" value={values.validTo} onChange={(d) => setValues((v) => ({ ...v, validTo: d }))} clearable />
            </Field>
          </div>
        </details>
      </div>
    </Modal>
  );
}

export function CoachDialog({ group, staff, selected, onClose }: { group: { id: number; name: string }; staff: Props["staff"]; selected: number[]; onClose: () => void }) {
  const [ids, setIds] = useState<number[]>(selected);
  const { busy, act } = useAct();
  return (
    <Modal
      open
      title={`${group.name} · antrenörler`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" loading={busy} onClick={() => act(() => setGroupCoachesAction(group.id, ids), "Antrenörler kaydedildi.", onClose)}>
            Kaydet
          </Button>
        </>
      }
    >
      {staff.length === 0 ? <p className="text-sm text-muted">Önce Ekip sayfasından antrenör ekleyin.</p> : null}
      <ul className="grid gap-2">
        {staff.map((u) => (
          <li key={u.id}>
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line px-3 hover:bg-surface">
              <input type="checkbox" className="h-5 w-5 accent-[var(--color-gs-red)]" checked={ids.includes(u.id)} onChange={(e) => setIds((p) => (e.target.checked ? [...p, u.id] : p.filter((x) => x !== u.id)))} />
              <span className="flex-1 font-semibold text-ink">{u.name}</span>
              <span className="text-xs text-muted">{u.roleName}</span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/* ---------------- Takvim ---------------- */

function SessionCalendar({ today, sessions, groups, venues }: Props) {
  const [groupFilter, setGroupFilter] = useState("all");
  const [cancelling, setCancelling] = useState<SessionView | null>(null);
  const [moving, setMoving] = useState<{ session: SessionView | null; groupId: number } | null>(null);
  const { busy, act } = useAct();
  const visible = sessions.filter((s) => groupFilter === "all" || String(s.groupId) === groupFilter);
  const byDay = useMemo(() => {
    const m = new Map<string, SessionView[]>();
    for (const s of visible) m.set(s.date, [...(m.get(s.date) ?? []), s]);
    return [...m.entries()];
  }, [visible]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-auto" aria-label="Grup">
          <option value="all">Tüm gruplar</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <Button type="button" variant="secondary" className="min-h-12" onClick={() => setMoving({ session: null, groupId: groupFilter === "all" ? (groups[0]?.id ?? 0) : Number(groupFilter) })} disabled={groups.length === 0}>
          + Ek antrenman
        </Button>
      </div>
      {byDay.length === 0 ? <p className="mt-8 text-center text-muted">Önümüzdeki 3 haftada antrenman yok. Haftalık program ekleyin.</p> : null}
      <div className="mt-4 grid gap-4">
        {byDay.map(([day, list]) => (
          <section key={day}>
            <h3 className="mb-2 text-[15px] font-semibold text-ink">
              {day === today ? "Bugün · " : ""}
              {dayLabel(day, false)} {WEEKDAYS[(new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7]}
            </h3>
            <ul className="grid gap-2">
              {list.map((s) => (
                <li key={s.id} className={["flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-3 shadow-sm", s.status === "cancelled" ? "border-dashed border-gray-300 opacity-70" : "border-line"].join(" ")}>
                  <span className="w-28 tabular-nums font-bold text-ink">
                    {s.startTime}–{s.endTime}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      {s.groupName}
                      {s.moved ? <span className="ml-2 rounded bg-sky-100 px-1.5 text-xs font-bold text-sky-800">Taşındı</span> : null}
                      {!s.scheduleId ? <span className="ml-2 rounded bg-violet-100 px-1.5 text-xs font-bold text-violet-800">Ek</span> : null}
                      {s.status === "cancelled" ? <span className="ml-2 rounded bg-gray-200 px-1.5 text-xs font-bold text-gray-700">İptal: {s.cancelReason}</span> : null}
                    </span>
                    <span className="block text-sm text-muted">{s.venueName ?? "Saha yok"}</span>
                  </span>
                  {s.status === "cancelled" ? (
                    <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" disabled={busy} onClick={() => act(() => restoreSessionAction(s.id), "Seans yeniden açıldı.")}>
                      Geri al
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setMoving({ session: s, groupId: s.groupId })}>
                        Taşı
                      </Button>
                      <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm text-red-700 hover:bg-red-50" onClick={() => setCancelling(s)}>
                        İptal
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {cancelling ? <CancelDialog session={cancelling} onClose={() => setCancelling(null)} /> : null}
      {moving ? <MoveDialog session={moving.session} groupId={moving.groupId} groups={groups} venues={venues.filter((v) => v.active)} today={today} onClose={() => setMoving(null)} /> : null}
    </>
  );
}

export function CancelDialog({ session, onClose }: { session: SessionView; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [announce, setAnnounce] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { busy, act } = useAct();
  return (
    <Modal
      open
      title={`${session.groupName} · ${dayLabel(session.date, false)} ${session.startTime}`}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={busy}
            onClick={() =>
              act(
                async () => {
                  const res = await cancelSessionAction(session.id, reason, announce);
                  if (!res.ok) setError(res.error);
                  return res;
                },
                "Antrenman iptal edildi.",
                onClose,
              )
            }
          >
            Antrenmanı iptal et
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="İptal nedeni" htmlFor="cancel-reason" required error={error ?? undefined}>
          <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ör. yağmur nedeniyle saha kapalı" maxLength={300} autoFocus />
        </Field>
        <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
          <input type="checkbox" className="h-5 w-5 accent-[var(--color-gs-red)]" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
          Grubun velilerine duyur
        </label>
      </div>
    </Modal>
  );
}

export function MoveDialog({ session, groupId, groups, venues, today, onClose }: { session: SessionView | null; groupId: number; groups: Props["groups"]; venues: Venue[]; today: string; onClose: () => void }) {
  const [values, setValues] = useState<MoveFormValues>({
    date: session?.date ?? today,
    startTime: session?.startTime ?? "17:00",
    endTime: session?.endTime ?? "18:30",
    venueId: String(session?.venueId ?? venues[0]?.id ?? 0),
  });
  const [gid, setGid] = useState(String(groupId));
  const [announce, setAnnounce] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, act } = useAct();
  const set = (k: keyof MoveFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  return (
    <Modal
      open
      title={session ? "Antrenmanı taşı" : "Ek antrenman"}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            loading={busy}
            onClick={() =>
              act(
                async () => {
                  const res = session ? await moveSessionAction(session.id, values, announce) : await addSessionAction(Number(gid), values);
                  if (!res.ok) setErrors(res.fieldErrors ?? { form: res.error });
                  return res;
                },
                "Kaydedildi.",
                onClose,
              )
            }
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form ? <Alert>{errors.form}</Alert> : null}
        {!session ? (
          <Field label="Grup" htmlFor="mv-group" required>
            <Select id="mv-group" value={gid} onChange={(e) => setGid(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tarih" htmlFor="mv-date" required error={errors.date}>
            <DatePicker id="mv-date" value={values.date} onChange={(d) => setValues((v) => ({ ...v, date: d }))} min={today} />
          </Field>
          <Field label="Saha" htmlFor="mv-venue">
            <Select id="mv-venue" value={values.venueId} onChange={set("venueId")}>
              <option value="0">Saha seçilmedi</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Başlangıç" htmlFor="mv-start" required error={errors.startTime}>
            <Input id="mv-start" type="time" value={values.startTime} onChange={set("startTime")} />
          </Field>
          <Field label="Bitiş" htmlFor="mv-end" required error={errors.endTime}>
            <Input id="mv-end" type="time" value={values.endTime} onChange={set("endTime")} />
          </Field>
        </div>
        {session ? (
          <label className="flex cursor-pointer items-center gap-3 text-[15px] text-ink">
            <input type="checkbox" className="h-5 w-5 accent-[var(--color-gs-red)]" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
            Grubun velilerine duyur
          </label>
        ) : null}
      </div>
    </Modal>
  );
}

/* ---------------- Sahalar ---------------- */

function Venues({ venues }: { venues: Venue[] }) {
  const [edit, setEdit] = useState<Venue | "new" | null>(null);
  const { busy, act } = useAct();
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button type="button" className="min-h-11" onClick={() => setEdit("new")}>
          + Saha ekle
        </Button>
      </div>
      {venues.length === 0 ? <p className="py-8 text-center text-muted">Henüz saha yok.</p> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {venues.map((v) => (
          <li key={v.id} className={["rounded-2xl border bg-white p-4 shadow-sm", v.active ? "border-line" : "border-dashed border-gray-300 opacity-70"].join(" ")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-lg font-bold text-ink">{v.name}</p>
                {v.address ? <p className="text-sm text-muted">{v.address}</p> : null}
                {v.note ? <p className="mt-1 text-sm text-ink">{v.note}</p> : null}
                <p className="mt-1 text-xs text-muted">{v.lat !== null ? `Konum: ${v.lat.toFixed(5)}, ${v.lng?.toFixed(5)}` : "Konum girilmedi (yol tarifi adresle aranır)"}</p>
              </div>
              {!v.active ? <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">Kullanım dışı</span> : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={directionLinks(v)[0]!.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:bg-surface">
                Haritada aç
              </a>
              <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEdit(v)}>
                Düzenle
              </Button>
              <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm" disabled={busy} onClick={() => act(() => setVenueActiveAction(v.id, !v.active), v.active ? "Kullanım dışı bırakıldı." : "Etkinleştirildi.")}>
                {v.active ? "Kullanım dışı bırak" : "Etkinleştir"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {edit ? <VenueDialog venue={edit === "new" ? null : edit} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function VenueDialog({ venue, onClose }: { venue: Venue | null; onClose: () => void }) {
  const [values, setValues] = useState<VenueFormValues>({
    name: venue?.name ?? "",
    address: venue?.address ?? "",
    location: venue?.lat !== null && venue?.lat !== undefined ? `${venue.lat}, ${venue.lng}` : "",
    note: venue?.note ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, act } = useAct();
  const set = (k: keyof VenueFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  return (
    <Modal
      open
      title={venue ? "Sahayı düzenle" : "Saha ekle"}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button
            type="button"
            loading={busy}
            onClick={() =>
              act(
                async () => {
                  const res = await saveVenueAction(venue?.id ?? null, values);
                  if (!res.ok) setErrors(res.fieldErrors ?? { form: res.error });
                  return res;
                },
                "Saha kaydedildi.",
                onClose,
              )
            }
          >
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form ? <Alert>{errors.form}</Alert> : null}
        <Field label="Saha adı" htmlFor="v-name" required error={errors.name}>
          <Input id="v-name" value={values.name} onChange={set("name")} invalid={Boolean(errors.name)} placeholder="Ör. Dumlupınar Stadı yan saha" />
        </Field>
        <Field label="Adres" htmlFor="v-address" error={errors.address}>
          <Input id="v-address" value={values.address} onChange={set("address")} />
        </Field>
        <Field label="Harita konumu" htmlFor="v-loc" error={errors.location} hint="Google Haritalar'da sahanın üstüne uzun basın; üstte çıkan koordinatı (ör. 39.42, 29.98) kopyalayıp buraya yapıştırın. Boş kalırsa adresle aranır.">
          <Input id="v-loc" value={values.location} onChange={set("location")} invalid={Boolean(errors.location)} />
        </Field>
        <Field label="Not (giriş kapısı, otopark…)" htmlFor="v-note" error={errors.note}>
          <Input id="v-note" value={values.note} onChange={set("note")} />
        </Field>
      </div>
    </Modal>
  );
}
