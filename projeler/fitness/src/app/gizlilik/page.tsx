import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Shield, ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "1. Toplanan Veriler",
    content: `Hizmetlerimizi sunarken aşağıdaki kişisel verilerinizi işleyebiliriz:

• Ad, soyad, e-posta adresi ve telefon numarası
• Üyelik bilgileri, ödeme geçmişi (ödeme aracı detayları saklanmaz)
• Antrenman geçmişi, vücut ölçümleri ve fitness verileri
• Sistem erişim günlükleri ve IP adresi bilgileri`,
  },
  {
    title: "2. Verilerin Kullanım Amacı",
    content: `Verileriniz aşağıdaki amaçlarla işlenir:

• Üyelik hizmetinin sağlanması ve yönetilmesi
• Kişiselleştirilmiş antrenman ve beslenme önerileri sunulması
• Ödeme işlemlerinin gerçekleştirilmesi
• Hizmet kalitesinin iyileştirilmesi ve analiz
• Yasal yükümlülüklerin yerine getirilmesi`,
  },
  {
    title: "3. Verilerin Paylaşımı",
    content: `Kişisel verileriniz, açık rızanız olmaksızın üçüncü taraflarla paylaşılmaz. Aşağıdaki durumlarda paylaşım yapılabilir:

• Yasal zorunluluk veya resmi kurum talepleri
• Hizmet sağlayıcılar (ödeme altyapısı, e-posta servisi) — yalnızca hizmet kapsamında
• İş ortaklıkları — anonimleştirilmiş istatistiksel veriler`,
  },
  {
    title: "4. Veri Güvenliği",
    content: `Verilerinizin güvenliği için endüstri standardı önlemler alıyoruz:

• TLS/SSL ile şifreli veri iletimi
• Şifreli parola saklama (bcrypt)
• Düzenli güvenlik denetimleri
• Sınırlı erişim kontrolü — yalnızca yetkili personel`,
  },
  {
    title: "5. Çerezler",
    content: `Sitemizde oturum yönetimi ve hizmet kalitesi için çerezler kullanılmaktadır. Zorunlu çerezler hizmetin çalışması için gereklidir. Tarayıcı ayarlarınızdan çerez tercihlerinizi yönetebilirsiniz.`,
  },
  {
    title: "6. Haklarınız",
    content: `KVKK kapsamında aşağıdaki haklara sahipsiniz:

• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• İşlenen veriler hakkında bilgi talep etme
• İşlemenin amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme
• Verilerin düzeltilmesini veya silinmesini talep etme
• İşlemeye itiraz etme hakkı

Bu haklarınızı kullanmak için info@bahafitness.com adresine başvurabilirsiniz.`,
  },
  {
    title: "7. Değişiklikler",
    content: `Bu politika zaman zaman güncellenebilir. Önemli değişiklikler e-posta veya site bildirimi ile duyurulacaktır. Politikanın güncel halini site üzerinden her zaman görüntüleyebilirsiniz.`,
  },
];

export default function GizlilikPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <section className="relative pt-32 md:pt-44 pb-16 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-neon/8 blur-[120px] pointer-events-none" />

          <div className="container-app relative max-w-3xl">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-label hover:text-neon transition-colors mb-8 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Ana Sayfa
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-neon/10 grid place-items-center">
                <Shield className="w-6 h-6 text-neon" />
              </div>
              <div>
                <div className="text-neon text-xs font-semibold uppercase tracking-wider">Baha Fitness</div>
                <h1 className="h-display text-3xl md:text-4xl">Gizlilik Politikası</h1>
              </div>
            </div>
            <p className="text-body text-sm">Son güncelleme: Mayıs 2025</p>
          </div>
        </section>

        <div className="container-app max-w-3xl pb-24">
          <div className="card-surface p-4 mb-8 text-sm text-body leading-relaxed">
            Baha Fitness olarak kişisel verilerinizin gizliliğini ciddiye alıyoruz. Bu politika, verilerinizi nasıl topladığımızı, kullandığımızı ve koruduğumuzu açıklar.
          </div>

          <div className="space-y-6">
            {sections.map((s) => (
              <div key={s.title} className="card-surface p-6">
                <h2 className="font-semibold text-lg mb-4 text-strong">{s.title}</h2>
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
