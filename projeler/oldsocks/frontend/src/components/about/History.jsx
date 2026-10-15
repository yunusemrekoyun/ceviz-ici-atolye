// src/components/about/History.jsx
import React from "react";

const History = ({ content }) => (
  <section className="bg-light1 py-12 sm:py-20 px-4">
    <div className="container mx-auto text-center">
      <h2 className="text-4xl font-serif font-bold text-dark1 mb-4">
        {content?.heading || "2021 → 2025"}
      </h2>
      <p className="text-dark2 max-w-2xl mx-auto leading-relaxed whitespace-pre-line">
        {content?.body || "2021’de Kütahya’da küçük bir seçkiyle başlayan Oldsocks, sokak tarzını günlük hayata taşıyan rahat ve şık parçalara odaklandı. 2022’de çevrim içi satışa açılarak Instagram topluluğunu büyüttü; 2023’te fit ve malzeme kalitesini standart hâle getirip kapsül koleksiyonlara geçti. 2024’te yerli üretim partnerleriyle tedarik zincirini güçlendirdi, kalite kontrolünü sıkılaştırdı. 2025’te e‑ticaret altyapısını yenileyip Türkiye geneline daha hızlı teslimat ve daha zengin bir ürün gamı ile yayıldı. Bugün Oldsocks; rahat kesim, temiz çizgiler ve uzun ömürlü kumaş anlayışıyla, “şık ama zahmetsiz” erkek stilinin güvenilir adresi."}
      </p>
    </div>
  </section>
);

export default History;
