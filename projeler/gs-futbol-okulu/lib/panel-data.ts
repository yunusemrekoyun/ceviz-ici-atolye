import { toRegistrationDto, type RegistrationDto } from "@/lib/api";
import { listAgeGroups } from "@/lib/age-groups-db";
import type { AgeGroupView } from "@/lib/age-groups";
import { listRegistrations } from "@/lib/registrations";
import { duplicateMap } from "@/lib/duplicates";
import { pendingSubmissions } from "@/lib/merge";
import { accessMap, ensurePeriodsToday, listDiscounts, todayKey } from "@/lib/billing";
import { payStatus, type PayStatus } from "@/lib/billing-shared";
import { getSettings } from "@/lib/settings";

/** Panel sayfalarının ortak verisi: tüm kayıtlar (türetilmiş alanlarla) ve yaş grupları. */
/** `sensitive` false ise TC, adres ve kan grubu sunucuda boşaltılır (tarayıcıya hiç gitmez). */
export function loadPanelData(now: Date = new Date(), sensitive = true): { registrations: RegistrationDto[]; groups: AgeGroupView[] } {
  const rows = listRegistrations();
  const dups = duplicateMap(rows);
  const subs = pendingSubmissions();
  const registrations = rows.map((r) => {
    const dto = { ...toRegistrationDto(r, now), duplicates: dups.get(r.id) ?? [], submission: subs.get(r.id) ?? null };
    if (sensitive) return dto;
    const hidden = { studentTc: "", fatherTc: "", motherTc: "", homeAddress: "", bloodGroup: "" };
    return { ...dto, studentTc: null, fatherTc: null, motherTc: null, homeAddress: "", bloodGroup: "", submission: dto.submission ? { ...dto.submission, values: { ...dto.submission.values, ...hidden } } : null };
  });
  const groups = listAgeGroups().map(({ id, name, minBirthYear, maxBirthYear }) => ({ id, name, minBirthYear, maxBirthYear }));
  return { registrations, groups };
}

export type BillingOptions = {
  feeKurus: number;
  graceDays: number;
  canCollect: boolean;
  discounts: { name: string; percent: number }[];
  /** Asıl kayıtta ödeme sözü (ödeyeceği gün) girebilir mi (erisim.ac). */
  canPromise?: boolean;
};

/** Kayıt listeleri için aidat özeti: izin yoksa hiç hesaplanmaz. */
export function loadBillingView(
  registrations: Pick<RegistrationDto, "id" | "status">[],
  perms: { view: boolean; collect: boolean },
): { access?: Record<number, PayStatus>; billing: BillingOptions } {
  const { feeAmountKurus: feeKurus, graceDays } = getSettings();
  const billing = { feeKurus, graceDays, canCollect: perms.collect, discounts: listDiscounts().map((d) => ({ name: d.name, percent: d.percents[0] ?? 0 })) };
  if (!perms.view) return { billing };
  ensurePeriodsToday();
  const enrolled = registrations.filter((r) => r.status === "enrolled");
  // Listelerde ödeme dili (K-19): Gecikti, Ödeme günü geldi, İlk aidat bekleniyor, Söz verdi, Ödemesi yaklaşıyor
  const today = todayKey();
  const access: Record<number, PayStatus> = {};
  for (const [id, a] of accessMap(enrolled, today)) access[id] = payStatus(a, today);
  return { access, billing };
}
