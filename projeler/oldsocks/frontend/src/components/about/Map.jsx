// src/components/Map.jsx
import React from "react";
import ExternalContentGate from "../privacy/ExternalContentGate";

const Map = ({ address = "Alipaşa, Üçbey Sk. No:7, 43020 Kütahya Merkez/Kütahya" }) => {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(
    address
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden shadow-lg">
      <ExternalContentGate service="Google Haritalar" what="Harita" className="h-full">
        <iframe
          title="Mağaza konumu (Google Haritalar)"
          src={src}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
        />
      </ExternalContentGate>
    </div>
  );
};

export default Map;
