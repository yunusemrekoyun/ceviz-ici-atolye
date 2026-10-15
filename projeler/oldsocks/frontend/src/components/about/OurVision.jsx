// src/components/about/OurVision.jsx
import React from "react";
import storyImg from "../../assets/about/vision.webp";
import { getResponsiveImageProps } from "../../utils/media";

const OurVision = ({ content }) => {
  const image = getResponsiveImageProps(content?.image || storyImg, { widths: [640, 960, 1440], defaultWidth: 1440, sizes: "(max-width: 768px) 100vw, 1200px" });
  return (
  <section className="bg-light1 py-12 sm:py-20 px-4">
    <div className="container mx-auto">
      <h2 className="text-4xl font-serif font-bold text-dark1 text-center mb-6">
        {content?.heading || "Vizyonumuz"}
      </h2>
      <p className="text-center text-dark2 max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
        {content?.body || "Oldsocks olarak amacımız; Kütahya’dan doğan sokak kültürü ve casual şıklığı, yüksek kalite ve özgün tasarımla birleştirip Türkiye’nin her yerine ulaştırmak. Erkek giyimde trendleri sadece takip eden değil, aynı zamanda belirleyen; zamansız, rahat ve karakterli bir stil anlayışını yaygınlaştıran ilham verici bir marka olmak."}
      </p>
      <div className="overflow-hidden rounded-xl shadow-lg">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt="Oldsocks Vizyon"
          loading="lazy"
          decoding="async"
          width="1200"
          height="1600"
          className="w-full h-[600px] object-cover object-center"
        />
      </div>
    </div>
  </section>
  );
};

export default OurVision;
