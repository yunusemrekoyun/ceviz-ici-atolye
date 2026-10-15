"use client";

import { useActionState, useState } from "react";
import { setPasswordAction, type SetPasswordState } from "../actions";

const inputClass = "gs-login-input";

export function SetPasswordForm({ token, min }: { token: string; min: number }) {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPasswordAction, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="gs-login-form">
      <input type="hidden" name="token" value={token} />
      {state.error ? (
        <p role="alert" className="gs-login-error">
          {state.error}
        </p>
      ) : null}
      <div>
        <label htmlFor="password" className="gs-login-label">
          Yeni şifre
        </label>
        <input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={min} required className={inputClass} />
        <p className="mt-1 gs-login-security">En az {min} karakter.</p>
      </div>
      <div>
        <label htmlFor="repeat" className="gs-login-label">
          Şifre (tekrar)
        </label>
        <input id="repeat" name="repeat" type={show ? "text" : "password"} autoComplete="new-password" minLength={min} required className={inputClass} />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[#625c62]">
        <input type="checkbox" className="h-5 w-5" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Şifreyi göster
      </label>
      <button type="submit" disabled={pending} className="gs-login-submit">
        {pending ? "Kaydediliyor…" : "Şifreyi kaydet"}
      </button>
    </form>
  );
}
