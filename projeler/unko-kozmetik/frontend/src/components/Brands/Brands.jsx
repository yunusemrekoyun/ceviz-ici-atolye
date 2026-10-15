import { useEffect, useState } from "react";
import "./Brands.css";

// Mağazada satılan markaların logoları (public/data/data.json) kayan şerit halinde
const Brands = () => {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    fetch("/data/data.json")
      .then((res) => res.json())
      .then((data) => setBrands(data.brands || []))
      .catch((err) => console.error("Marka verisi alınamadı", err));
  }, []);

  if (brands.length === 0) return null;

  return (
    <section className="section brands" aria-labelledby="brands-title">
      <div className="container">
        <div className="section-title">
          <span className="eyebrow">Markalarımız</span>
          <h2 id="brands-title">Güvendiğiniz profesyonel markalar</h2>
        </div>
      </div>
      <div className="brand-marquee">
        {/* Kesintisiz döngü için liste iki kez çizilir */}
        <ul className="brand-track">
          {[...brands, ...brands].map((brand, i) => (
            <li
              className="brand-logo"
              key={`${brand.id}-${i}`}
              aria-hidden={i >= brands.length}
            >
              <img
                src={`/${brand.img}`}
                alt={i < brands.length ? brand.name : ""}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Brands;
