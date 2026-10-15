"use server";

import { headers } from "next/headers";
import { logServerError } from "@/lib/api";
import { createCallbackRequest } from "@/lib/callbacks";
import { notify } from "@/lib/notifications";
import { tidyName } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export type CallbackState = { ok?: boolean; error?: string; fieldErrors?: { fullName?: string; phone?: string }; values?: { fullName: string; phone: string } };

const LIMIT = { max: 5, windowMs: 30 * 60 * 1000 };

/** Ana sayfadaki "Sizi Arayalım" formu. */
export async function requestCallbackAction(_prev: CallbackState, formData: FormData): Promise<CallbackState> {
  // Herkese açık uç: formdan gelmeyen (elle üretilmiş) çağrılar sessizce reddedilir.
  if (!(formData instanceof FormData)) return { error: "Geçersiz istek." };
  const fullNameRaw = String(formData.get("fullName") ?? "").slice(0, 200);
  const phoneRaw = String(formData.get("phone") ?? "").slice(0, 40);
  const values = { fullName: fullNameRaw, phone: phoneRaw };

  // Bot tuzağı: görünmez alan doluysa sessizce başarılı say.
  if (String(formData.get("website") ?? "") !== "") return { ok: true };

  const fullName = tidyName(fullNameRaw);
  const phone = normalizePhone(phoneRaw);
  const fieldErrors: CallbackState["fieldErrors"] = {};
  if (fullName.length < 3) fieldErrors.fullName = "Ad soyad giriniz.";
  else if (fullName.length > 120) fieldErrors.fullName = "Ad soyad en fazla 120 karakter olabilir.";
  if (!phone) fieldErrors.phone = "Geçerli bir cep telefonu giriniz (örn. 0555 555 55 55).";
  if (fieldErrors.fullName || fieldErrors.phone) return { values, fieldErrors };

  const limit = checkRateLimit(`callback:${getClientIp(await headers())}`, Date.now(), LIMIT);
  if (!limit.allowed) return { values, error: "Çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin veya bizi arayın." };

  try {
    createCallbackRequest(fullName, phone!);
    notify({ permission: "kayit.gor", kind: "arama.yeni", title: "Sizi arayalım talebi", body: fullName, link: "/admin/arama-talepleri" });
  } catch (err) {
    logServerError("callback request", err);
    return { values, error: "Talebiniz alınamadı. Lütfen tekrar deneyin veya bizi arayın." };
  }
  return { ok: true };
}
