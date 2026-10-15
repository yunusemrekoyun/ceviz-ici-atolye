import { prisma } from '@/lib/prisma';
import { decryptSecret } from './crypto';

// KBS configuration lives in SystemSetting so the hotel owner can manage it
// from the admin panel. The web-service password is stored encrypted; all
// other keys are plain. The service only accepts calls from the registered
// static IP, so every KBS call must run on the server.

export const KBS_SETTING_KEYS = [
  'kbs_enabled',
  'kbs_authority',
  'kbs_endpoint',
  'kbs_tesis_kodu',
  'kbs_kullanici_tc',
  'kbs_web_servis_sifresi',
] as const;

export const JANDARMA_ENDPOINT =
  'https://vatandas.jandarma.gov.tr/KBS_Tesis_Servis/SrvShsYtkTml.svc';

export type KbsAuthority = 'egm' | 'jandarma';

export interface KbsConfig {
  enabled: boolean;
  authority: KbsAuthority;
  /** Resolved service URL (override > authority default). Null → not usable. */
  endpoint: string | null;
  tesisKodu: string;
  kullaniciTc: string;
  /** Decrypted web-service password ('' when unset). Never send to the client. */
  sifre: string;
  /** True when endpoint + tesis kodu + TC + şifre are all present. */
  configured: boolean;
}

export async function getKbsConfig(): Promise<KbsConfig> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...KBS_SETTING_KEYS] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  const authority: KbsAuthority = map.get('kbs_authority') === 'jandarma' ? 'jandarma' : 'egm';
  const override = map.get('kbs_endpoint')?.trim() || '';
  const endpoint = override || (authority === 'jandarma' ? JANDARMA_ENDPOINT : null);

  let sifre = '';
  const stored = map.get('kbs_web_servis_sifresi');
  if (stored) {
    try {
      sifre = decryptSecret(stored);
    } catch (error) {
      console.error('KBS şifresi çözülemedi (KBS_SECRET_KEY değişmiş olabilir):', error);
    }
  }

  const tesisKodu = map.get('kbs_tesis_kodu')?.trim() ?? '';
  const kullaniciTc = map.get('kbs_kullanici_tc')?.trim() ?? '';
  const configured = !!(endpoint && tesisKodu && kullaniciTc && sifre);

  return {
    enabled: map.get('kbs_enabled') === 'true' && configured,
    authority,
    endpoint,
    tesisKodu,
    kullaniciTc,
    sifre,
    configured,
  };
}
