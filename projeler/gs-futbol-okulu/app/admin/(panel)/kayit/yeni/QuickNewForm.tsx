"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronRight } from "lucide-react";
import { Page, PageHeader, Panel } from "@/components/admin/kit";
import { useToast } from "@/components/admin/Toast";
import { DatePicker } from "@/components/Calendar";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";
import { istanbulDayKey } from "@/lib/format";
import { quickCreateAction, type QuickNewValues } from "../../actions";
import { Choice } from "../../aidat/BillingParts";

/**
 * Sahada yeni kayıt: dört bilgi yeter (öğrenci adı, doğum tarihi, veli, telefon). "Ekle ve okula kaydet"
 * doğrudan okula kayıt sayfasına geçer; T.C., adres, sağlık gibi bilgiler sonra dosyadan tamamlanır.
 */
export function QuickNewForm() {
  const router = useRouter();
  const toast = useToast();
  const today = istanbulDayKey(new Date());
  const thisYear = Number(today.slice(0, 4));
  const [values, setValues] = useState<QuickNewValues>({ studentFullName: "", birthDate: "", parentType: "anne", parentFullName: "", phone: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [intent, setIntent] = useState<"candidate" | "enroll">("enroll");
  const [pending, startTransition] = useTransition();
  const set = (key: keyof QuickNewValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const submit = (next: "candidate" | "enroll") => {
    setIntent(next);
    startTransition(async () => {
      const res = await quickCreateAction(values);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.fieldErrors ? null : res.error);
        return;
      }
      toast({ text: `${values.studentFullName.trim()} eklendi.` });
      router.push(next === "enroll" ? `/admin/kayit/${res.id}/asil-kayit` : `/admin/kayit/${res.id}`);
      router.refresh();
    });
  };

  const parentLabel = values.parentType === "anne" ? "Annenin" : values.parentType === "baba" ? "Babanın" : "Velinin";

  return (
    <Page width="narrow">
      <PageHeader back={{ href: "/admin/on-kayitlar", label: "Başvurular" }} title="Yeni kayıt" description="Sahada gelen veli için dört bilgi yeter; kalanı sonra dosyadan tamamlanır." />
      <form
        className="grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          submit(submitter?.dataset.intent === "candidate" ? "candidate" : "enroll");
        }}
      >
        {formError ? <Alert>{formError}</Alert> : null}
        <Panel>
          <div className="grid gap-4">
            <Field label="Öğrencinin adı soyadı" htmlFor="q-name" required error={errors.studentFullName}>
              <Input id="q-name" value={values.studentFullName} onChange={set("studentFullName")} autoFocus autoComplete="off" autoCapitalize="words" invalid={Boolean(errors.studentFullName)} className="min-h-12" />
            </Field>
            <Field label="Doğum tarihi" htmlFor="q-birth" hint="Grup, doğum yılına göre önerilir." error={errors.birthDate}>
              <DatePicker
                id="q-birth"
                value={values.birthDate ?? ""}
                onChange={(day) => setValues((v) => ({ ...v, birthDate: day }))}
                max={today}
                min="2005-01-01"
                years={{ from: 2005, to: thisYear }}
                defaultMonth={`${thisYear - 9}-01`}
                placeholder="Seçin"
                clearable
              />
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">Veli</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["anne", "Anne"],
                    ["baba", "Baba"],
                    ["diger", "Diğer"],
                  ] as const
                ).map(([v, label]) => (
                  <Choice key={v} on={values.parentType === v} onClick={() => setValues((x) => ({ ...x, parentType: v }))}>
                    <span className="font-semibold">{label}</span>
                  </Choice>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`${parentLabel} adı soyadı`} htmlFor="q-parent" error={errors.parentFullName}>
                <Input id="q-parent" value={values.parentFullName} onChange={set("parentFullName")} autoComplete="off" autoCapitalize="words" className="min-h-12" />
              </Field>
              <Field label="Telefon" htmlFor="q-phone" error={errors.phone}>
                <Input id="q-phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} placeholder="05xx xxx xx xx" autoComplete="off" className="min-h-12" />
              </Field>
            </div>
            {showNote || values.note ? (
              <Field label="Not" htmlFor="q-note">
                <Textarea id="q-note" value={values.note} onChange={set("note")} maxLength={500} rows={2} autoFocus={showNote && !values.note} className="min-h-16 py-2 text-[15px]" />
              </Field>
            ) : (
              <button type="button" onClick={() => setShowNote(true)} className="inline-flex min-h-9 cursor-pointer items-center justify-self-start rounded-lg px-1 text-sm font-semibold text-gs-red hover:underline pointer-coarse:min-h-11">
                + Not ekle
              </button>
            )}
          </div>
        </Panel>

        <Link href="/admin/kayit/yeni?tam=1" className="group flex min-h-12 items-center justify-between rounded-xl px-1 text-[15px] font-semibold text-ink hover:text-gs-red">
          <span>
            Tüm bilgileri şimdi gir
            <span className="block text-sm font-normal text-muted">T.C., adres, anne-baba, sağlık ve acil durum bilgileri</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>

        <div className="no-print sticky bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 -mx-4 grid grid-cols-2 gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:flex sm:justify-end sm:rounded-2xl sm:border lg:bottom-4">
          {/* Enter "Ekle ve okula kaydet"i seçer (formun ilk gönder düğmesi), görsel sırada sağda durur. */}
          <Button type="submit" size="md" data-intent="enroll" loading={pending && intent === "enroll"} disabled={pending} className="order-last">
            Ekle ve okula kaydet
          </Button>
          <Button type="submit" size="md" variant="secondary" data-intent="candidate" loading={pending && intent === "candidate"} disabled={pending}>
            Aday olarak ekle
          </Button>
        </div>
      </form>
    </Page>
  );
}
