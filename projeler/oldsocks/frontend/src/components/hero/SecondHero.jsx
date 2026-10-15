// src/components/SecondHero.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"; // ← import ettik
import publicApi from "../../../publicApi";
import { getResponsiveImageProps } from "../../utils/media";

export default function SecondHero() {
  const [campaign, setCampaign] = useState(null);
  const navigate = useNavigate(); // ← navigate hook

  useEffect(() => {
    publicApi
      .get("/campaigns/active")
      .then(({ data }) => setCampaign(data))
      .catch((err) => console.error("Aktif kampanya alınamadı:", err));
  }, []);

  if (!campaign) return null;

  const { title, subtitle, buttonText, imageUrl, items } = campaign;
  const overlayOpacity = Math.max(0, Math.min(100, campaign.overlayOpacity ?? 0));
  const buttonOpacity = Math.max(0, Math.min(100, campaign.buttonOpacity ?? 30));
  const imageProps = getResponsiveImageProps(campaign.media || imageUrl, {
    widths: [640, 960, 1280, 1600, 1920],
    defaultWidth: 1280,
    sizes: "100vw",
  });

  // Telefonda görsel kırpılmasın: kutu görselin kendi oranında (yoksa 16:9). Tablet ve
  // masaüstünde yükseklik ekrana göre, eskisi gibi.
  const media = campaign.media || {};
  const ratio = Number(media.width) > 0 && Number(media.height) > 0 ? `${media.width} / ${media.height}` : "16 / 9";

  const handleClick = () => {
    // 2) /shop sayfasına yönlendir, state ile aktar
    navigate("/shop", {
      state: {
        campaignItems: items,
        campaignTitle: title || "Kampanya",
      },
    });
  };

  return (
    <section className="relative w-full">
      {/* Arka plan */}
      <div className="w-full overflow-hidden md:h-[70vh] lg:h-[80vh]" style={{ aspectRatio: ratio }}>
        <img
          src={imageProps.src}
          srcSet={imageProps.srcSet}
          sizes={imageProps.sizes}
          alt={title || "Kampanya görseli"}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>

      {overlayOpacity > 0 && <div className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: overlayOpacity / 100 }} />}

      {/* İçerik */}
      <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-3 text-center sm:pb-6 md:pb-12">
        {(title || subtitle) && (
          <div className="max-w-4xl bg-dark1/85 px-5 py-3 text-white">
            {title && <h2 className="font-playfair text-base font-bold uppercase leading-tight sm:text-2xl md:text-4xl">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs sm:text-sm md:text-lg">{subtitle}</p>}
          </div>
        )}
        <button
          onClick={handleClick}
          className="campaign-cta mt-2 rounded-full border border-white px-4 py-1 text-xs font-medium text-white sm:mt-3 sm:px-6 sm:py-2 sm:text-sm md:px-8 md:py-3 md:text-base backdrop-blur-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ "--button-opacity": buttonOpacity / 100 }}
        >
          {buttonText}
        </button>
      </div>
    </section>
  );
}
