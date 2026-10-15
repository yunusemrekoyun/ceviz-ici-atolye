"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { loginAction, type LoginState } from "../actions";

const inputClass =
  "block min-h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 text-white outline-none transition placeholder:text-zinc-500 focus:border-[#fdb912] focus:ring-2 focus:ring-[#fdb912]/30";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState("CapsLock"));

  return (
    <form action={formAction} className="lp-glass grid gap-4 rounded-3xl p-5 sm:p-6" noValidate>
      <input type="hidden" name="next" value={next} />

      {state.error ? (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-zinc-200">
          Kullanıcı adı
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
          defaultValue={state.username ?? ""}
          key={state.username ?? ""}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-zinc-200">
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
            className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-xl text-zinc-400 transition hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-[#fdb912]"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {capsLock ? (
          <p id="caps-hint" className="mt-1.5 text-xs text-[#fdb912]">
            Caps Lock açık.
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="lp-btn mt-1 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold tracking-wide text-black shadow-xl transition duration-200 hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fdb912] disabled:cursor-wait disabled:opacity-70"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-zinc-500">Güvenlik için giriş yapılan cihaz ve IP adresi kaydedilir.</p>
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
