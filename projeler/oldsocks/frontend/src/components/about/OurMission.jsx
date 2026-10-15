// src/components/about/OurMission.jsx
import React from "react";
import missionImg from "../../assets/about/mission.webp";
import { getResponsiveImageProps } from "../../utils/media";

const OurMission = ({ content }) => {
  const image = getResponsiveImageProps(content?.image || missionImg, { widths: [640, 960, 1440], defaultWidth: 1440, sizes: "(max-width: 768px) 100vw, 1200px" });
  return (
  <section className="py-12 sm:py-20 px-4">
    <div className="container mx-auto">
      <h2 className="text-4xl font-serif font-bold text-dark1 text-center mb-6">
        {content?.heading || "Misyonumuz"}
      </h2>
      <p className="text-center text-dark2 max-w-2xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
        {content?.body || "Günlük hayatta giyilebilir sokak stilini; iyi kalıp, kaliteli kumaş ve özenli işçilikle herkes için ulaşılabilir kılmak. Koleksiyonlarımızı zamansız parçalar etrafında kurgularken, müşterimize sadece kıyafet değil, tarz ve özgüven deneyimi sunmak. Kütahya’dan büyüyen yerel enerjimizi koruyup, dürüst fiyat politikası ve tutarlı kalite ile ulusal çapta sürdürülebilir bir marka kültürü inşa etmek."}
      </p>
      <div className="overflow-hidden rounded-xl shadow-lg">
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes={image.sizes}
          alt="Oldsocks Misyon"
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

export default OurMission;
