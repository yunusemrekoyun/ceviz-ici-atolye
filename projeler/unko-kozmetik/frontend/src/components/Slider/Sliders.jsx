import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Sliders.css";

const SLIDES = [
  {
    eyebrow: "Olaplex",
    title: "Yıpranmış saça bağ onarıcı bakım",
    text: "Boya ve ısıyla yorulan saçlar için Olaplex serisi mağazamızda.",
    cta: "Olaplex ürünleri",
    to: "/shop?brand=olaplex",
    image: "/img/slider/slider1.jpg",
    alt: "Olaplex saç bakım ürünleri",
    // Beyaz zeminli ürün fotoğrafı; zemin rengiyle kaynaşsın
    packshot: true,
  },
  {
    eyebrow: "Keune Care",
    title: "İnce tellere hafif hacim",
    text: "Absolute Volume şampuan ve Satin Oil kremle salon bakımı evde.",
    cta: "Keune'yi keşfet",
    to: "/shop?brand=keune",
    image: "/img/site/hero-keune.jpg",
    alt: "Keune Care şampuan ve saç kremi",
  },
  {
    eyebrow: "Profesyonel bakım",
    title: "Salon kalitesi, evinizde",
    text: "Saç bakımından şekillendirme cihazlarına, kuaförlerin tercih ettiği ürünler.",
    cta: "Alışverişe başla",
    to: "/shop",
    image: "/img/site/hero-salon.jpg",
    alt: "Dalgalı saçlarını düzelten kadın",
  },
];

const INTERVAL = 7000;

const Sliders = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index) => {
    setCurrent((index + SLIDES.length) % SLIDES.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => goTo(current + 1), INTERVAL);
    return () => clearTimeout(timer);
  }, [current, paused, goTo]);

  const slide = SLIDES[current];

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Öne çıkanlar"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container hero-inner">
        <div className="hero-copy" key={current}>
          <span className="eyebrow">{slide.eyebrow}</span>
          <h1 className="hero-title">{slide.title}</h1>
          <p className="hero-text">{slide.text}</p>
          <div className="hero-actions">
            <Link to={slide.to} className="btn btn-primary btn-lg">
              {slide.cta}
            </Link>
            <Link to="/shop?discounted=true" className="link-arrow">
              İndirimdekiler <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>

        <div className="hero-media">
          {SLIDES.map((s, i) => (
            <img
              key={s.image}
              src={s.image}
              alt={s.alt}
              className={`hero-image ${s.packshot ? "is-packshot" : ""} ${
                i === current ? "is-active" : ""
              }`}
              aria-hidden={i !== current}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}

          <div className="hero-controls">
            <span className="hero-counter">
              {String(current + 1).padStart(2, "0")}
              <span> / {String(SLIDES.length).padStart(2, "0")}</span>
            </span>
            <div className="hero-dots">
              {SLIDES.map((s, i) => (
                <button
                  key={s.eyebrow}
                  type="button"
                  className={`hero-dot ${i === current ? "is-active" : ""} ${
                    paused ? "is-paused" : ""
                  }`}
                  aria-label={`${i + 1}. slayta git: ${s.eyebrow}`}
                  aria-current={i === current}
                  onClick={() => goTo(i)}
                >
                  <span style={{ animationDuration: `${INTERVAL}ms` }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Sliders;
