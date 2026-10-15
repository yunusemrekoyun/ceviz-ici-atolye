import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { FileText, ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "VERİ SORUMLUSUNUN KİMLİĞİ",
    content: `Baha Fitness A.Ş. ("Şirket"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatını taşımaktadır.

Adres: Bağdat Caddesi No:1, Kadıköy/İstanbul
E-posta: kvkk@bahafitness.com`,
  },
  {
    title: "İŞLENEN KİŞİSEL VERİLER VE İŞLEME AMAÇLARI",
    content: `Aşağıdaki kişisel verileriniz belirtilen amaçlarla işlenmektedir:

KİMLİK VERİLERİ (Ad, soyad, TC kimlik no):
• Üyelik sözleşmesinin kurulması ve ifası
• Yasal yükümlülüklerin yerine getirilmesi

İLETİŞİM VERİLERİ (E-posta, telefon):
• Hizmet bildirimleri ve randevu hatırlatmaları
• Müşteri destek hizmetleri

SAĞLIK VERİLERİ (Vücut ölçümleri, fitness verileri):
• Kişiselleştirilmiş antrenman programı hazırlanması
• Sağlık takibi ve raporlama — yalnızca açık rıza ile

FİNANSAL VERİLER (Ödeme geçmişi):
• Faturalama ve muhasebe işlemleri
• Vergi yükümlülüklerinin yerine getirilmesi`,
  },
  {
    title: "KİŞİSEL VERİLERİN AKTARILMASI",
    content: `Kişisel verileriniz, KVKK'nın 8. ve 9. maddeleri çerçevesinde:

• Yasal zorunluluklar kapsamında ilgili kamu kurum ve kuruluşlarına
• Ödeme hizmetleri sağlayıcılarına (yalnızca ödeme işlemi kapsamında)
• Bulut altyapı sağlayıcılarına (teknik hizmet kapsamında)

aktarılabilir. Bu aktarımlar veri güvenliğini sağlayan sözleşmeler çerçevesinde gerçekleştirilir.`,
  },
  {
    title: "KİŞİSEL VERİLERİN SAKLANMA SÜRESİ",
    content: `Kişisel verileriniz, işleme amacının ortadan kalkmasına veya yasal saklama sürelerinin dolmasına kadar muhafaza edilir:

• Üyelik verileri: Üyelik süresince + 10 yıl (Türk Ticaret Kanunu)
• Ödeme kayıtları: 10 yıl (Vergi Usul Kanunu)
• Sağlık verileri: Üyelik süresi + 1 yıl
• Log kayıtları: 2 yıl (5651 sayılı Kanun)`,
  },
  {
    title: "VERİ SAHİBİNİN HAKLARI",
    content: `KVKK'nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:

a) Kişisel verilerinizin işlenip işlenmediğini öğrenme
b) İşlenmişse bilgi talep etme
c) İşlenme amacını öğrenme ve amacına uygun kullanılıp kullanılmadığını öğrenme
d) Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme
e) Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme
f) KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerin silinmesini veya yok edilmesini isteme
g) Otomatik sistemler vasıtasıyla analiz edilmesi suretiyle kişi aleyhine ortaya çıkan sonuca itiraz etme
h) Kişisel verilerin kanuna aykırı işlenmesi sebebiyle zarara uğranması hâlinde zararın giderilmesini talep etme`,
  },
  {
    title: "BAŞVURU YÖNTEMİ",
    content: `Yukarıdaki haklarınızı kullanmak için:

1. kvkk@bahafitness.com adresine e-posta göndererek
2. Bağdat Caddesi No:1, Kadıköy/İstanbul adresine iadeli taahhütlü mektup göndererek

başvurabilirsiniz. Başvurularınız en geç 30 gün içinde sonuçlandırılacaktır.`,
  },
];

export default function KvkkPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <section className="relative pt-32 md:pt-44 pb-16 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-accent-cyan/8 blur-[120px] pointer-events-none" />

          <div className="container-app relative max-w-3xl">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-label hover:text-neon transition-colors mb-8 group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              Ana Sayfa
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 grid place-items-center">
                <FileText className="w-6 h-6 text-accent-cyan" />
              </div>
              <div>
                <div className="text-accent-cyan text-xs font-semibold uppercase tracking-wider">Baha Fitness</div>
                <h1 className="h-display text-3xl md:text-4xl">KVKK Aydınlatma Metni</h1>
              </div>
            </div>
            <p className="text-body text-sm">6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında — Mayıs 2025</p>
          </div>
        </section>

        <div className="container-app max-w-3xl pb-24">
          <div className="card-surface p-4 mb-8 text-sm text-body leading-relaxed border-l-2 border-accent-cyan/40 rounded-l-none">
            Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi uyarınca hazırlanmıştır.
          </div>

          <div className="space-y-5">
            {sections.map((s) => (
              <div key={s.title} className="card-surface p-6">
                <h2 className="font-bold text-sm tracking-wide uppercase text-accent-cyan/80 mb-4">{s.title}</h2>
                <div className="text-sm text-body leading-relaxed whitespace-pre-line">{s.content}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-sm text-faint">
            KVKK başvuruları:{" "}
            <a href="mailto:kvkk@bahafitness.com" className="text-neon hover:underline">
              kvkk@bahafitness.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
