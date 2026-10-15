// Highlights.jsx
export default function Highlights() {
  const items = [
    {
      title: "Uluslararası ticari uyuşmazlık",
      desc: "Yüksek meblağlı sözleşme ihlali iddiası.",
      result: "Tahkimde dostane çözüm; müvekkil lehine tazminat.",
    },
    {
      title: "Ceza soruşturması",
      desc: "Nitelikli dolandırıcılık iddiası.",
      result: "Tutukluluğa itiraz kabul; beraat ile sonuçlandı.",
    },
    {
      title: "İş hukuku davası",
      desc: "Haksız fesih ve alacak talepleri.",
      result: "Kısmi kabul; müvekkil lehine yüksek tazminat.",
    },
  ];

  return (
    <section className="section-y border-t border-border/50">
      <div className="container-x">
        {/* Başlık bloğu */}
        <header className="mb-10">
          <h2 className="text-[32px] md:text-[34px] font-semibold tracking-[-0.01em]">
            Vaka Öne Çıkanları
          </h2>
          <p className="mt-2 text-[16.5px] text-foreground/80">
            Gizliliğe riayet ederek, sonuçları öne çıkaran örnekler.
          </p>
        </header>

        {/* Kartlar */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ title, desc, result }) => (
            <article
              key={title}
              className="
                rounded-[var(--radius-2xl)]
                border border-border/60
                bg-[color:var(--color-surface-2)]/85
                p-6 shadow-[var(--shadow-soft)]
              "
            >
              <h3 className="text-[18px] font-semibold leading-[1.25]">
                {title}
              </h3>
              <p className="mt-2 text-[15px] leading-[1.65] text-[color:var(--color-muted)]">
                {desc}
              </p>

              {/* Sonuç satırı: altın ton */}
              <p className="mt-3 text-[15px] font-semibold text-[color:var(--color-accent)]">
                {result}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
