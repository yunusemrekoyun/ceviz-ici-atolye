/**
 * İzin kataloğu. Roller (DB `roles`) bu anahtarların alt kümesidir; yeni rol açmak kod gerektirmez.
 * Client'tan da import edilebilir (DB bağımlılığı yok).
 */
export const PORTALS = ["admin", "coach", "guardian"] as const;
export type Portal = (typeof PORTALS)[number];
export const PORTAL_LABELS: Record<Portal, string> = { admin: "Yönetim paneli", coach: "Antrenör paneli", guardian: "Veli paneli" };

export const PERMISSIONS = [
  { key: "kayit.gor", group: "Öğrenciler", label: "Başvuruları ve öğrencileri görür" },
  { key: "kayit.duzenle", group: "Öğrenciler", label: "Randevu verir, okula kaydeder, bilgileri düzenler" },
  { key: "kayit.sil", group: "Öğrenciler", label: "Kayıt siler" },
  { key: "hassas.gor", group: "Öğrenciler", label: "TC, adres ve sağlık bilgilerini görür" },
  { key: "aidat.gor", group: "Aidat", label: "Aidat durumlarını ve ödemeleri görür" },
  { key: "aidat.al", group: "Aidat", label: "Ödeme kaydeder, veli bildirimlerini onaylar / reddeder" },
  { key: "erisim.ac", group: "Aidat", label: "Ödeme sözü girer (söz gününe kadar antrenmana devam)" },
  { key: "program.yonet", group: "Antrenman", label: "Sahaları, grup programını ve seansları yönetir" },
  { key: "yoklama.al", group: "Antrenman", label: "Kart okutur ve yoklama alır" },
  { key: "gelisim.gir", group: "Antrenman", label: "Ölçüm, test sonucu, değerlendirme ve seans günlüğü girer" },
  { key: "tum.gruplar", group: "Antrenman", label: "Tüm grupları görür (kapalıysa yalnız atandığı gruplar)" },
  { key: "duyuru.yap", group: "İletişim", label: "Duyuru yayınlar" },
  { key: "veli.yonet", group: "İletişim", label: "Veli hesaplarını açar, davet gönderir, şifre sıfırlar" },
  { key: "metin.yonet", group: "Sistem", label: "Onay ve bilgi metinlerini düzenler, yayınlar" },
  { key: "ekip.yonet", group: "Sistem", label: "Kullanıcıları, rolleri ve hoca tanıtımlarını yönetir" },
  { key: "ayar.yonet", group: "Sistem", label: "Aidat tutarı gibi sistem ayarlarını değiştirir" },
  { key: "rapor.gor", group: "Sistem", label: "Raporları görür, Excel alır" },
  { key: "guvenlik.gor", group: "Sistem", label: "Güvenlik kayıtlarını ve işlem geçmişini görür" },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.key);
export const PERMISSION_KEYS = new Set<string>(ALL_PERMISSIONS);

/** Rolün izin listesini güvenle çözer (bilinmeyen anahtarlar atılır). */
export function parsePermissions(raw: string | null | undefined): Permission[] {
  try {
    const list = JSON.parse(raw ?? "[]") as unknown;
    return Array.isArray(list) ? (list.filter((k) => typeof k === "string" && PERMISSION_KEYS.has(k)) as Permission[]) : [];
  } catch {
    return [];
  }
}
