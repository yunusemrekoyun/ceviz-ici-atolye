import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Page, PageHeader } from "@/components/admin/kit";
import { can, requireAdmin } from "@/lib/auth/server";
import type { Permission } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Nasıl yapılır?" };

type Task = { q: string; steps: string[]; note?: string; href: string; go: string; perm?: Permission };

/**
 * Personel için kısa kullanım kılavuzu: her iş bir soru, birkaç adım ve o ekrana giden düğme.
 * Düğme ve sekme adları paneldekilerle birebir aynı yazılır.
 */
const TASKS: Task[] = [
  {
    q: "Sahada yeni gelen çocuğu nasıl kaydederim?",
    steps: [
      "Bugün ekranında “Yeni kayıt”a dokunun.",
      "Çocuğun adını, doğum tarihini, veliyi ve telefonu yazın; “Ekle ve okula kaydet”e dokunun.",
      "Grup doğum yılına göre seçili gelir. Aidatı verdiyse “Verdi · nakit” ya da “Verdi · havale”yi seçin.",
      "Forma için durumu (teslim aldı / sipariş verilecek, parası verildi mi) ve bedeni seçin.",
      "Veli kâğıt kayıt formunu imzaladıysa “Kâğıt kayıt formunu imzaladı”ya, fotoğraf izni için “Verdi” ya da “Vermedi”ye dokunun.",
      "“Kaydı tamamla”ya dokunun, sonra “Veliye hoş geldin mesajı gönder”e basın. Mesajda grup, antrenman günleri, yol tarifi, aidat ve forma bilgisi hazır gider.",
    ],
    note: "T.C., adres gibi eksik bilgileri veli oradayken “Eksik bilgileri tamamla”dan girin.",
    href: "/admin/kayit/yeni",
    go: "Yeni kayıt",
    perm: "kayit.duzenle",
  },
  {
    q: "Aidatı nasıl alırım?",
    steps: [
      "Bugün ekranında “Aidat al”a dokunun ve öğrencinin adını yazın.",
      "Kaç antrenmanlık aldığınızı seçin (8 = bir aidat).",
      "Parayı bugün değil başka gün aldıysanız “Ödeme günü”nden günü seçin.",
      "“Nakit al” ya da “Havale ile al”a dokunun. Makbuz numarası verilir.",
    ],
    note: "Bir aidat = grubun 8 antrenmanı. Hak, antrenman günü gelince düşer; çocuk gelmese de.",
    href: "/admin/aidat?ara=1",
    go: "Aidat",
    perm: "aidat.al",
  },
  {
    q: "Bir öğrencinin kaç antrenman hakkı kaldı, nasıl düzeltirim?",
    steps: [
      "Aidat sayfasında “Hak girişi”ne dokunun.",
      "Üstten grubu seçin. Öğrenciler yoklama listesindeki gibi ada göre sıralıdır.",
      "Kağıttaki sayıya göre “Kalan antrenman”ı − / + ile ayarlayın; altta son antrenmanı ve sonraki ödeme günü görünür.",
      "“Kaydet”e ya da en alttaki “Hepsini kaydet”e dokunun.",
    ],
    note: "Bugünkü antrenman bittiyse sayılmaz. Ödemesi girilmemiş öğrencide önce “Aidat al”. Kağıttaki sayıyı girdikten sonra geçmişte yapılmayan antrenmanları ayrıca iptal etmeyin; sayı zaten onlara göre.",
    href: "/admin/aidat/hak",
    go: "Hak girişi",
    perm: "aidat.al",
  },
  {
    q: "Veli “şu gün ödeyeceğim” derse ne yaparım?",
    steps: ["Öğrencinin dosyasını açın (üstteki aramadan adını yazın).", "Aidat bölümünde “Ödeme sözü ekle”ye dokunun.", "Velinin söylediği günü seçin. O güne kadar çocuk antrenmana devam eder."],
    note: "Ödeme gelince söz kendiliğinden kapanır; gelmezse listede “ödeyecekti, gelmedi” yazar.",
    href: "/admin/aidat?durum=odemeyen",
    go: "Ödemeyenler",
    perm: "erisim.ac",
  },
  {
    q: "Yoklamayı nasıl alırım?",
    steps: [
      "Yoklama ekranında üstten grubu seçin. Çocuklar satırda, antrenman günleri sütunda.",
      "Çocuğun o günkü kutusuna dokunun: bir kez ✓ Geldi, iki kez ✕ Gelmedi, üç kez İ İzinli, dördüncüde boşalır.",
      "Bitince tarihe dokunup “İşaretlenmemişler gelmedi”yi seçin.",
    ],
    note: "Sahaya gelen her çocuk “Geldi” yazılır; aidatı gecikmişse satırında kırmızı yazar, aidatı ayrıca alınır.",
    href: "/admin/yoklama",
    go: "Yoklama",
    perm: "yoklama.al",
  },
  {
    q: "Kağıtta aldığımız eski yoklamaları nasıl girerim?",
    steps: [
      "Yoklama ekranında grubu seçin; kağıttaki tarihler tabloda sütun olarak durur.",
      "Çoğu çocuk geldiyse önce tarihe dokunup “İşaretlenmemişler geldi”yi seçin, sonra gelmeyenlerin kutusuna dokunarak ✕ yapın.",
      "Kağıtta tablodaki ilk tarihten önceki antrenmanlar da varsa sayfanın altındaki “Kağıtta daha önceki antrenmanlar var”a dokunup ilk günü seçin.",
    ],
    note: "Yoklama hakkı etkilemez: hak, antrenman günü gelince düşer. Kağıtta yapılmamış görünen bir günü boş bırakın; geçmiş antrenmanı iptal etmeyin (kalan haklar girildiyse çocuklara fazladan hak ekler).",
    href: "/admin/yoklama",
    go: "Yoklama tablosu",
    perm: "yoklama.al",
  },
  {
    q: "Antrenman iptal olursa (yağmur, saha) ne yaparım?",
    steps: ["Gruplar ekranında gruba dokunun.", "“Sıradaki antrenmanlar”da o günün yanındaki “İptal”e dokunun ve sebebini yazın.", "Velilere haber vermek için grup sayfasındaki WhatsApp düğmelerini kullanın."],
    note: "İptal edilen antrenman çocukların hakkından düşmez. İptali aynı gün girin.",
    href: "/admin/gruplar",
    go: "Gruplar",
    perm: "program.yonet",
  },
  {
    q: "Forma teslim edince ya da sipariş verince ne yaparım?",
    steps: ["Forma ve Malzeme ekranını açın.", "Öğrencinin satırında sıradaki adıma tek dokunun: “Sipariş verildi” ya da “Teslim edildi”.", "Tozluk formadan ayrı izlenir; verince tozluk satırında “Teslim edildi”ye dokunun."],
    note: "Yanlış dokunduysanız hemen çıkan “Geri al”a basın.",
    href: "/admin/malzeme",
    go: "Forma ve Malzeme",
    perm: "aidat.gor",
  },
  {
    q: "Öğrencinin grubunu nasıl değiştiririm?",
    steps: ["Öğrencinin dosyasını açın.", "Sağ üstteki ⋯ menüsünden “Grup, kaleci ve ölçüleri düzenle”ye dokunun.", "Yeni grubu seçip “Kaydet”e dokunun."],
    note: "Ödediği haklar korunur; kalan antrenmanları yeni grubun günlerinden sayılır.",
    href: "/admin/ogrenciler",
    go: "Öğrenciler",
    perm: "kayit.duzenle",
  },
  {
    q: "İki grubu nasıl birleştiririm, yaş aralığını nasıl değiştiririm?",
    steps: [
      "Gruplar ekranında kalacak gruba dokunun, “Adı ve yaşları”na basın.",
      "Doğum yıllarını iki grubu da kapsayacak şekilde yazın (ör. 2011 ve 2014).",
      "“Kaydet”e dokunun. Ne olacağı gösterilir: hangi grup katılır, kaç öğrenci geçer.",
      "Doğruysa “Birleştir”e dokunun.",
    ],
    note: "Öğrencilerin ödemeleri ve geçmiş yoklamaları korunur.",
    href: "/admin/gruplar",
    go: "Gruplar",
    perm: "program.yonet",
  },
  {
    q: "Öğrenci okuldan ayrılırsa ne yaparım?",
    steps: ["Öğrencinin dosyasını açın.", "Sağ üstteki ⋯ menüsünden “Okuldan ayrıldı”ya dokunun."],
    note: "Aidat durur, kartı iptal olur; geçmişi silinmez. Geri dönerse dosyasından yeniden etkinleştirilir.",
    href: "/admin/ogrenciler",
    go: "Öğrenciler",
    perm: "kayit.duzenle",
  },
  {
    q: "Kardeş indirimi nasıl yapılır?",
    steps: ["Okula kayıtta “İndirim uygula”yı işaretleyip adını ve oranını yazın (ör. Kardeş indirimi, 20).", "Kayıtlı öğrencide: dosyasındaki Aidat bölümünde İndirim → “Uygula”."],
    note: "Daha önce kullanılan indirimler öneri olarak çıkar.",
    href: "/admin/indirimler",
    go: "İndirimler",
    perm: "aidat.gor",
  },
  {
    q: "Öğrenci fotoğraflarını nasıl çekerim?",
    steps: [
      "Öğrenci Kartları ekranında “Fotoğraf çekimi”ne dokunun.",
      "Grubu seçin. İzni işlenmemiş çocukta veli kâğıtta izin verdiyse “Evet, izin verdi”ye dokunun (okula kayıtta işlendiyse bu adım çıkmaz).",
      "“Fotoğraf çek”e dokunun, telefonu dik tutup çekin. Liste sıradaki çocuğa kayar.",
    ],
    href: "/admin/kartlar/foto",
    go: "Fotoğraf çekimi",
    perm: "kayit.duzenle",
  },
  {
    q: "Gün sonunda kasayı nasıl gönderirim?",
    steps: ["Kasa ekranını açın.", "Bugünün kutusunda “Gönder”e dokunun; WhatsApp'ta göndereceğiniz kişiyi seçin."],
    note: "Nakit ve havale ayrı, kimin aldığı yazılı gider.",
    href: "/admin/kasa",
    go: "Kasa",
    perm: "aidat.gor",
  },
];

