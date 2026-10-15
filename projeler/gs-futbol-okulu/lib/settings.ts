import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { settings } from "@/lib/db/schema";

/**
 * Sistem ayarları. Her anahtarın doğrulayıcısı ve varsayılanı burada; veritabanında yalnız değiştirilenler durur.
 * Para tutarları kuruş cinsinden tamsayı tutulur.
 */
const DEFS = {
  feeAmountKurus: { schema: z.number().int().min(0).max(100_000_00), fallback: 0 },
  graceDays: { schema: z.number().int().min(0).max(31), fallback: 3 },
  absenceAlertCount: { schema: z.number().int().min(1).max(20), fallback: 3 },
  reminderDaysBefore: { schema: z.number().int().min(0).max(10), fallback: 2 },
  // Velilere gösterilen okul telefonu (normalize: 05XXXXXXXXX).
  contactPhone: { schema: z.string().max(20), fallback: "05333905868" },
  // Kartla yoklama (Kart okut): kartlar basılıp dağıtılana kadar kapalı, yoklama elle alınır.
  cardAttendance: { schema: z.boolean(), fallback: false },
  evaluationCriteria: {
    schema: z.array(z.string().trim().min(1).max(40)).max(12),
    fallback: ["Teknik", "Oyun anlayışı", "Kondisyon", "Takım oyunu", "Disiplin"],
  },
} satisfies Record<string, { schema: z.ZodType; fallback: unknown }>;

type Defs = typeof DEFS;
export type SettingKey = keyof Defs;
export type Settings = { [K in SettingKey]: z.infer<Defs[K]["schema"]> };

export const SETTING_KEYS = Object.keys(DEFS) as SettingKey[];

export function getSettings(): Settings {
  const rows = getDb().select().from(settings).all();
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const out = {} as Record<string, unknown>;
  for (const key of SETTING_KEYS) {
    const def = DEFS[key];
    const raw = stored.get(key);
    let value: unknown = def.fallback;
    if (raw !== undefined) {
      try {
        const parsed = def.schema.safeParse(JSON.parse(raw));
        if (parsed.success) value = parsed.data;
      } catch {
        // bozuk değer: varsayılan kullanılır
      }
    }
    out[key] = value;
  }
  return out as Settings;
}

export function getSetting<K extends SettingKey>(key: K): Settings[K] {
  return getSettings()[key];
}

export function settingSchema<K extends SettingKey>(key: K): Defs[K]["schema"] {
  return DEFS[key].schema;
}

/** Değeri doğrular ve yazar; geçersizse hata fırlatır. */
export function setSetting<K extends SettingKey>(key: K, value: Settings[K], userId: number | null): void {
  const parsed = DEFS[key].schema.parse(value);
  const json = JSON.stringify(parsed);
  const now = new Date().toISOString();
  getDb()
    .insert(settings)
    .values({ key, value: json, updatedAt: now, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value: json, updatedAt: now, updatedBy: userId } })
    .run();
}

export function isSettingStored(key: SettingKey): boolean {
  return Boolean(getDb().select({ key: settings.key }).from(settings).where(eq(settings.key, key)).get());
}
