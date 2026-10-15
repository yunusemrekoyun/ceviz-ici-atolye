import { formatMoney } from "@/lib/billing-shared";
import type { CashDay } from "@/lib/cashbook-shared";
import { BRAND_NAME } from "@/lib/constants";
import { formatDayLongTr, formatTimeTr, istanbulDayKey } from "@/lib/format";
import { toInternationalPhone } from "@/lib/phone";

/** Normalize telefon (05XXXXXXXXX) için hazır mesajlı WhatsApp bağlantısı. */
export function whatsappLink(normalizedPhone: string, text?: string): string {
  const number = toInternationalPhone(normalizedPhone).replace("+", "");
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Alıcısı WhatsApp'ta seçilecek hazır mesaj (gün sonu özeti gibi). */
export function whatsappShareLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function telLink(normalizedPhone: string): string {
  return `tel:${toInternationalPhone(normalizedPhone)}`;
}

function greeting(parentName: string): string {
  const first = parentName.trim().split(" ")[0];
  return first ? `Merhaba ${first},` : "Merhaba,";
}

/** Randevu bildirimi / hatırlatması. */
export function appointmentMessage(parentName: string, studentName: string, appointmentAt: string): string {
  const day = formatDayLongTr(istanbulDayKey(appointmentAt));
  return `${greeting(parentName)} ${BRAND_NAME} olarak ${studentName} için asıl kayıt randevunuz ${day} saat ${formatTimeTr(appointmentAt)} olarak planlanmıştır. Görüşmek üzere.`;
}

/** Randevu verilmeden önceki ilk temas. */
export function firstContactMessage(parentName: string, studentName: string): string {
  return `${greeting(parentName)} ${BRAND_NAME} olarak ${studentName} için yaptığınız ön kayıt bize ulaştı. Asıl kayıt için size uygun gün ve saati öğrenebilir miyiz?`;
}

/** Gelmeyen veliye yeni randevu teklifi. */
export function missedMessage(parentName: string, studentName: string): string {
  return `${greeting(parentName)} ${BRAND_NAME} olarak ${studentName} için planlanan kayıt randevusunda sizi göremedik. Size uygun yeni bir gün ve saat öğrenebilir miyiz?`;
}

/** Aidat hatırlatması (antrenman hakkı yenilenecek) ya da hakkı bitti bildirimi. */
export function paymentReminderMessage(parentName: string, studentName: string, amount: string, dueDayLabel: string, locked: boolean): string {
  return locked
    ? `${greeting(parentName)} ${BRAND_NAME} olarak ${studentName} için 8 antrenmanlık hakkı sona erdi; ${amount} tutarındaki aidat alınana kadar antrenmanlara katılamıyor. Ödeme yaptıysanız lütfen bize bildirin.`
    : `${greeting(parentName)} ${BRAND_NAME} olarak ${studentName} için 8 antrenmanlık hakkın yenilenmesi gerekiyor. ${amount} tutarındaki aidat için son gün ${dueDayLabel}. Hatırlatmak istedik, iyi günler dileriz.`;
}

/** Ödeme sözü hatırlatması: veli ödeyeceği günü söylemişti. */
export function promiseReminderMessage(parentName: string, studentName: string, amount: string, dayText: string): string {
  return `${greeting(parentName)} ${BRAND_NAME} olarak ${studentName} için ${amount} tutarındaki aidatı ${dayText} ödeyeceğinizi not almıştık. Hatırlatmak istedik, iyi günler dileriz.`;
}

/** Az gelen öğrencinin velisine nazik bir soru. */
export function attendanceCheckMessage(parentName: string, studentName: string): string {
  return `${greeting(parentName)} ${BRAND_NAME} olarak ${studentName} son antrenmanlara pek katılamadı, her şey yolunda mı? Bir ihtiyacınız olursa buradayız.`;
}

/** Ödeme alındı / makbuz metni. */
export function receiptMessage(parentName: string, studentName: string, amount: string, receiptNo: string, periodLabel: string): string {
  return `${greeting(parentName)} ${studentName} için ${amount} tutarındaki aidat alınmıştır; antrenman hakkı tanımlandı (${periodLabel}). Makbuz no: ${receiptNo}. Teşekkür ederiz. ${BRAND_NAME}`;
}

/** Asıl kayıt tamamlanınca veliye hoş geldin mesajı. */
export type WelcomeInfo = {
  parentName: string;
  studentName: string;
  studentNo: number | null;
  group?: { name: string; years: string } | null;
  /** "Cumartesi 10:00–11:30 · Zafer Stadı Yan Saha" */
  slots?: string[];
  /** "3 Ekim Cumartesi 10:00" */
  firstTraining?: string | null;
  mapUrl?: string | null;
  /** Aidat ve forma için hazır satırlar. */
  fee?: string | null;
  kit?: string[];
};

/** Okula kayıttan sonra veliye: grup, antrenman günleri ve yeri, ilk antrenman, aidat ve forma durumu. */
export function welcomeMessage(w: WelcomeInfo): string {
  const lines: (string | null)[] = [
    `${greeting(w.parentName)} ${w.studentName} için ${BRAND_NAME} kaydı tamamlandı, aramıza hoş geldiniz!${w.studentNo ? ` Öğrenci numarası: ${w.studentNo}.` : ""}`,
    "",
    w.group ? `Grubu: ${w.group.name} (${w.group.years} doğumlular)` : null,
    ...(w.slots?.length ? ["Antrenmanlar:", ...w.slots.map((s) => `- ${s}`)] : ["Antrenman günleri ve saatleri için bizimle iletişimde kalabilirsiniz."]),
    w.firstTraining ? `İlk antrenmanı: ${w.firstTraining}` : null,
    w.mapUrl ? `Yol tarifi: ${w.mapUrl}` : null,
    w.fee || w.kit?.length ? "" : null,
    w.fee ?? null,
    ...(w.kit ?? []),
    "",
    "Antrenmana forma, su ve krampon / halı saha ayakkabısıyla gelmesi yeterli. Görüşmek üzere!",
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

/** Veli daveti / şifre bağlantısı. */
export function guardianInviteMessage(parentName: string, studentNos: string, link: string, reset = false): string {
  return reset
    ? `${greeting(parentName)} ${BRAND_NAME} veli paneli şifrenizi yenilemek için bağlantı: ${link} (7 gün geçerli). Giriş: öğrenci numarası ${studentNos}.`
    : `${greeting(parentName)} ${BRAND_NAME} veli paneline davetlisiniz. Çocuğunuzun antrenman programı, devamı, gelişimi ve aidat durumu burada. Şifrenizi belirlemek için: ${link} (7 gün geçerli). Girişte kullanacağınız öğrenci numarası: ${studentNos}.`;
}

/** Gün sonu kasa özeti: toplam, nakit / havale ve tek tek ödemeler (iptaller hariç). */
export function cashDayMessage(day: CashDay, filterLabel?: string): string {
  const valid = day.entries.filter((e) => !e.voided);
  return [
    BRAND_NAME,
    `${formatDayLongTr(day.day)} kasası${filterLabel ? ` (${filterLabel})` : ""}`,
    "",
    `Toplam: ${formatMoney(day.total)} (${day.count} ödeme)`,
    `Nakit: ${formatMoney(day.cash)}`,
    `Havale: ${formatMoney(day.eft)}`,
    ...(day.forma && day.aidat ? [`Aidat ${formatMoney(day.aidat)} · Forma ${formatMoney(day.forma)}`] : []),
    "",
    ...valid.map((e) => `- ${e.studentName}: ${e.kind === "aidat" ? `aidat (${e.what})` : e.what}, ${e.method === "eft" ? "havale" : "nakit"}, ${formatMoney(e.amountKurus)}`),
  ].join("\n");
}

/** Veli grubuna antrenman hatırlatması (alıcı WhatsApp'ta seçilir): "Yarın (Cumartesi) 10:00–11:30 …". */
export function trainingReminderMessage(input: { group: string; when: string; time: string; venue: string | null; mapUrl?: string | null }): string {
  return [
    `Merhaba, ${input.group} antrenmanımız ${input.when} ${input.time} saatlerinde${input.venue ? ` ${input.venue}'da` : ""}.`,
    "Çocuklarımızı forma, su ve krampon / halı saha ayakkabısıyla bekliyoruz.",
    input.mapUrl ? `Yol tarifi: ${input.mapUrl}` : null,
    BRAND_NAME,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Haftalık program metni (veli grubu ya da duyuru için). */
export function programMessage(rows: { group: string; years: string; ages?: string; slots: { day: string; startTime: string; endTime: string; venue: string | null }[] }[], dateText: string): string {
  const lines = [`${BRAND_NAME} · Antrenman programı (${dateText})`, ""];
  for (const r of rows) {
    if (!r.slots.length) continue;
    lines.push(`*${r.group}* (${r.years} doğumlu${r.ages ? `, ${r.ages} yaş` : ""})`);
    for (const s of r.slots) lines.push(`- ${s.day} ${s.startTime}–${s.endTime}${s.venue ? ` · ${s.venue}` : ""}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
