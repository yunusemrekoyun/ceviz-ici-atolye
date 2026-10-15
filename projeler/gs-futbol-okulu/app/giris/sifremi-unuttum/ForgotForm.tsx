"use client";

import { useActionState } from "react";
import { formatPhone } from "@/lib/phone";
import { telLink, whatsappLink } from "@/lib/whatsapp";
import { forgotPasswordAction, type ForgotState } from "./actions";

export function ForgotForm({ phone }: { phone: string }) {
  const [state, action, pending] = useActionState<ForgotState, FormData>(forgotPasswordAction, {});
  const help = (
    <div className="mt-4 grid gap-2">
      <p className="gs-login-security">E-postanız kayıtlı değilse okul size yeni bağlantı gönderebilir:</p>
      <div className="gs-login-help">
        <a href={telLink(phone)}>
          Ara · {formatPhone(phone)}
        </a>
        <a href={whatsappLink(phone, "Merhaba, veli paneli şifremi yenilemek istiyorum.")} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
      </div>
    </div>
  );
  if (state.done)
    return (
      <div role="status">
        <p>Bilgileriniz kayıtlı bir e-postayla eşleşiyorsa şifre yenileme bağlantısı gönderildi. Gelen kutunuzu (ve istenmeyen klasörünü) kontrol edin.</p>
        {help}
      </div>
    );
  return (
    <form action={action} className="gs-login-form">
      {state.error ? <p role="alert" className="gs-login-error">{state.error}</p> : null}
      <div>
        <label htmlFor="identifier" className="gs-login-label">
          Öğrenci numarası ya da e-posta
        </label>
        <input id="identifier" name="identifier" autoCapitalize="none" required className="gs-login-input" />
      </div>
      <button type="submit" disabled={pending} className="gs-login-submit">
        {pending ? "Gönderiliyor…" : "Bağlantı gönder"}
      </button>
      {help}
    </form>
  );
}
