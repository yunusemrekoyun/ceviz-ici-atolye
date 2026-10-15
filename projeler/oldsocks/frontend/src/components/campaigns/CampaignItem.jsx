// src/components/CampaignItem.jsx
import React from "react";
import PropTypes from "prop-types";

const CampaignItem = ({ image, title, buttonText, onClick }) => (
  <div
    onClick={onClick}
    className="relative group h-64 md:h-80 overflow-hidden rounded-lg cursor-pointer"
  >
    {/* Arka plan görseli */}
    <img
      src={image}
      alt={title}
      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
    />

    {/* Karartma katmanı */}
    <div className="absolute inset-0 bg-dark1/30 group-hover:bg-dark1/40 transition-colors duration-500" />

    {/* Metin & Buton */}
    <div className="absolute inset-0 flex flex-col justify-center items-start p-6">
      <h3 className="text-white text-lg md:text-xl font-semibold leading-snug">
        {title}
      </h3>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="mt-4 px-5 py-2 bg-dark3 hover:bg-dark2 text-white text-sm font-medium rounded transition"
      >
        {buttonText}
      </button>
    </div>
  </div>
);

CampaignItem.propTypes = {
  image: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  buttonText: PropTypes.string,
  onClick: PropTypes.func,
};

CampaignItem.defaultProps = {
  buttonText: "Detayları Gör",
  onClick: () => {},
};

export default CampaignItem;
