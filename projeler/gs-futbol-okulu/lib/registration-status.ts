/** Ön kayıt süreci. Client bileşenlerinden de kullanılır (DB bağımlılığı yok). */
export const REGISTRATION_STATUSES = ["pending", "scheduled", "no_show", "enrolled", "cancelled", "left"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Randevu bekliyor",
  scheduled: "Randevu verildi",
  no_show: "Gelmedi",
  enrolled: "Kayıt oldu",
  cancelled: "Vazgeçti",
  left: "Ayrıldı",
};

export const STATUS_BADGE: Record<RegistrationStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25",
  scheduled: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20",
  no_show: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20",
  enrolled: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20",
  cancelled: "bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-500/15",
  left: "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-500/15",
};

export function isRegistrationStatus(value: string): value is RegistrationStatus {
  return (REGISTRATION_STATUSES as readonly string[]).includes(value);
}

export function statusLabel(value: string): string {
  return isRegistrationStatus(value) ? STATUS_LABELS[value] : value;
}
