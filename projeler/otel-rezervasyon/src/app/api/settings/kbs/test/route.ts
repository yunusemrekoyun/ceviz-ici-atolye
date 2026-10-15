import { NextRequest, NextResponse } from 'next/server';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { getKbsConfig } from '@/lib/kbs/config';
import { parametreListele } from '@/lib/kbs/client';

export const runtime = 'nodejs';

// "Bağlantıyı Test Et" — sunucudan ParametreListele çağırır; şifre tarayıcıya
// hiç inmeden müşteri kurulumunu kendisi doğrular. Yanıtta yalnız sonuç döner.

const FRIENDLY: Record<string, string> = {
  YetkiHatasi:
    'Yetki hatası (108): tesis kodu, yetkili TC, şifre veya sunucu IP kaydı hatalı. KBS portalındaki "Web Servis İşlemleri" bilgileriyle karşılaştırın; sunucunun statik IP\'sinin kayıtlı olduğundan emin olun.',
  VTHatasi: 'KBS tarafında geçici veritabanı hatası (105) — birazdan tekrar deneyin.',
  ZamanAsimi: 'Servis yanıt vermedi — ağ/erişim engeli olabilir (IP kaydı veya güvenlik duvarı).',
  BaglantiHatasi: 'Servise ulaşılamadı — adresi ve sunucunun internet çıkışını kontrol edin.',
};

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
  }

  try {
    const config = await getKbsConfig();
    if (!config.configured) {
      return NextResponse.json(
        { ok: false, message: 'Önce servis adresi, tesis kodu, yetkili TC ve şifreyi kaydedin.' },
        { status: 400 },
      );
    }

    const sonuc = await parametreListele(config);
    if (sonuc.basarili) {
      return NextResponse.json({
        ok: true,
        message: 'Bağlantı başarılı — KBS kimlik bilgileri ve IP kaydı doğrulandı.',
      });
    }

    return NextResponse.json({
      ok: false,
      hataKodu: sonuc.hataKodu || undefined,
      message:
        FRIENDLY[sonuc.hataAdi] ??
        `Bağlantı başarısız — ${sonuc.hataAdi}${sonuc.mesaj ? `: ${sonuc.mesaj}` : ''}`,
    });
  } catch (error) {
    console.error('KBS bağlantı testi hatası:', error);
    return NextResponse.json({ ok: false, message: 'Test sırasında beklenmeyen bir hata oluştu.' }, { status: 500 });
  }
}
