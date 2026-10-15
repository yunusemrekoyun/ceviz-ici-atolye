import {
  IconScale,
  IconBriefcase,
  IconBuildingSkyscraper,
  IconGavel,
  IconShield,
  IconBuildingBank,
  IconHome2,
  IconDatabase,
  IconCash,
} from "@tabler/icons-react";

const ITEMS = [
  {
    title: "Aile Hukuku",
    icon: IconGavel,
    intro:
      "Aile hukuku, bireylerin özel yaşamını doğrudan etkileyen en hassas hukuk alanlarından biridir. Boşanma, nafaka, velayet, mal paylaşımı ve aile içi şiddet gibi konularda müvekkillerimize hem hukuki hem de psikolojik açıdan süreci yıpratmadan sonuçlandırmayı hedefliyoruz.",
    bullets: [
      "Anlaşmalı ve çekişmeli boşanma davaları",
      "Velayet, kişisel ilişki düzenlemeleri ve çocuk hakları",
      "Nafaka talepleri ve uyarlamaları",
      "Mal rejimi tasfiyesi ve paylaşım davaları",
    ],
  },
  {
    title: "Ceza Hukuku",
    icon: IconScale,
    intro:
      "Ceza davalarında hem bireylerin hem de şirketlerin haklarını korumak amacıyla soruşturma ve kovuşturma süreçlerinde etkin savunma hizmeti sunuyoruz.",
    bullets: [
      "Gözaltı ve tutuklama süreçlerinde savunma",
      "Savcılık soruşturmalarında hukuki temsil",
      "Ceza davalarında duruşma savunması ve temyiz başvuruları",
      "Şirketlere yönelik ceza hukuku risk analizi",
    ],
  },
  {
    title: "İcra ve İflas Hukuku",
    icon: IconCash,
    intro:
      "Alacakların hızlı tahsili, borçların yapılandırılması ve iflas süreçlerinin etkin şekilde yönetilmesi için hem bireylere hem şirketlere hukuki destek veriyoruz.",
    bullets: [
      "İcra takibi, haciz ve tahsil işlemleri",
      "İflas davaları ve konkordato süreçleri",
      "Borçlu ve alacaklılara yönelik stratejik danışmanlık",
      "İcra daireleri ve mahkemelerde temsil",
    ],
  },
  {
    title: "Gayrimenkul ve Kira Hukuku",
    icon: IconHome2,
    intro:
      "Gayrimenkul yatırımlarında ve kira ilişkilerinde hukuki riskleri en aza indirmek amacıyla önleyici danışmanlık ve dava hizmeti sunuyoruz.",
    bullets: [
      "Tapu işlemleri ve taşınmaz devirleri",
      "Kira sözleşmeleri, tahliye ve uyarlama davaları",
      "Ortaklığın giderilmesi (izale-i şuyu) ve mülkiyet ihtilafları",
      "İmar planı, kamulaştırma ve müteahhit uyuşmazlıkları",
    ],
  },
  {
    title: "İş ve Sosyal Güvenlik Hukuku",
    icon: IconShield,
    intro:
      "İşçi ve işveren ilişkilerinde hem bireylerin haklarını koruyor hem de şirketlerin mevzuata uygun hareket etmesini sağlıyoruz.",
    bullets: [
      "Kıdem, ihbar, fazla mesai ve diğer işçilik alacakları",
      "İşe iade ve haksız fesih davaları",
      "SGK tespit davaları ve idari uyuşmazlıklar",
      "İş sağlığı ve güvenliği yükümlülükleri",
    ],
  },
  {
    title: "Tazminat Hukuku",
    icon: IconBriefcase,
    intro:
      "Maddi ve manevi zararlara ilişkin tazminat taleplerinde, zarar görenlerin kayıplarını telafi etmeleri için tüm hukuki yolları kullanıyoruz.",
    bullets: [
      "Haksız fiilden doğan tazminat davaları",
      "Trafik kazası, iş kazası ve meslek hastalığı tazminatları",
      "Sigorta uyuşmazlıklarında hak takibi",
      "Manevi tazminat taleplerinde temsil",
    ],
  },
  {
    title: "Kişisel Verilerin Korunması (KVKK)",
    icon: IconDatabase,
    intro:
      "Şirketlerin ve bireylerin veri koruma yükümlülüklerine uygun hareket etmesi için uyum projeleri yürütüyor, veri ihlali durumlarında hızlı ve etkin hukuki destek sunuyoruz.",
    bullets: [
      "KVKK uyum sürecinin planlanması ve uygulanması",
      "Veri işleme envanteri ve risk analizi hazırlanması",
      "Veri ihlali bildirimleri ve hukuki değerlendirmeler",
      "Şirket içi politika ve çalışan eğitimi",
    ],
  },
  {
    title: "Şirketler Hukuku",
    icon: IconBuildingSkyscraper,
    intro:
      "Şirketlerin kuruluşundan tasfiyesine kadar tüm aşamalarda hukuki danışmanlık veriyoruz.",
    bullets: [
      "Şirket kuruluşu, tür değişikliği ve birleşme-devralma işlemleri",
      "Ortaklık sözleşmeleri ve ana sözleşme değişiklikleri",
      "Genel kurul ve yönetim kurulu kararlarının hazırlanması",
      "Ticari sözleşmelerin hazırlanması ve incelenmesi",
      "Ortaklar arası uyuşmazlıkların çözümü",
      "Şirket tasfiyesi ve hukuki risk yönetimi",
    ],
  },
];

function ServiceCard({ title, intro, bullets, IconCmp }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-[color:var(--color-surface-2)]/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md hover:border-[color:var(--color-accent)]/60">
      <div className="flex items-center gap-3 mb-3">
        <IconCmp size={24} stroke={1.8} className="text-[color:var(--color-accent)]" />
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-[15px] text-foreground/80 mb-3">{intro}</p>
      <ul className="space-y-1.5 text-[14.5px] text-[color:var(--color-muted)]">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-[color:var(--color-accent)]/80" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <section className="section-y" aria-labelledby="services-title">
      <div className="mx-auto max-w-screen-2xl px-6 sm:px-8 md:px-10 lg:px-12">
        <header className="mb-10">
          <h1
            id="services-title"
            className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.01em]"
          >
            Çalışma Alanlarımız
          </h1>
          <p className="mt-2 text-[15.5px] text-foreground/80 max-w-[70ch]">
            Hukuki danışmanlık verdiğimiz başlıca alanlar ve detaylı hizmetlerimiz.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map(({ title, intro, bullets, icon: IconCmp }) => (
            <ServiceCard
              key={title}
              title={title}
              intro={intro}
              bullets={bullets}
              IconCmp={IconCmp}
            />
          ))}
        </div>
      </div>
    </section>
  );
}