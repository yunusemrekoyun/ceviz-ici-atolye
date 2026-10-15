"use client";

import { DatePicker } from "@/components/Calendar";
import { BLOOD_GROUPS, CONTACT_PARENT_LABELS, CONTACT_PARENT_TYPES } from "@/lib/constants";
import { maskPhoneInput } from "@/lib/phone";
import { sanitizeTcInput, tcCheckProblem, tcSwapSuggestions } from "@/lib/tc";
import type { FieldErrors, RegistrationField, RegistrationFormValues } from "@/lib/registration-fields";
import { Card, Field, Input, Select, Textarea } from "@/components/ui";

export type FieldsProps = {
  values: RegistrationFormValues;
  errors: FieldErrors;
  onChange: (field: RegistrationField, value: string) => void;
  disabled?: boolean;
  idPrefix?: string;
  step?: string;
  /** Panelden eksik bilgiyle kayıt: öğrenci adı dışındaki alanlarda zorunlu işareti gösterilmez. */
  lenient?: boolean;
};

export const STUDENT_FIELDS: RegistrationField[] = [
  "studentTc",
  "studentFullName",
  "birthDate",
  "homeAddress",
  "studentPhone",
  "bloodGroup",
  "email",
];

export const FAMILY_FIELDS: RegistrationField[] = [
  "fatherFullName",
  "fatherTc",
  "fatherPhone",
  "motherFullName",
  "motherTc",
  "motherPhone",
  "contactParentType",
  "contactParentFullName",
  "contactParentPhone",
];

export const EMERGENCY_FIELDS: RegistrationField[] = ["emergencyFullName", "emergencyRelation", "emergencyPhone"];

