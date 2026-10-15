"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/Toast";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { formatPhone, maskPhoneInput } from "@/lib/phone";
import { saveSettingsAction, type SettingsFormValues } from "./actions";

export function SettingsForm({ initial }: { initial: SettingsFormValues }) {
  const [values, setValues] = useState<SettingsFormValues>({ ...initial, contactPhone: formatPhone(initial.contactPhone) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const set = (k: Exclude<keyof SettingsFormValues, "evaluationCriteria" | "cardAttendance">) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const criteria = values.evaluationCriteria;
  const setCriteria = (next: string[]) => setValues((v) => ({ ...v, evaluationCriteria: next }));

  const submit = () =>
    startTransition(async () => {
      const res = await saveSettingsAction(values);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { form: res.error });
        return;
      }
      setErrors({});
      toast({ text: "Ayarlar kaydedildi." });
      router.refresh();
    });

  return (
    <form
      className="mt-5 grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {errors.form ? <Alert>{errors.form}</Alert> : null}
      <Card title="Aidat">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Aidat (₺) · 8 antrenman" htmlFor="fee" required error={errors.fee} hint="Bir aidat, grubun sıradaki 8 antrenmanını kapsar. Yeni tutar bundan sonra açılan paketlere uygulanır.">
            <Input id="fee" inputMode="decimal" value={values.fee} onChange={set("fee")} placeholder="örn. 1500" invalid={Boolean(errors.fee)} />
          </Field>
          <Field label="Tolerans (gün)" htmlFor="grace" required error={errors.graceDays} hint="Yenileme gününden sonra aidat gelmeden kaç gün daha antrenmana katılabilir.">
            <Input id="grace" inputMode="numeric" value={values.graceDays} onChange={set("graceDays")} invalid={Boolean(errors.graceDays)} />
          </Field>
          <Field label="Hatırlatma (yenilemeden kaç gün önce)" htmlFor="remind" required error={errors.reminderDaysBefore}>
            <Input id="remind" inputMode="numeric" value={values.reminderDaysBefore} onChange={set("reminderDaysBefore")} invalid={Boolean(errors.reminderDaysBefore)} />
          </Field>
        </div>
      </Card>
      <Card title="Genel">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Okul iletişim telefonu" htmlFor="phone" required error={errors.contactPhone} hint="Ana sayfada, veli panelinde, makbuzda ve öğrenci kartında görünür; Ara ve WhatsApp düğmeleri bu numaraya gider.">
            <Input id="phone" inputMode="tel" value={values.contactPhone} onChange={(e) => setValues((v) => ({ ...v, contactPhone: maskPhoneInput(e.target.value) }))} invalid={Boolean(errors.contactPhone)} />
          </Field>
          <Field label="Devamsızlık uyarısı (üst üste)" htmlFor="absence" required error={errors.absenceAlertCount} hint="Bu kadar antrenmana üst üste gelmeyen öğrenci için uyarı oluşur.">
            <Input id="absence" inputMode="numeric" value={values.absenceAlertCount} onChange={set("absenceAlertCount")} invalid={Boolean(errors.absenceAlertCount)} />
          </Field>
        </div>
      </Card>
      <Card title="Yoklama">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={values.cardAttendance} onChange={(e) => setValues((v) => ({ ...v, cardAttendance: e.target.checked }))} className="mt-1 h-5 w-5 shrink-0 accent-gs-red" />
          <span>
            <span className="block text-[15px] font-semibold text-ink">Kartla yoklama</span>
            <span className="block text-sm text-muted">Açıkken yoklama ekranında &ldquo;Kart okut&rdquo; düğmesi çıkar. Öğrenci kartları basılıp dağıtılana kadar kapalı kalsın; yoklama elle alınır.</span>
          </span>
        </label>
      </Card>
      <Card title="Antrenör değerlendirme kriterleri" subtitle="Gelişim raporunda antrenörün 1–5 puan verdiği başlıklar.">
        <ul className="grid gap-2">
          {criteria.map((c, i) => (
            <li key={i} className="flex gap-2">
              <Input aria-label={`Kriter ${i + 1}`} value={c} maxLength={40} onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? e.target.value : x)))} />
              <Button type="button" variant="ghost" className="min-h-12 px-3 text-red-700 hover:bg-red-50" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))} aria-label={`${c} kriterini sil`}>
                Sil
              </Button>
            </li>
          ))}
        </ul>
        {errors.evaluationCriteria ? <p className="text-sm font-medium text-red-700">{errors.evaluationCriteria}</p> : null}
        {criteria.length < 12 ? (
          <Button type="button" variant="secondary" className="min-h-11 justify-self-start" onClick={() => setCriteria([...criteria, ""])}>
            + Kriter ekle
          </Button>
        ) : null}
      </Card>
      <div className="flex justify-end">
        <Button type="submit" className="min-h-12 px-8" loading={busy}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
