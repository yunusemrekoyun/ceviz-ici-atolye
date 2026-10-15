"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { Modal } from "@/components/Modal";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionResult } from "@/lib/admin-action";
import type { Drill } from "@/lib/db/schema";
import type { TestView } from "@/lib/development";
import { saveDrillAction, saveTestAction, setDrillActiveAction, setTestActiveAction, type DrillFormValues, type TestFormValues } from "./actions";

const CATEGORIES = { teknik: "Teknik", taktik: "Taktik", kondisyon: "Kondisyon", oyun: "Oyun" } as Record<string, string>;
type Props = { mode: "tests" | "drills"; tests: TestView[]; drills: Drill[]; groups: { id: number; name: string }[] };

function useAct() {
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();
  const act = (fn: () => Promise<ActionResult>, ok: string, after?: () => void, onError?: (r: ActionResult & { ok: false }) => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        if (onError) onError(res);
        else toast({ kind: "error", text: res.error });
        return;
      }
      toast({ text: ok });
      after?.();
      router.refresh();
    });
  return { busy, act };
}

export function DevelopmentSettings(props: Props) {
  return props.mode === "tests" ? <Tests {...props} /> : <Drills drills={props.drills} />;
}

function Tests({ tests, groups }: Props) {
  const [edit, setEdit] = useState<TestView | "new" | null>(null);
  const { busy, act } = useAct();
  return (
    <>
      <Alert kind="info">Hangi testlerin yapılacağı okul ile birlikte belirlenecek. Buradan kod değişikliği olmadan test ekleyebilir, düzenleyebilir ya da kullanım dışı bırakabilirsiniz.</Alert>
      <div className="my-4 flex justify-end">
        <Button type="button" className="min-h-11" onClick={() => setEdit("new")}>
          + Test ekle
        </Button>
      </div>
      {tests.length === 0 ? <p className="py-6 text-center text-muted">Henüz test yok. Örnek: 20 m sürat (sn, düşük iyi), dikey sıçrama (cm, yüksek iyi).</p> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {tests.map((t) => (
          <li key={t.id} className={["rounded-2xl border bg-white p-4 shadow-sm", t.active ? "border-line" : "border-dashed opacity-70"].join(" ")}>
            <p className="font-bold text-ink">
              {t.name} <span className="font-normal text-muted">({t.unit})</span>
            </p>
            <p className="text-sm text-muted">
              {t.higherBetter ? "Yüksek değer daha iyi" : "Düşük değer daha iyi"} · {t.groups.length ? t.groups.map((g) => groups.find((x) => x.id === g)?.name ?? `#${g}`).join(", ") : "Tüm gruplar"}
            </p>
            {t.description ? <p className="mt-1 text-sm text-ink">{t.description}</p> : null}
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEdit(t)}>
                Düzenle
              </Button>
              <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm" disabled={busy} onClick={() => act(() => setTestActiveAction(t.id, !t.active), t.active ? "Kullanım dışı." : "Etkin.")}>
                {t.active ? "Kullanım dışı bırak" : "Etkinleştir"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {edit ? <TestDialog test={edit === "new" ? null : edit} groups={groups} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function TestDialog({ test, groups, onClose }: { test: TestView | null; groups: Props["groups"]; onClose: () => void }) {
  const [v, setV] = useState<TestFormValues>({
    name: test?.name ?? "",
    unit: test?.unit ?? "",
    higherBetter: test?.higherBetter ?? true,
    decimals: String(test?.decimals ?? 1),
    groupIds: test?.groups ?? [],
    description: test?.description ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, act } = useAct();
  return (
    <Modal
      open
      title={test ? "Testi düzenle" : "Test ekle"}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" loading={busy} onClick={() => act(() => saveTestAction(test?.id ?? null, v), "Kaydedildi.", onClose, (r) => setErrors(r.fieldErrors ?? { form: r.error }))}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form ? <Alert>{errors.form}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Test adı" htmlFor="t-name" required error={errors.name}>
            <Input id="t-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
          </Field>
          <Field label="Birim" htmlFor="t-unit" required error={errors.unit}>
            <Input id="t-unit" value={v.unit} onChange={(e) => setV({ ...v, unit: e.target.value })} placeholder="sn, cm, adet" />
          </Field>
          <Field label="Hangisi daha iyi?" htmlFor="t-dir">
            <Select id="t-dir" value={v.higherBetter ? "1" : "0"} onChange={(e) => setV({ ...v, higherBetter: e.target.value === "1" })}>
              <option value="1">Yüksek değer (ör. sıçrama)</option>
              <option value="0">Düşük değer (ör. sürat süresi)</option>
            </Select>
          </Field>
          <Field label="Ondalık basamak" htmlFor="t-dec">
            <Select id="t-dec" value={v.decimals} onChange={(e) => setV({ ...v, decimals: e.target.value })}>
              <option value="0">0 (tam sayı)</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-ink">Gruplar (boşsa tümü)</legend>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => {
              const on = v.groupIds.includes(g.id);
              return (
                <button key={g.id} type="button" aria-pressed={on} onClick={() => setV({ ...v, groupIds: on ? v.groupIds.filter((x) => x !== g.id) : [...v.groupIds, g.id] })} className={["min-h-10 cursor-pointer rounded-full border px-3 text-sm font-semibold", on ? "border-gs-red bg-gs-red text-white" : "border-line"].join(" ")}>
                  {g.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field label="Nasıl yapılır (antrenöre not)" htmlFor="t-desc">
          <Textarea id="t-desc" rows={3} className="py-2" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function Drills({ drills }: { drills: Drill[] }) {
  const [edit, setEdit] = useState<Drill | "new" | null>(null);
  const { busy, act } = useAct();
  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button type="button" className="min-h-11" onClick={() => setEdit("new")}>
          + Drill ekle
        </Button>
      </div>
      {drills.length === 0 ? <p className="py-6 text-center text-muted">Drill yok. Antrenörler günlükte buradaki drill&apos;leri seçer.</p> : null}
      <ul className="grid gap-3 md:grid-cols-2">
        {drills.map((d) => (
          <li key={d.id} className={["rounded-2xl border bg-white p-4 shadow-sm", d.active ? "border-line" : "border-dashed opacity-70"].join(" ")}>
            <p className="font-bold text-ink">
              {d.name} <span className="ml-1 rounded bg-surface px-1.5 text-xs font-semibold text-muted">{CATEGORIES[d.category] ?? d.category}</span>
            </p>
            {d.description ? <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{d.description}</p> : null}
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => setEdit(d)}>
                Düzenle
              </Button>
              <Button type="button" variant="ghost" className="min-h-10 px-3 text-sm" disabled={busy} onClick={() => act(() => setDrillActiveAction(d.id, !d.active), d.active ? "Kullanım dışı." : "Etkin.")}>
                {d.active ? "Kullanım dışı bırak" : "Etkinleştir"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {edit ? <DrillDialog drill={edit === "new" ? null : edit} onClose={() => setEdit(null)} /> : null}
    </>
  );
}

function DrillDialog({ drill, onClose }: { drill: Drill | null; onClose: () => void }) {
  const [v, setV] = useState<DrillFormValues>({ name: drill?.name ?? "", category: drill?.category ?? "teknik", description: drill?.description ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { busy, act } = useAct();
  return (
    <Modal
      open
      title={drill ? "Drill düzenle" : "Drill ekle"}
      onClose={onClose}
      dismissOnOverlay={false}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Vazgeç
          </Button>
          <Button type="button" loading={busy} onClick={() => act(() => saveDrillAction(drill?.id ?? null, v), "Kaydedildi.", onClose, (r) => setErrors(r.fieldErrors ?? { form: r.error }))}>
            Kaydet
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {errors.form ? <Alert>{errors.form}</Alert> : null}
        <Field label="Ad" htmlFor="d-name" required error={errors.name}>
          <Input id="d-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Kategori" htmlFor="d-cat">
          <Select id="d-cat" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
            {Object.entries(CATEGORIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Açıklama" htmlFor="d-desc">
          <Textarea id="d-desc" rows={4} className="py-2" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}