export default async function HelpPage() {
  const admin = await requireAdmin();
  const tasks = TASKS.filter((t) => !t.perm || can(admin, t.perm));
  return (
    <Page width="narrow">
      <PageHeader title="Nasıl yapılır?" description="Sık yapılan işler adım adım. Soruya dokunun, adımlar açılsın; “Şimdi yap” sizi o ekrana götürür." />
      <ul className="grid gap-3">
        {tasks.map((t) => (
          <li key={t.q}>
            <details className="group rounded-2xl bg-white shadow-xs ring-1 ring-inset ring-line open:ring-gs-red/40">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-[17px] font-bold leading-snug text-ink [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">{t.q}</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-line px-4 pb-4 pt-3">
                <ol className="grid gap-2.5">
                  {t.steps.map((s, i) => (
                    <li key={s} className="flex gap-3 text-[16px] leading-snug text-ink">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gs-red text-sm font-bold text-white">{i + 1}</span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
                {t.note ? <p className="mt-3 rounded-xl bg-stone-50 px-3.5 py-2.5 text-[15px] text-ink">{t.note}</p> : null}
                <Link href={t.href} className="mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gs-red px-4 text-[15px] font-semibold text-white hover:bg-gs-red-dark">
                  Şimdi yap: {t.go} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </Page>
  );
}
