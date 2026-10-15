// src/pages/KvkkPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import usePageMeta from "../hooks/usePageMeta";
import useLegalDocuments from "../hooks/useLegalDocuments";
import LegalDocumentView from "../components/legal/LegalDocumentView";
import PageLoading from "../components/common/PageLoading";
import { legalVersionLabel } from "../legal/store";

export default function KvkkPage() {
  usePageMeta({ title: "KVKK Aydınlatma Metni" });
  // Yönetim panelinden yayınlanmış metin varsa o gösterilir; yoksa aşağıdaki ilk metin.
  const { documents, loading: legalLoading } = useLegalDocuments();
  const published = documents?.["kvkk"];
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
            KVKK Aydınlatma Metni
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
              to="/agreement"
              className="rounded-full bg-white/10 border border-white/20 px-5 py-2 text-sm font-medium hover:bg-white/15 transition"
            >
              Satış Sözleşmesi
            </Link>
          </div>
        </div>
      </div>

      {/* İçerik */}
      <div className="container mx-auto px-4 py-10 sm:py-14">
        <div className="bg-white rounded-2xl shadow-sm border border-light2 overflow-hidden">
          <div className="bg-light1/60 border-b border-light2 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="text-sm text-dark2">Veri Sorumlusu</div>
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
            <Section id="amac" title="1) Amaç ve Kapsam">
              <p>
                İşbu Aydınlatma Metni, {STORE.brand} tarafından sunulan giyim
                ürünlerinin satışı sırasında 6698 sayılı Kişisel Verilerin
                Korunması Kanunu (“KVKK”) uyarınca kişisel verilerin işlenmesine
                ilişkin esasları açıklamak için hazırlanmıştır.
              </p>
            </Section>

            <Section id="islenen" title="2) İşlenen Kişisel Veriler">
              <ul className="list-disc pl-5 space-y-1">
                <li>Kimlik bilgileri (ad, soyad),</li>
                <li>İletişim bilgileri (telefon, e-posta, adres),</li>
                <li>Ödeme ve fatura bilgileri,</li>
                <li>Sipariş ve teslimat bilgileri,</li>
                <li>Müşteri talep/şikayet kayıtları,</li>
                <li>Web sitesi kullanım verileri (çerezler, trafik verisi).</li>
              </ul>
            </Section>

            <Section id="amaclar" title="3) İşleme Amaçları">
              <ul className="list-disc pl-5 space-y-1">
                <li>Sipariş ve teslimat süreçlerinin yürütülmesi,</li>
                <li>Ürün ve hizmetlerin geliştirilmesi,</li>
                <li>Faturalama, ödeme ve iade süreçlerinin takibi,</li>
                <li>Müşteri hizmetleri ve destek faaliyetleri,</li>
                <li>
                  Kampanya, indirim ve promosyonların duyurulması (açık rıza
                  halinde),
                </li>
                <li>Yasal yükümlülüklerin yerine getirilmesi.</li>
              </ul>
            </Section>

            <Section id="hukuki" title="4) Hukuki Sebepler">
              <p>
                Veriler; <strong>kanunlarda öngörülmesi</strong>,{" "}
                <strong>sözleşmenin kurulması ve ifası</strong>,{" "}
                <strong>hukuki yükümlülük</strong> ve <strong>açık rıza</strong>{" "}
                şartlarına dayanılarak işlenmektedir.
              </p>
            </Section>

            <Section id="aktarim" title="5) Veri Aktarımı">
              <p>
                Kişisel veriler; kargo firmaları, ödeme kuruluşları, bağımsız
                denetim şirketleri ve yasal merciler gibi üçüncü kişilere,
                yalnızca hizmetin ifası için gerekli ölçüde aktarılmaktadır.
              </p>
            </Section>

            <Section id="süre" title="6) Saklama Süresi">
              <p>
                Kişisel veriler, ilgili mevzuatta öngörülen süreler boyunca veya
                işleme amacının gerekli kıldığı süre kadar saklanır; sürenin
                bitiminde silinir, yok edilir veya anonim hale getirilir.
              </p>
            </Section>

            <Section id="haklar" title="7) İlgili Kişi Hakları">
              <p>KVKK’nın 11. maddesi kapsamında veri sahipleri;</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Kişisel verilerinin işlenip işlenmediğini öğrenme,</li>
                <li>
                  İşlenme amacını ve amaca uygun kullanılıp kullanılmadığını
                  öğrenme,
                </li>
                <li>Aktarıldığı üçüncü kişileri bilme,</li>
                <li>Düzeltme, silme, anonimleştirme talep etme,</li>
                <li>
                  İtiraz ve zarar halinde tazminat talep etme haklarına
                  sahiptir.
                </li>
              </ul>
              <p className="mt-2">
                Taleplerinizi{" "}
                <a
                  href={`mailto:${STORE.email}`}
                  className="text-primary underline"
                >
                  {STORE.email}
                </a>{" "}
                adresine iletebilirsiniz.
              </p>
            </Section>

            <Section id="guncelleme" title="8) Güncellemeler">
              <p>
                Bu metin ihtiyaç halinde güncellenebilir. Güncel sürüm{" "}
                <Link to="/kvkk" className="text-primary underline">
                  {STORE.website}/kvkk
                </Link>{" "}
                adresinde yayımlanır.
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
