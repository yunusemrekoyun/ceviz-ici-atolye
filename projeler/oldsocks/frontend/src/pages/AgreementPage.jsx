// src/pages/AgreementPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import useLegalDocuments from "../hooks/useLegalDocuments";
import LegalDocumentView from "../components/legal/LegalDocumentView";
import PageLoading from "../components/common/PageLoading";
import { legalVersionLabel } from "../legal/store";

export default function AgreementPage() {
  usePageMeta({ title: "Mesafeli Satış Sözleşmesi" });
  // Yönetim panelinden yayınlanmış metin varsa o gösterilir; yoksa aşağıdaki ilk metin.
  const { documents, loading: legalLoading } = useLegalDocuments();
  const published = documents?.["distance-sales"];
  // Mağaza bilgileri (footer ile uyumlu tut)
  const STORE = {
    brand: "OLDSOCKS",
    companyTitle: "OLDSOCKS",
    address: "Alipaşa Mahallesi Üçbey Sokak No:7/A, Kütahya Merkez",
    email: "oldscks@gmail.com",
    phone: "+90 541 428 29 89",
    website:
      typeof window !== "undefined"
        ? window.location.origin
        : "https://oldsocks.com",
  };

  // Metnin yürürlük tarihi; her gün "bugün" gösterilmez.
  const today = legalVersionLabel();

  const Section = ({ id, title, children }) => (
    <section id={id} className="scroll-mt-24">
      <h3 className="text-xl sm:text-2xl font-semibold text-dark1 mb-3">
        {title}
      </h3>
      <div className="prose prose-invert max-w-none text-[15px] leading-relaxed text-dark2">
        {children}
      </div>
      <hr className="my-6 border-light2/70" />
    </section>
  );

  if (legalLoading) return <PageLoading />;
  if (published) return <LegalDocumentView doc={published} />;

  return (
    <main className="bg-light1 text-dark1 min-h-screen">
      {/* Hero */}
      <div className="bg-dark1 text-white">
        <div className="container mx-auto px-4 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-bold">
            Mesafeli Satış Sözleşmesi
          </h1>
          <p className="mt-2 text-white/80">Güncelleme tarihi: {today}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => window.print()}
              className="rounded-full bg-white text-dark1 px-5 py-2 text-sm font-medium hover:bg-light1 transition"
            >
              Yazdır / PDF
            </button>
            <Link
              to="/kvkk"
              className="rounded-full bg-white/10 border border-white/20 px-5 py-2 text-sm font-medium hover:bg-white/15 transition"
            >
              KVKK Aydınlatma Metni
            </Link>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="container mx-auto px-4 py-10 sm:py-14">
        <div className="bg-white rounded-2xl shadow-sm border border-light2 overflow-hidden">
          {/* Satıcı kart başlığı */}
          <div className="bg-light1/60 border-b border-light2 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="text-sm text-dark2">Satıcı</div>
                <div className="text-lg font-semibold text-dark1">
                  {STORE.companyTitle}
                </div>
              </div>
              <div className="text-sm text-dark2">
                <div>
                  <span className="font-medium text-dark1">Adres:</span>{" "}
                  {STORE.address}
                </div>
                <div>
                  <span className="font-medium text-dark1">E-posta:</span>{" "}
                  {STORE.email}
                </div>
                <div>
                  <span className="font-medium text-dark1">Tel:</span>{" "}
                  {STORE.phone}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {/* İçindekiler */}
            <nav className="mb-8">
              <h2 className="text-lg font-semibold mb-3">İçindekiler</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ["Taraflar ve Tanımlar", "taraflar"],
                  ["Sözleşmenin Konusu", "konu"],
                  ["Ürün/Bedel ve Ödeme", "odeme"],
                  ["Kargolama ve Teslimat", "teslimat"],
                  ["Beden/Ürün Bilgilendirme", "beden"],
                  ["Cayma Hakkı (14 Gün)", "cayma"],
                  ["Giyim Ürünlerinde İade İstisnaları", "istisna"],
                  ["İade ve Değişim Süreci", "iade"],
                  ["Ayıplı Ürün ve Garanti", "garanti"],
                  ["Mücbir Sebepler", "mucbir"],
                  ["KVKK ve Gizlilik", "kvkk"],
                  ["Uyuşmazlık/Yetkili Merciler", "uyusmazlik"],
                  ["Yürürlük", "yururluk"],
                ].map(([label, id]) => (
                  <li key={id}>
                    <a href={`#${id}`} className="text-primary hover:underline">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <Section id="taraflar" title="1) Taraflar ve Tanımlar">
              <p>
                İşbu Sözleşme;{" "}
                <strong>
                  {STORE.companyTitle} ({STORE.brand})
                </strong>{" "}
                ile {STORE.website} üzerinden giyim/aksesuar ürünleri satın alan
                tüketici (“<strong>Alıcı</strong>”) arasında, 6502 sayılı TKHK
                ve Mesafeli Sözleşmeler Yönetmeliği’ne uygun şekilde elektronik
                ortamda kurulur.
              </p>
            </Section>

            <Section id="konu" title="2) Sözleşmenin Konusu">
              <p>
                Alıcı’nın elektronik ortamda onayladığı siparişte belirtilen
                nitelik ve satış fiyatına sahip giyim ürünlerinin satışı ve
                teslimidir. Ürün ve bedel bilgileri sipariş özetinde ve
                bilgilendirme e-postalarında yer alır.
              </p>
            </Section>

            <Section id="odeme" title="3) Ürün Bedeli, Ödeme ve Faturalandırma">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Fiyatlar Türk Lirası’dır; yürürlükteki vergileri içerir.
                </li>
                <li>
                  Ödemeler anlaşmalı ödeme kuruluşu aracılığıyla güvenli şekilde
                  alınır. Taksit/komisyon şartları sağlayıcıya göre değişebilir.
                </li>
                <li>
                  Fatura, elektronik ortamda (e-fatura/e-arşiv) düzenlenerek
                  Alıcı’ya iletilir.
                </li>
              </ul>
            </Section>

            <Section id="teslimat" title="4) Kargolama ve Teslimat">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Ürünler “hızlı kargo” prensibiyle, stok durumuna göre en kısa
                  sürede kargoya verilir. Kargo firması kaynaklı gecikmeler
                  Satıcı’nın kontrolü dışındadır.
                </li>
                <li>
                  Teslimde paket dışı hasar/ezilme vs. görülürse kargo
                  görevlisiyle tutanak tutulmalı ve aynı gün{" "}
                  <a
                    className="text-primary underline"
                    href={`mailto:${STORE.email}`}
                  >
                    {STORE.email}
                  </a>{" "}
                  adresine bildirilmelidir.
                </li>
              </ul>
            </Section>

            <Section id="beden" title="5) Beden/Ürün Bilgilendirme">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Beden tablosu ve ürün fotoğrafları bilgilendirme amaçlıdır.
                  Ekran/ışık farkı nedeniyle ton farklılıkları mümkündür.
                </li>
                <li>
                  Ürünlerin etiketleri, orijinal ambalajı ve aksesuarları (yedek
                  düğme, askı vb.) teslimatın parçasıdır.
                </li>
              </ul>
            </Section>

            <Section id="cayma" title="6) Cayma Hakkı (14 Gün)">
              <p>
                Alıcı, ürünü teslim aldığı tarihten itibaren{" "}
                <strong>14 gün</strong> içinde sebep göstermeksizin cayma
                hakkına sahiptir.
              </p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>
                  Cayma bildirimi; sipariş numarasıyla birlikte{" "}
                  <a
                    className="text-primary underline"
                    href={`mailto:${STORE.email}`}
                  >
                    {STORE.email}
                  </a>{" "}
                  adresine yazılı olarak yapılır.
                </li>
                <li>
                  Ürün, tekrar satılabilirlik şartlarını koruyacak şekilde;{" "}
                  <strong>etiketi koparılmamış</strong>,{" "}
                  <strong>yıkanmamış/ütülenmemiş</strong>,{" "}
                  <strong>parfüm/deodorant/lekesiz</strong> ve{" "}
                  <strong>hijyen bandı çıkarılmamış</strong> (varsa) olarak
                  gönderilmelidir.
                </li>
              </ul>
            </Section>

            <Section id="istisna" title="7) Giyim Ürünlerinde İade İstisnaları">
              <p>
                Mevzuat ve hijyen gereği aşağıdaki ürünlerde cayma hakkı
                kullanılamaz:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  İç giyim alt grubu (boxer, slip, çorap vb.) ve mayo/bikini
                  altları,
                </li>
                <li>Hijyen bandı/koruyucu sticker çıkarılmış ürünler,</li>
                <li>
                  Kişiselleştirilmiş ürünler (özel baskı/işleme/paça kısaltma
                  vb.),
                </li>
                <li>
                  Etiketi koparılmış, denenmenin ötesinde giyilmiş/ yıkanmış/
                  hasar görmüş ürünler.
                </li>
              </ul>
            </Section>

            <Section id="iade" title="8) İade ve Değişim Süreci">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Onay sonrası iade/değişim, bildirilecek kargo kodu ile
                  yapılır. Uygun olmayan gönderiler (farklı kargo, ücret
                  ödenmemiş vb.) kabul edilmeyebilir.
                </li>
                <li>
                  Bedel iadesi, ürün incelemesinden sonra kullanılan ödeme
                  yöntemine <em>en geç 14 gün</em> içinde yapılır. Banka/ödeme
                  kuruluşu süreçleri Satıcı kontrolü dışındadır.
                </li>
                <li>
                  Değişim, stok müsaitliğine göredir; stok yoksa para iadesi
                  yapılır.
                </li>
                <li>
                  Kampanyalı setlerde (2 al 1 öde vb.) kısmi iade, kampanya
                  şartlarına göre yeniden hesaplanır.
                </li>
              </ul>
            </Section>

            <Section id="garanti" title="9) Ayıplı Ürün ve Garanti">
              <p>
                Teslimden itibaren <strong>6 ay</strong> içinde üretim kaynaklı
                ayıplarda TKHK hükümleri uygulanır. Alıcı; bedel iadesi,
                ücretsiz onarım/ değişim veya ayıp oranında indirim talep
                edebilir.
              </p>
            </Section>

            <Section id="mucbir" title="10) Mücbir Sebepler">
              <p>
                Doğal afet, grev, savaş, salgın, lojistik/tedarik kesintileri
                gibi tarafların kontrolü dışındaki hallerde ifa yükümlülükleri
                askıya alınır.
              </p>
            </Section>

            <Section id="kvkk" title="11) KVKK ve Gizlilik">
              <p>
                Kişisel veriler,{" "}
                <Link to="/kvkk" className="text-primary underline">
                  KVKK Aydınlatma Metni
                </Link>{" "}
                kapsamında işlenir. İletişim izinleri dilediğiniz zaman geri
                çekilebilir.
              </p>
            </Section>

            <Section id="uyusmazlik" title="12) Uyuşmazlık ve Yetkili Merciler">
              <p>
                Parasal sınırlara göre Alıcı’nın yerleşim yerindeki veya
                Satıcı’nın bulunduğu yerdeki Tüketici Hakem Heyetleri/Tüketici
                Mahkemeleri yetkilidir.
              </p>
            </Section>

            <Section id="yururluk" title="13) Yürürlük">
              <p>
                Alıcı, {STORE.website} üzerinden siparişi onayladığında işbu
                Sözleşme’yi elektronik ortamda kabul etmiş sayılır. {today}{" "}
                tarihinde yürürlüğe girmiştir.
              </p>
            </Section>

            <div className="text-xs text-dark2/80">
              Not: Bu metin genel şablondur. Nihai uyumluluk için hukuk
              danışmanından onay almanız önerilir.
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <Link to="/" className="text-primary hover:underline">
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
}
