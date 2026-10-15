import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

// SiteSetting tablosunda group="system" altında saklanır, değerler "true"/"false" string.
// Kayıt hiç yoksa buradaki varsayılan geçerli olur — UI de aynı varsayılanı gösterir.
export const SYSTEM_SETTING_DEFAULTS = {
  "system.autoRenewalAlerts": true,
  "system.newMemberRegistration": true,
  "system.maintenanceMode": false,
} as const;

export type SystemSettingKey = keyof typeof SYSTEM_SETTING_DEFAULTS;
export type SystemSettings = Record<SystemSettingKey, boolean>;

export const SYSTEM_SETTINGS_TAG = "system-settings";

function withDefaults(stored: Map<string, string>): SystemSettings {
  const entries = Object.entries(SYSTEM_SETTING_DEFAULTS) as [SystemSettingKey, boolean][];
  return Object.fromEntries(
    entries.map(([key, fallback]) => {
      const raw = stored.get(key);
      return [key, raw === undefined ? fallback : raw === "true"];
    })
  ) as SystemSettings;
}

/**
 * DB'den taze okur — cron gibi cache'in bayat kalmasının kabul edilemez olduğu yerler için.
 *
 * DB'ye ulaşılamazsa varsayılanlara düşer. Bu bilinçli: root layout bu fonksiyonu
 * çağırıyor ve build sırasında statik sayfalar prerender edilirken DB ayakta
 * olmayabilir. Varsayılanlarda bakım modu kapalı olduğu için en kötü ihtimalle
 * site normal çalışmaya devam eder — DB hatası yüzünden tüm site bakım ekranına
 * düşmesinden çok daha iyi.
 */
export async function readSystemSettings(): Promise<SystemSettings> {
  try {
    const rows = await prisma.siteSetting.findMany({ where: { group: "system" } });
    return withDefaults(new Map(rows.map((r) => [r.key, r.value])));
  } catch (e) {
    console.error("[settings] okunamadı, varsayılanlara düşülüyor:", e);
    return withDefaults(new Map());
  }
}

/**
 * Her sayfa isteğinde okunduğu için cache'li sürüm.
 * Ayarlar kaydedilince /api/settings revalidateTag ile bunu anında temizler.
 */
export const getSystemSettings = unstable_cache(readSystemSettings, ["system-settings"], {
  revalidate: 60,
  tags: [SYSTEM_SETTINGS_TAG],
});
