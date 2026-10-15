import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { ScrollText, ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "1. Hizmetin Kapsamı",
    content: `Baha Fitness dijital platformu; üyelik yönetimi, antrenman takibi, beslenme rehberliği ve fitness analitiği hizmetleri sunmaktadır. Platform, web ve mobil uygulamalar üzerinden erişilebilir durumdadır.`,
  },
  {
    title: "2. Üyelik ve Hesap",
    content: `2.1. Üye olmak için 16 yaş veya üzeri olmanız gerekmektedir. 16-18 yaş arası kullanıcılar için veli/vasi onayı zorunludur.

2.2. Hesabınıza ait erişim bilgilerinin gizliliğini korumakla yükümlüsünüz. Hesabınızda gerçekleşen tüm işlemlerden siz sorumlusunuz.

2.3. Gerçeğe aykırı bilgi sağlamak, hesabın askıya alınmasına veya silinmesine neden olabilir.`,
  },
  {
    title: "3. Ödeme ve İptal",
    content: `3.1. Üyelik ücretleri seçilen plana göre aylık veya yıllık olarak tahsil edilir.

3.2. 7 günlük ücretsiz deneme süresi boyunca herhangi bir ücret tahsil edilmez.

3.3. İlk 14 gün içinde gerekçe belirtmeksizin üyeliği iptal edebilir ve tam iade talep edebilirsiniz.

3.4. 14 günden sonra yapılan iptallerde kalan gün hesabı yapılmaz; yeni dönem başlamadan önce iptal yapılmalıdır.`,
  },
  {
    title: "4. Yasaklı Kullanımlar",
    content: `Platform kullanımında aşağıdaki eylemler yasaktır:

• Başkalarının hesaplarına yetkisiz erişim sağlamak
• Sisteme zarar verebilecek yazılım veya kod çalıştırmak
• Otomatik araçlarla toplu veri çekmek (scraping)
• Platformu ticari amaçla izinsiz kullanmak
• Diğer kullanıcılara yönelik taciz veya tehdit içerikli paylaşımlar`,
  },
  {
    title: "5. Fikri Mülkiyet",
    content: `Platform üzerindeki tüm içerikler (metin, grafik, logo, yazılım) Baha Fitness A.Ş.'ye aittir. Yazılı izin olmaksızın çoğaltılamaz, dağıtılamaz veya türev çalışma oluşturulamaz.`,
  },
  {
    title: "6. Sorumluluk Sınırlaması",
    content: `Baha Fitness, platformun kesintisiz veya hatasız çalışacağını garanti etmez. Hizmetin kullanımından doğabilecek dolaylı zararlar için sorumluluk kabul edilmez. Antrenman programlarını uygulamadan önce sağlık durumunuzu değerlendirmeniz tavsiye edilir.`,
  },
  {
    title: "7. Değişiklikler",
    content: `Bu şartlar önceden bildiri yapılarak güncellenebilir. Güncellemeler, bildirimden 30 gün sonra yürürlüğe girer. Hizmetin kullanımına devam etmek, güncellenmiş şartları kabul ettiğiniz anlamına gelir.`,
  },
  {
    title: "8. Uygulanacak Hukuk",
    content: `Bu sözleşme Türk Hukuku'na tabidir. Anlaşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.`,
  },
];

export default function KullanimSartlariPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <section className="relative pt-32 md:pt-44 pb-16 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent-violet/8 blur-[120px] pointer-events-none" />

          <div className="container-app relative max-w-3xl">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-label hover:text-neon transition-colors mb-8 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Ana Sayfa
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent-violet/10 grid place-items-center">
                <ScrollText className="w-6 h-6 text-accent-violet" />
              </div>
              <div>
                <div className="text-accent-violet text-xs font-semibold uppercase tracking-wider">Baha Fitness</div>
                <h1 className="h-display text-3xl md:text-4xl">Kullanım Şartları</h1>
              </div>
            </div>
            <p className="text-body text-sm">Son güncelleme: Mayıs 2025</p>
          </div>
        </section>

        <div className="container-app max-w-3xl pb-24">
          <div className="card-surface p-4 mb-8 text-sm text-body leading-relaxed border-l-2 border-accent-violet/40 rounded-l-none">
            Baha Fitness platformunu kullanarak bu kullanım şartlarını okuduğunuzu ve kabul ettiğinizi beyan edersiniz.
          </div>

          <div className="space-y-5">
            {sections.map((s) => (
              <div key={s.title} className="card-surface p-6">
                <h2 className="font-semibold text-base mb-4 text-strong">{s.title}</h2>
                <div className="text-sm text-body leading-relaxed whitespace-pre-line">{s.content}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-sm text-faint">
            Sorularınız için:{" "}
            <a href="mailto:info@bahafitness.com" className="text-neon hover:underline">
              info@bahafitness.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
