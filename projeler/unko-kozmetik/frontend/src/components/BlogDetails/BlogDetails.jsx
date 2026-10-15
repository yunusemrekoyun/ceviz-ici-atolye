import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./BlogDetails.css";

const VALUES = [
  {
    icon: "bi-stars",
    title: "Profesyonel markalar",
    text: "Kuaförlerin salonda kullandığı markaları evdeki bakımınıza taşıyoruz.",
  },
  {
    icon: "bi-shop",
    title: "Mağaza ve online",
    text: "Eryaman'daki mağazamıza uğrayın ya da siparişinizi online verin.",
  },
  {
    icon: "bi-truck",
    title: "Ücretsiz kargo",
    text: "1750 ₺ ve üzeri siparişlerde kargo bizden.",
  },
];

// "Hakkımızda" sayfası: tanıtım + çalıştığımız markalar
const BlogDetails = () => {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    fetch("/data/data.json")
      .then((res) => res.json())
      .then((data) => setBrands(data.brands || []))
      .catch((err) => console.error("Marka verisi alınamadı", err));
  }, []);

  return (
    <div className="about">
      <section className="container about-hero">
        <div className="about-copy">
          <span className="eyebrow">Hakkımızda</span>
          <h1 className="page-title">
            Eryaman&apos;da profesyonel bakımın adresi
          </h1>
          <p>
            ÜnKo Kozmetik, Ankara Eryaman&apos;daki mağazasında ve online olarak
            profesyonel saç bakımı, cilt bakımı ve şekillendirme ürünleri sunar.
          </p>
          <p>
            Kuaförlerin tercih ettiği markaları evinizde de kullanabilmeniz için
            ürün yelpazemizi özenle seçiyor, sorularınızda mağazamızda ve
            telefonda yanınızda oluyoruz.
          </p>
          <div className="about-actions">
            <Link to="/shop" className="btn btn-primary btn-lg">
              Ürünleri incele
            </Link>
            <Link to="/contact" className="link-arrow">
              Mağazamızı ziyaret edin <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
        <div className="about-media">
          <img
            src="/img/site/about-salon.jpg"
            alt="Yuvarlak aynalı ve siyah koltuklu modern bir kuaför salonu"
            className="about-media-main"
          />
          <img
            src="/img/site/about-stylist.jpg"
            alt="Gülümseyen kuaför müşterisinin saçını fönlüyor"
            className="about-media-inset"
            loading="lazy"
          />
        </div>
      </section>

      <section className="container about-values" aria-label="Neden ÜnKo">
        {VALUES.map((v) => (
          <div className="about-value" key={v.title}>
            <i className={`bi ${v.icon}`} aria-hidden="true" />
            <h2>{v.title}</h2>
            <p>{v.text}</p>
          </div>
        ))}
      </section>

      {brands.length > 0 && (
        <section className="section about-brands">
          <div className="container">
            <div className="section-title">
              <span className="eyebrow">Markalarımız</span>
              <h2>Birlikte çalıştığımız markalar</h2>
            </div>
            <ul className="brand-grid">
              {brands.map((brand) => (
                <li className="brand-cell" key={brand.id}>
                  <img src={`/${brand.img}`} alt={brand.name} loading="lazy" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
};

export default BlogDetails;
