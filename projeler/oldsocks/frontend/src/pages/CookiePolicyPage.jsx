import React from "react";
import usePageMeta from "../hooks/usePageMeta";
import useLegalDocuments from "../hooks/useLegalDocuments";
import LegalDocumentView from "../components/legal/LegalDocumentView";
import PageLoading from "../components/common/PageLoading";

export default function CookiePolicyPage() {
  usePageMeta({ title: "Çerez Politikası" });
  // Yönetim panelinden yayınlanmış metin varsa o gösterilir; yoksa aşağıdaki ilk metin.
  const { documents, loading: legalLoading } = useLegalDocuments();
  const published = documents?.["cookies"];
  if (legalLoading) return <PageLoading />;
  if (published) return <LegalDocumentView doc={published} />;

  return (
    <section className="container mx-auto px-4 py-10 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4">Çerez Politikası</h1>
      <p className="text-gray-700 mb-4">
        Bu web sitesinde; oturum açma, sepet yönetimi ve ödeme işlemlerinin
        sağlıklı çalışması için zorunlu çerezler kullanılmaktadır. Bu çerezler
        site işlevselliği için gereklidir ve devre dışı bırakılamaz.
      </p>

      <h2 className="text-xl font-medium mt-8 mb-2">Kullandığımız Çerezler</h2>
      <ul className="list-disc pl-6 space-y-1 text-gray-700">
        <li>
          <b>Zorunlu/Oturum Çerezleri:</b> Kimlik doğrulama (auth), sepet ve
          ödeme oturumunun yürütülmesi.
        </li>
        <li>
          <b>Performans/Analitik:</b> Kullanılmamaktadır.
        </li>
        <li>
          <b>Pazarlama:</b> Kullanılmamaktadır.
        </li>
      </ul>

      <h2 className="text-xl font-medium mt-8 mb-2">Dış İçerikler</h2>
      <p className="text-gray-700">
        İletişim sayfasındaki harita Google Haritalar'dan, blogdaki gönderiler
        Instagram'dan yüklenir. Bu hizmetler yüklendiklerinde kendi çerezlerini
        kullanabilir ve IP adresinizi görebilir. Bu nedenle bu içerikler yalnız
        izin verdiğinizde yüklenir. Site yazı tipleri kendi sunucumuzdan
        verilir; bunun için üçüncü tarafa istek gönderilmez.
      </p>

      <h2 className="text-xl font-medium mt-8 mb-2">Saklama Süresi</h2>
      <p className="text-gray-700">
        Zorunlu çerezler oturum süresince veya yasal/işlemsel gereklilikler
        kapsamında makul süre boyunca saklanır.
      </p>

      <h2 className="text-xl font-medium mt-8 mb-2">Bilgilendirme</h2>
      <p className="text-gray-700">
        Sitemize ilk girişinizde "Yalnız zorunlu" veya "Tümüne izin ver"
        seçeneklerinden birini seçersiniz. Tercihinizi sayfa altındaki "Çerez
        Tercihleri" bağlantısından istediğiniz zaman değiştirebilirsiniz.
      </p>

      <h2 className="text-xl font-medium mt-8 mb-2">İletişim</h2>
      <p className="text-gray-700">
        Sorularınız için:{" "}
        <a className="text-blue-600 underline" href="mailto:oldscks@gmail.com">
          oldscks@gmail.com
        </a>
      </p>
    </section>
  );
}
