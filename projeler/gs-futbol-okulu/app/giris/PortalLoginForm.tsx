"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { portalLoginAction, type PortalLoginState } from "./actions";

const inputClass = "gs-login-input";

export function PortalLoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<PortalLoginState, FormData>(portalLoginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState("CapsLock"));

  return (
    <form action={formAction} className="gs-login-form" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <p role="alert" className="gs-login-error">
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="identifier" className="gs-login-label">
          Öğrenci numarası ya da e-posta
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
          defaultValue={state.identifier ?? ""}
          key={state.identifier ?? ""}
          aria-describedby="identifier-hint"
          className={inputClass}
        />
      </div>

      <p id="identifier-hint" className="gs-login-hint">Veliler kartın üstündeki öğrenci numarasıyla, antrenörler kullanıcı adıyla girer.</p>

      <div>
        <label htmlFor="password" className="gs-login-label">
          Şifre
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            onKeyUp={trackCapsLock}
            onKeyDown={trackCapsLock}
            aria-describedby={capsLock ? "caps-hint" : undefined}
            className={`${inputClass} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            aria-pressed={showPassword}
            className="gs-login-eye"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {capsLock ? (
          <p id="caps-hint" className="mt-1.5 text-sm text-[#941d3b]">
            Caps Lock açık.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="gs-login-submit"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
      <p className="gs-login-security">Güvenlik için giriş yapılan cihaz ve IP adresi kaydedilir.</p>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.1M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a10.4 10.4 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M2 2l20 20" />
    </svg>
  );
}