const RELATION_SUGGESTIONS = [
  "Dede",
  "Babaanne",
  "Anneanne",
  "Amca",
  "Dayı",
  "Hala",
  "Teyze",
  "Abi",
  "Abla",
  "Enişte",
  "Yenge",
  "Komşu",
  "Aile Dostu",
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function useIds(prefix: string) {
  return (field: RegistrationField) => `${prefix}-${field}`;
}

export function StudentFieldsCard({ values, errors, onChange, disabled, idPrefix = "reg", step, lenient = false }: FieldsProps) {
  const id = useIds(idPrefix);
  return (
    <Card title="Öğrenci Bilgileri" step={step}>
      <Field label="T.C. Kimlik No" htmlFor={id("studentTc")} required={!lenient} error={errors.studentTc} hint="11 haneli">
        <Input
          id={id("studentTc")}
          name="studentTc"
          inputMode="numeric"
          autoComplete="off"
          maxLength={11}
          placeholder="Örn. 12345678901"
          value={values.studentTc}
          onChange={(e) => onChange("studentTc", sanitizeTcInput(e.target.value))}
          invalid={Boolean(errors.studentTc)}
          disabled={disabled}
        />
        {lenient ? <TcHint value={values.studentTc} onPick={(v) => onChange("studentTc", v)} /> : null}
      </Field>

      <Field label="Adı Soyadı" htmlFor={id("studentFullName")} required error={errors.studentFullName}>
        <Input
          id={id("studentFullName")}
          name="studentFullName"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={120}
          placeholder="Öğrencinin adı ve soyadı"
          value={values.studentFullName}
          onChange={(e) => onChange("studentFullName", e.target.value)}
          invalid={Boolean(errors.studentFullName)}
          disabled={disabled}
        />
      </Field>

      <Field label="Doğum Tarihi" htmlFor={id("birthDate")} required={!lenient} error={errors.birthDate}>
        <DatePicker
          id={id("birthDate")}
          value={values.birthDate}
          onChange={(day) => onChange("birthDate", day)}
          max={todayIso()}
          min="1990-01-01"
          years={{ from: 1990, to: Number(todayIso().slice(0, 4)) }}
          defaultMonth={`${Number(todayIso().slice(0, 4)) - 10}-01`}
          placeholder="Doğum tarihini seçiniz"
          invalid={Boolean(errors.birthDate)}
          describedBy={errors.birthDate ? `${id("birthDate")}-error` : undefined}
          disabled={disabled}
        />
      </Field>

      <Field label="Ev Adresi" htmlFor={id("homeAddress")} required={!lenient} error={errors.homeAddress}>
        <Textarea
          id={id("homeAddress")}
          name="homeAddress"
          autoComplete="street-address"
          maxLength={500}
          rows={3}
          placeholder="Mahalle, sokak, no, ilçe / il"
          value={values.homeAddress}
          onChange={(e) => onChange("homeAddress", e.target.value)}
          invalid={Boolean(errors.homeAddress)}
          disabled={disabled}
        />
      </Field>

      <Field
        label="İrtibat Telefonu"
        htmlFor={id("studentPhone")}
        required={!lenient}
        error={errors.studentPhone}
        hint="Öğrenciye ulaşılabilecek cep telefonu"
      >
        <Input
          id={id("studentPhone")}
          name="studentPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0555 555 55 55"
          value={values.studentPhone}
          onChange={(e) => onChange("studentPhone", maskPhoneInput(e.target.value))}
          invalid={Boolean(errors.studentPhone)}
          disabled={disabled}
        />
      </Field>

      <Field label="Kan Grubu" htmlFor={id("bloodGroup")} required={!lenient} error={errors.bloodGroup}>
        <Select
          id={id("bloodGroup")}
          name="bloodGroup"
          value={values.bloodGroup}
          onChange={(e) => onChange("bloodGroup", e.target.value)}
          invalid={Boolean(errors.bloodGroup)}
          disabled={disabled}
        >
          <option value="">Seçiniz</option>
          {BLOOD_GROUPS.map((bg) => (
            <option key={bg} value={bg}>
              {bg}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="E-mail" htmlFor={id("email")} error={errors.email}>
        <Input
          id={id("email")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          maxLength={254}
          placeholder="ornek@eposta.com"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          invalid={Boolean(errors.email)}
          disabled={disabled}
        />
      </Field>
    </Card>
  );
}

export function FamilyFieldsCard({ values, errors, onChange, disabled, idPrefix = "reg", step, lenient = false }: FieldsProps) {
  const id = useIds(idPrefix);
  const showOther = values.contactParentType === "diger";
  return (
    <Card
      title="Aile Bilgileri"
      step={step}
      subtitle="Anne ve baba bilgilerinden en az birini eksiksiz doldurunuz. İletişimde olunacak veli olarak seçtiğiniz kişinin bilgileri zorunludur."
    >
      <Field label="Baba Adı Soyadı" htmlFor={id("fatherFullName")} error={errors.fatherFullName}>
        <Input
          id={id("fatherFullName")}
          name="fatherFullName"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={120}
          value={values.fatherFullName}
          onChange={(e) => onChange("fatherFullName", e.target.value)}
          invalid={Boolean(errors.fatherFullName)}
          disabled={disabled}
        />
      </Field>
      <Field label="Baba T.C. Kimlik No" htmlFor={id("fatherTc")} error={errors.fatherTc}>
        <Input
          id={id("fatherTc")}
          name="fatherTc"
          inputMode="numeric"
          autoComplete="off"
          maxLength={11}
          value={values.fatherTc}
          onChange={(e) => onChange("fatherTc", sanitizeTcInput(e.target.value))}
          invalid={Boolean(errors.fatherTc)}
          disabled={disabled}
        />
        {lenient ? <TcHint value={values.fatherTc} onPick={(v) => onChange("fatherTc", v)} /> : null}
      </Field>
      <Field label="Baba GSM" htmlFor={id("fatherPhone")} error={errors.fatherPhone}>
        <Input
          id={id("fatherPhone")}
          name="fatherPhone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0555 555 55 55"
          value={values.fatherPhone}
          onChange={(e) => onChange("fatherPhone", maskPhoneInput(e.target.value))}
          invalid={Boolean(errors.fatherPhone)}
          disabled={disabled}
        />
      </Field>

      <hr className="border-line" />

      <Field label="Anne Adı Soyadı" htmlFor={id("motherFullName")} error={errors.motherFullName}>
        <Input
          id={id("motherFullName")}
          name="motherFullName"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={120}
          value={values.motherFullName}
          onChange={(e) => onChange("motherFullName", e.target.value)}
          invalid={Boolean(errors.motherFullName)}
          disabled={disabled}
        />
      </Field>
      <Field label="Anne T.C. Kimlik No" htmlFor={id("motherTc")} error={errors.motherTc}>
        <Input
          id={id("motherTc")}
          name="motherTc"
          inputMode="numeric"
          autoComplete="off"
          maxLength={11}
          value={values.motherTc}
          onChange={(e) => onChange("motherTc", sanitizeTcInput(e.target.value))}
          invalid={Boolean(errors.motherTc)}
          disabled={disabled}
        />
        {lenient ? <TcHint value={values.motherTc} onPick={(v) => onChange("motherTc", v)} /> : null}
      </Field>
      <Field label="Anne GSM" htmlFor={id("motherPhone")} error={errors.motherPhone}>
        <Input
          id={id("motherPhone")}
          name="motherPhone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0555 555 55 55"
          value={values.motherPhone}
          onChange={(e) => onChange("motherPhone", maskPhoneInput(e.target.value))}
          invalid={Boolean(errors.motherPhone)}
          disabled={disabled}
        />
      </Field>

      <hr className="border-line" />

      <Field label="İletişimde Olunacak Veli" htmlFor={id("contactParentType")} required={!lenient} error={errors.contactParentType}>
        <Select
          id={id("contactParentType")}
          name="contactParentType"
          value={values.contactParentType}
          onChange={(e) => onChange("contactParentType", e.target.value)}
          invalid={Boolean(errors.contactParentType)}
          disabled={disabled}
        >
          <option value="">Seçiniz</option>
          {CONTACT_PARENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CONTACT_PARENT_LABELS[t]}
            </option>
          ))}
        </Select>
      </Field>

      {showOther ? (
        <div className="grid gap-4 rounded-xl border border-gs-yellow bg-gs-yellow-soft p-4">
          <Field label="İletişim Velisi Ad Soyad" htmlFor={id("contactParentFullName")} required={!lenient} error={errors.contactParentFullName}>
            <Input
              id={id("contactParentFullName")}
              name="contactParentFullName"
              autoComplete="off"
              autoCapitalize="words"
              maxLength={120}
              value={values.contactParentFullName}
              onChange={(e) => onChange("contactParentFullName", e.target.value)}
              invalid={Boolean(errors.contactParentFullName)}
              disabled={disabled}
            />
          </Field>
          <Field label="İletişim Velisi Telefon" htmlFor={id("contactParentPhone")} required={!lenient} error={errors.contactParentPhone}>
            <Input
              id={id("contactParentPhone")}
              name="contactParentPhone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="0555 555 55 55"
              value={values.contactParentPhone}
              onChange={(e) => onChange("contactParentPhone", maskPhoneInput(e.target.value))}
              invalid={Boolean(errors.contactParentPhone)}
              disabled={disabled}
            />
          </Field>
        </div>
      ) : null}
    </Card>
  );
}

export function EmergencyFieldsCard({ values, errors, onChange, disabled, idPrefix = "reg", step, lenient = false }: FieldsProps) {
  const id = useIds(idPrefix);
  const listId = `${idPrefix}-relation-suggestions`;
  return (
    <Card title="Acil Durumda Velisi Dışında Ulaşılacak Kişi" step={step}>
      <Field label="Adı Soyadı" htmlFor={id("emergencyFullName")} required={!lenient} error={errors.emergencyFullName}>
        <Input
          id={id("emergencyFullName")}
          name="emergencyFullName"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={120}
          value={values.emergencyFullName}
          onChange={(e) => onChange("emergencyFullName", e.target.value)}
          invalid={Boolean(errors.emergencyFullName)}
          disabled={disabled}
        />
      </Field>
      <Field label="Yakınlık Durumu" htmlFor={id("emergencyRelation")} required={!lenient} error={errors.emergencyRelation} hint="Örn. Dede, Teyze, Amca">
        <Input
          id={id("emergencyRelation")}
          name="emergencyRelation"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={80}
          list={listId}
          value={values.emergencyRelation}
          onChange={(e) => onChange("emergencyRelation", e.target.value)}
          invalid={Boolean(errors.emergencyRelation)}
          disabled={disabled}
        />
        <datalist id={listId}>
          {RELATION_SUGGESTIONS.map((r) => (
            <option key={r} value={r} />
          ))}
        </datalist>
      </Field>
      <Field label="Telefon" htmlFor={id("emergencyPhone")} required={!lenient} error={errors.emergencyPhone}>
        <Input
          id={id("emergencyPhone")}
          name="emergencyPhone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="0555 555 55 55"
          value={values.emergencyPhone}
          onChange={(e) => onChange("emergencyPhone", maskPhoneInput(e.target.value))}
          invalid={Boolean(errors.emergencyPhone)}
          disabled={disabled}
        />
      </Field>
    </Card>
  );
}

/** Panelde: kontrol haneleri tutmayan T.C. için uyarı ve olası doğru numaralar (kaydı durdurmaz). */
function TcHint({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  const problem = tcCheckProblem(value);
  if (!problem) return null;
  const suggestions = tcSwapSuggestions(value);
  return (
    <div role="status" className="mt-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/25">
      <p>
        <span className="font-semibold">Bozuk veri: bu numara T.C. kontrolünden geçmiyor</span> ({problem}). Kimlikten bir kez daha bakın.
      </p>
      {suggestions.length ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
          Yan yana iki rakam karışmış olabilir:
          {suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onPick(s)} className="cursor-pointer rounded-lg bg-white px-2 py-1 font-mono text-[13px] font-semibold text-ink ring-1 ring-inset ring-amber-600/30 transition hover:bg-amber-100">
              {s}
            </button>
          ))}
        </p>
      ) : null}
      <p className="mt-1.5 text-xs text-amber-800">Kayıt yine de yapılır; numara Veri Kontrolü&apos;nde işaretli kalır.</p>
    </div>
  );
}

