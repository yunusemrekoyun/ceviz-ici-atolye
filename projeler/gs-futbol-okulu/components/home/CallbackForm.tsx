"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { requestCallbackAction, type CallbackState } from "@/app/callback-actions";
import { maskPhoneInput } from "@/lib/phone";

const input =
  "block min-h-12 w-full rounded-xl border-[1.5px] bg-white px-3.5 text-[17px] text-[#121618] outline-none transition-[border-color,box-shadow] placeholder:text-[#7a837f] focus:border-[#1d5a3e] focus:ring-4 focus:ring-[#1d5a3e]/15";

/** "Sizi arayalım": ad ve telefon bırakılır, panelde Arama Talepleri'ne düşer. */
export function CallbackForm() {
  const [state, formAction, pending] = useActionState<CallbackState, FormData>(requestCallbackAction, {});
  const [phone, setPhone] = useState(state.values?.phone ?? "");

  if (state.ok)
    return (
      <div className="py-6 text-center" role="status">
        <span className="gs-magnet gs-magnet--yellow mx-auto h-14 w-14" aria-hidden="true">
          <Check className="h-7 w-7" strokeWidth={3} />
        </span>
        <p className="gs-condensed mt-4 text-[26px] font-extrabold">Talebiniz alındı</p>
        <p className="mt-1 text-[17px] text-[#46504c]">En kısa sürede sizi arayacağız.</p>
      </div>
    );

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      {state.error ? (
        <p role="alert" className="rounded-xl bg-[#fbe9ee] px-3.5 py-2.5 text-[15px] font-semibold text-[#86022a]">
          {state.error}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <label htmlFor="cb-name" className="text-[15px] font-bold">
          Adınız soyadınız
        </label>
        <input
          id="cb-name"
          name="fullName"
          autoComplete="name"
          maxLength={120}
          defaultValue={state.values?.fullName ?? ""}
          aria-invalid={Boolean(state.fieldErrors?.fullName) || undefined}
          aria-describedby={state.fieldErrors?.fullName ? "cb-name-error" : undefined}
          className={`${input} ${state.fieldErrors?.fullName ? "border-[#c8102e]" : "border-[#c9d1cd]"}`}
        />
        {state.fieldErrors?.fullName ? (
          <p id="cb-name-error" className="text-[14px] font-semibold text-[#a50d26]">
            {state.fieldErrors.fullName}
          </p>
        ) : null}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="cb-phone" className="text-[15px] font-bold">
          Telefonunuz
        </label>
        <input
          id="cb-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0555 555 55 55"
          value={phone}
          onChange={(e) => setPhone(maskPhoneInput(e.target.value))}
          aria-invalid={Boolean(state.fieldErrors?.phone) || undefined}
          aria-describedby={state.fieldErrors?.phone ? "cb-phone-error" : undefined}
          className={`${input} gs-tabular ${state.fieldErrors?.phone ? "border-[#c8102e]" : "border-[#c9d1cd]"}`}
        />
        {state.fieldErrors?.phone ? (
          <p id="cb-phone-error" className="text-[14px] font-semibold text-[#a50d26]">
            {state.fieldErrors.phone}
          </p>
        ) : null}
      </div>
      {/* Bot tuzağı: kullanıcılar görmez */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <button type="submit" disabled={pending} className="gs-btn gs-btn--ink w-full disabled:cursor-wait disabled:opacity-70">
        {pending ? "Gönderiliyor…" : "Beni arayın"}
      </button>
      <p className="text-[13px] text-[#5b6460]">Bilgileriniz yalnız sizinle iletişim kurmak için kullanılır.</p>
    </form>
  );
}
