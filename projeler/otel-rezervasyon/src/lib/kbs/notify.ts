import { prisma } from '@/lib/prisma';
import { getKbsConfig, type KbsConfig } from './config';
import {
  musteriKimlikNoCikis,
  musteriKimlikNoGiris,
  musteriYabanciCikis,
  musteriYabanciGiris,
  type KbsSonuc,
} from './client';

// Check-in/check-out → KBS bildirim akışı. Çağrılar check-in'i BLOKLAMAZ
// (route'ta after() ile koşulur); her misafir-işlem bir KbsBildirim satırı
// olarak izlenir, hatalılar panelden tekrar denenebilir.

interface KbsPerson {
  guestId: string | null; // null = rezervasyon sahibi
  name: string;
  tcKimlikNo: string | null;
  passportNo: string | null;
  birthDate: Date | null;
  isChild: boolean;
}

function maskId(id: string): string {
  return id.length <= 3 ? '***' : '*'.repeat(id.length - 3) + id.slice(-3);
}

type ReservationWithGuests = NonNullable<Awaited<ReturnType<typeof loadReservation>>>;

function loadReservation(reservationId: string) {
  return prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { room: { select: { name: true } }, guests: true },
  });
}

function personsOf(reservation: ReservationWithGuests): KbsPerson[] {
  const lead: KbsPerson = {
    guestId: null,
    name: `${reservation.firstName} ${reservation.lastName}`.trim(),
    tcKimlikNo: reservation.tcKimlikNo,
    passportNo: reservation.passportNo,
    birthDate: reservation.birthDate,
    isChild: false,
  };
  const guests = reservation.guests.map((g) => ({
    guestId: g.id,
    name: `${g.firstName} ${g.lastName}`.trim(),
    tcKimlikNo: g.tcKimlikNo,
    passportNo: g.passportNo,
    birthDate: g.birthDate,
    isChild: g.isChild,
  }));
  return [lead, ...guests];
}

async function sendGiris(
  config: KbsConfig,
  reservation: ReservationWithGuests,
  person: KbsPerson,
): Promise<KbsSonuc> {
  const common = {
    girisTarihi: new Date(),
    odaNo: reservation.room.name,
    plakaNo: person.guestId === null ? reservation.vehiclePlate : null,
    telNo: person.guestId === null ? reservation.phone : null,
  };
  if (person.tcKimlikNo) {
    return musteriKimlikNoGiris(config, { ...common, kimlikNo: person.tcKimlikNo });
  }
  const [adi, ...rest] = person.name.split(/\s+/);
  return musteriYabanciGiris(config, {
    ...common,
    belgeNo: person.passportNo!,
    adi,
    soyadi: rest.join(' ') || adi,
    dogumTarihi: person.birthDate,
  });
}

function sendCikis(config: KbsConfig, person: KbsPerson): Promise<KbsSonuc> {
  if (person.tcKimlikNo) return musteriKimlikNoCikis(config, person.tcKimlikNo, new Date());
  return musteriYabanciCikis(config, person.passportNo!, new Date());
}

async function processPerson(
  config: KbsConfig,
  reservation: ReservationWithGuests,
  person: KbsPerson,
  islemTipi: 'giris' | 'cikis',
): Promise<void> {
  // Idempotency: aynı kişi-işlem daha önce başarıyla gönderildiyse tekrarlama.
  const already = await prisma.kbsBildirim.findFirst({
    where: { reservationId: reservation.id, guestId: person.guestId, islemTipi, durum: 'gonderildi' },
    select: { id: true },
  });
  if (already) return;

  const idValue = person.tcKimlikNo ?? person.passportNo;
  const base = {
    reservationId: reservation.id,
    guestId: person.guestId,
    islemTipi,
    guestName: person.name,
    kimlikNo: idValue ? maskId(idValue) : null,
    odaNo: reservation.room.name,
  };

  // Kimliği olmayan kişi (tipik olarak çocuk) bildirilemez — izlenebilirlik
  // için 'atlandi' kaydı düşülür.
  if (!idValue) {
    await prisma.kbsBildirim.create({
      data: {
        ...base,
        durum: 'atlandi',
        mesaj: person.isChild
          ? 'Kimlik numarası olmayan çocuk misafir — KBS bildirimi yapılmadı.'
          : 'TC kimlik no / pasaport no eksik — bildirilemedi.',
      },
    });
    return;
  }

  const row = await prisma.kbsBildirim.create({ data: { ...base, durum: 'bekliyor' } });
  const sonuc =
    islemTipi === 'giris'
      ? await sendGiris(config, reservation, person)
      : await sendCikis(config, person);
  await applySonuc(row.id, sonuc);
}

