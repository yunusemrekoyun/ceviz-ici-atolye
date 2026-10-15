import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';
import { getKbsConfig, JANDARMA_ENDPOINT } from '@/lib/kbs/config';
import { encryptSecret, isKbsCryptoConfigured } from '@/lib/kbs/crypto';

export const runtime = 'nodejs';

// KBS ayarları — yalnız admin. Şifre write-only: kaydedilir ama asla geri
// okunmaz (GET yalnızca kayıtlı olup olmadığını söyler).

async function requireAdmin(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') return null;
  return auth;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });

  try {
    const config = await getKbsConfig();
    const enabledSetting = await prisma.systemSetting.findUnique({ where: { key: 'kbs_enabled' } });
    return NextResponse.json({
      ok: true,
      settings: {
        enabled: enabledSetting?.value === 'true',
        authority: config.authority,
        endpoint: config.endpoint ?? '',
        defaultJandarmaEndpoint: JANDARMA_ENDPOINT,
        tesisKodu: config.tesisKodu,
        kullaniciTc: config.kullaniciTc,
        sifreSet: !!config.sifre,
        configured: config.configured,
        cryptoReady: isKbsCryptoConfigured(),
      },
    });
  } catch (error) {
    console.error('KBS ayarları okunamadı:', error);
    return NextResponse.json({ ok: false, message: 'Ayarlar okunamadı.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, message: 'Geçersiz istek.' }, { status: 400 });
    }

    const { enabled, authority, endpoint, tesisKodu, kullaniciTc, sifre } = body as {
      enabled?: boolean;
      authority?: string;
      endpoint?: string;
      tesisKodu?: string;
      kullaniciTc?: string;
      sifre?: string;
    };

    const updates: Record<string, string> = {};

    if (authority !== undefined) {
      if (!['egm', 'jandarma'].includes(authority)) {
        return NextResponse.json({ ok: false, message: 'Geçersiz yetki alanı.' }, { status: 400 });
      }
      updates.kbs_authority = authority;
    }

    if (endpoint !== undefined) {
      const value = String(endpoint).trim();
      if (value && !/^https:\/\/.+/i.test(value)) {
        return NextResponse.json(
          { ok: false, message: 'Servis adresi https:// ile başlamalı.' },
          { status: 400 },
        );
      }
      updates.kbs_endpoint = value;
    }

    if (tesisKodu !== undefined) {
      const value = String(tesisKodu).trim();
      if (value && !/^\d{1,10}$/.test(value)) {
        return NextResponse.json(
          { ok: false, message: 'Tesis kodu yalnız rakamlardan oluşmalı.' },
          { status: 400 },
        );
      }
      updates.kbs_tesis_kodu = value;
    }

    if (kullaniciTc !== undefined) {
      const value = String(kullaniciTc).trim();
      if (value && !/^\d{11}$/.test(value)) {
        return NextResponse.json(
          { ok: false, message: 'Yetkili TC kimlik no 11 haneli olmalı.' },
          { status: 400 },
        );
      }
      updates.kbs_kullanici_tc = value;
    }

    if (sifre !== undefined && String(sifre).length > 0) {
      const value = String(sifre);
      if (value.length > 50) {
        return NextResponse.json({ ok: false, message: 'Şifre en fazla 50 karakter olabilir.' }, { status: 400 });
      }
      if (!isKbsCryptoConfigured()) {
        return NextResponse.json(
          {
            ok: false,
            message:
              'Sunucuda KBS_SECRET_KEY tanımlı değil — şifre güvenli saklanamaz. .env dosyasına ekleyin (örn. `openssl rand -hex 32`).',
          },
          { status: 503 },
        );
      }
      updates.kbs_web_servis_sifresi = encryptSecret(value);
    }

    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    // Etkinleştirme en son: kayıt sonrası config gerçekten tamam mı?
    if (enabled !== undefined) {
      if (enabled === true) {
        const config = await getKbsConfig();
        if (!config.configured) {
          return NextResponse.json(
            { ok: false, message: 'Etkinleştirmek için önce servis adresi, tesis kodu, yetkili TC ve şifre eksiksiz kaydedilmeli.' },
            { status: 400 },
          );
        }
      }
      await prisma.systemSetting.upsert({
        where: { key: 'kbs_enabled' },
        update: { value: enabled ? 'true' : 'false' },
        create: { key: 'kbs_enabled', value: enabled ? 'true' : 'false' },
      });
    }

    await writeAuditLog({
      request,
      auth,
      action: 'settings.kbs',
      entityType: 'system_setting',
      entityId: 'kbs',
      summary: `KBS ayarları güncellendi (${[
        ...Object.keys(updates).map((k) => k.replace('kbs_', '')),
        ...(enabled !== undefined ? [`enabled=${enabled}`] : []),
      ].join(', ') || 'değişiklik yok'})`,
    });

    const config = await getKbsConfig();
    return NextResponse.json({
      ok: true,
      settings: {
        enabled: config.enabled,
        configured: config.configured,
        sifreSet: !!config.sifre,
      },
    });
  } catch (error) {
    console.error('KBS ayarları kaydedilemedi:', error);
    return NextResponse.json({ ok: false, message: 'Ayarlar kaydedilemedi.' }, { status: 500 });
  }
}
