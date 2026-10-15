import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Dumbbell, Target, Heart, Users, Award, Zap, ArrowRight } from "lucide-react";

const values = [
  { icon: Target, title: "Odak", desc: "Her üyemizin bireysel hedeflerine odaklanıyoruz." },
  { icon: Heart, title: "Tutku", desc: "Fitness bir yaşam biçimidir; biz bunu her güne yansıtıyoruz." },
  { icon: Users, title: "Topluluk", desc: "Birlikte daha güçlüyüz. Destek veren bir ortam yaratıyoruz." },
  { icon: Award, title: "Kalite", desc: "Premium ekipmanlar ve sertifikalı antrenörlerle en iyisini sunuyoruz." },
  { icon: Zap, title: "Yenilik", desc: "Akıllı analitik ve teknoloji ile fitness deneyimini dönüştürüyoruz." },
  { icon: Dumbbell, title: "Sonuç", desc: "Gerçek dönüşümler yaratmak için bilim tabanlı programlar uyguluyoruz." },
];

const team = [
  { name: "Baha Yılmaz", role: "Kurucu & CEO", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80" },
  { name: "Selin Kaya", role: "Baş Antrenör", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80" },
  { name: "Murat Demir", role: "Beslenme Uzmanı", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
  { name: "Ayşe Çelik", role: "Üye Deneyimi", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80" },
];

export default function HakkimizdaPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        {/* Hero */}
        <section className="relative pt-32 md:pt-44 pb-20 overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-neon/10 blur-[140px] pointer-events-none" />
          <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-accent-violet/10 blur-[100px] pointer-events-none" />

          <div className="container-app relative text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-strong mb-6">
              <Dumbbell className="w-3.5 h-3.5 text-neon" />
              Baha Fitness Hakkında
            </div>
            <h1 className="h-display text-5xl md:text-6xl lg:text-7xl">
              Sağlıklı bir yaşam için{" "}
              <span className="text-gradient-neon">buradayız.</span>
            </h1>
            <p className="mt-6 text-lg text-body max-w-2xl mx-auto leading-relaxed">
              2018'den beri İstanbul'un kalbinde premium fitness hizmetleri sunuyoruz. Misyonumuz: her üyemizin en iyi versiyonuna ulaşmasına yardım etmek.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-16">
          <div className="container-app">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { v: "2018", l: "Kuruluş Yılı" },
                { v: "5000+", l: "Toplam Üye" },
                { v: "20+", l: "Uzman Antrenör" },
                { v: "98%", l: "Memnuniyet" },
              ].map((s) => (
                <div key={s.l} className="card-surface p-5 text-center">
                  <div className="text-2xl font-bold text-gradient-neon">{s.v}</div>
                  <div className="text-xs text-label mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="section">
          <div className="container-app max-w-4xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="text-neon text-sm font-semibold tracking-wider uppercase mb-3">Hikayemiz</div>
                <h2 className="h-display text-3xl md:text-4xl mb-5">Tutkudan doğdu, toplulukla büyüdü</h2>
                <div className="space-y-4 text-body text-sm leading-relaxed">
                  <p>
                    Baha Fitness, kurucumuz Baha Yılmaz'ın kişisel fitness yolculuğundan ilham aldı. "İnsanların hedeflerine ulaşmalarına yardımcı olmak için daha iyi bir yol olmalı" diye düşünerek 2018'de küçük bir stüdyo açtı.
                  </p>
                  <p>
                    Bugün 3 şubemiz ve 5000'den fazla aktif üyemizle İstanbul'un en büyük premium fitness markalarından biri haline geldik.
                  </p>
                  <p>
                    Teknoloji ve bilimi bir araya getirerek kişiselleştirilmiş fitness deneyimleri yaratıyoruz. Akıllı analizler, uzman antrenörler ve destekleyici bir toplulukla her adımda yanınızdayız.
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-3xl overflow-hidden border border-subtle-md shadow-glow-soft">
                  <img
                    src="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80"
                    alt="Baha Fitness tesis"
                    className="w-full h-[400px] object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 glass-strong rounded-2xl p-4 shadow-lg">
                  <div className="text-neon text-xs font-semibold">PREMIUM TESİS</div>
                  <div className="text-sm font-bold mt-0.5">3 şube • İstanbul</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="section-tight bg-subtle">
          <div className="container-app">
            <div className="text-center mb-12">
              <div className="text-neon text-sm font-semibold tracking-wider uppercase mb-3">Değerlerimiz</div>
              <h2 className="h-display text-3xl md:text-4xl">Bizi biz yapan şeyler</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {values.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="card-surface p-6 group hover:border-neon/20 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-neon/10 grid place-items-center mb-4 group-hover:bg-neon/20 transition-colors">
                    <Icon className="w-5 h-5 text-neon" />
                  </div>
                  <div className="font-semibold mb-2">{title}</div>
                  <div className="text-sm text-body leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="section">
          <div className="container-app">
            <div className="text-center mb-12">
              <div className="text-neon text-sm font-semibold tracking-wider uppercase mb-3">Ekibimiz</div>
              <h2 className="h-display text-3xl md:text-4xl">Uzmanlarla tanış</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {team.map((member) => (
                <div key={member.name} className="card-surface overflow-hidden text-center group hover:border-neon/20 transition-colors">
                  <div className="h-48 overflow-hidden">
                    <img
                      src={member.img}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-sm">{member.name}</div>
                    <div className="text-xs text-neon mt-1">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-tight">
          <div className="container-app max-w-2xl text-center">
            <div className="card-surface p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-accent-cyan/5 pointer-events-none" />
              <div className="relative">
                <h2 className="h-display text-3xl mb-4">Ailemize katıl</h2>
                <p className="text-body mb-7 text-sm leading-relaxed">
                  7 gün ücretsiz dene, fark hisset. Kredi kartı gerekmez.
                </p>
                <Link href="/kayit" className="btn-primary btn-lg">
                  Ücretsiz Başla <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