async function applySonuc(rowId: string, sonuc: KbsSonuc): Promise<void> {
  await prisma.kbsBildirim.update({
    where: { id: rowId },
    data: {
      durum: sonuc.basarili ? 'gonderildi' : 'hata',
      hataKodu: sonuc.basarili ? 100 : sonuc.hataKodu || null,
      mesaj: sonuc.basarili
        ? [sonuc.adi, sonuc.soyadi].filter(Boolean).join(' ') || sonuc.mesaj
        : `${sonuc.hataAdi}${sonuc.mesaj ? `: ${sonuc.mesaj}` : ''}`,
      denemeSayisi: { increment: 1 },
      gonderimZamani: new Date(),
    },
  });
}

async function dispatch(reservationId: string, islemTipi: 'giris' | 'cikis'): Promise<void> {
  const config = await getKbsConfig();
  if (!config.enabled) return; // entegrasyon kapalı → sessizce geç

  const reservation = await loadReservation(reservationId);
  if (!reservation) return;

  for (const person of personsOf(reservation)) {
    // Çıkışta yalnız girişi başarıyla bildirilenler için çıkış gönderilir.
    if (islemTipi === 'cikis') {
      const girisVar = await prisma.kbsBildirim.findFirst({
        where: { reservationId, guestId: person.guestId, islemTipi: 'giris', durum: 'gonderildi' },
        select: { id: true },
      });
      if (!girisVar) continue;
    }
    try {
      await processPerson(config, reservation, person, islemTipi);
    } catch (error) {
      console.error(`KBS ${islemTipi} bildirimi başarısız (${person.name}):`, error);
    }
  }
}

/** Check-in sonrası: rezervasyondaki her misafir için giriş bildirimi. */
export function dispatchKbsGiris(reservationId: string): Promise<void> {
  return dispatch(reservationId, 'giris');
}

/** Check-out sonrası: girişi bildirilen her misafir için çıkış bildirimi. */
export function dispatchKbsCikis(reservationId: string): Promise<void> {
  return dispatch(reservationId, 'cikis');
}

/** Hatalı bir bildirimi panelden tekrar dener. */
export async function retryKbsBildirim(bildirimId: string): Promise<{ ok: boolean; message: string }> {
  const row = await prisma.kbsBildirim.findUnique({ where: { id: bildirimId } });
  if (!row) return { ok: false, message: 'Bildirim kaydı bulunamadı.' };
  if (row.durum === 'gonderildi') return { ok: false, message: 'Bu bildirim zaten gönderilmiş.' };

  const config = await getKbsConfig();
  if (!config.enabled) return { ok: false, message: 'KBS entegrasyonu kapalı veya yapılandırılmamış.' };

  const reservation = await loadReservation(row.reservationId);
  if (!reservation) return { ok: false, message: 'Rezervasyon bulunamadı.' };

  const person = personsOf(reservation).find((p) => p.guestId === row.guestId);
  if (!person || !(person.tcKimlikNo || person.passportNo)) {
    return { ok: false, message: 'Misafirin kimlik bilgisi hâlâ eksik.' };
  }

  const sonuc =
    row.islemTipi === 'giris'
      ? await sendGiris(config, reservation, person)
      : await sendCikis(config, person);
  await applySonuc(row.id, sonuc);

  return sonuc.basarili
    ? { ok: true, message: 'Bildirim başarıyla gönderildi.' }
    : { ok: false, message: `Gönderilemedi — ${sonuc.hataAdi}${sonuc.mesaj ? `: ${sonuc.mesaj}` : ''}` };
}
