import React from "react";
import PropTypes from "prop-types";

const CategoryItem = ({ image, alt, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group w-full overflow-hidden rounded-xl cursor-pointer border border-light2 bg-white text-left shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-dark1 transition duration-300 flex flex-col"
  >
    {/* Görsel: ad aşağıda yazdığı için alt metin boş */}
    <span className="block h-72 w-full overflow-hidden">
      <img
        src={image}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transform group-hover:scale-105 transition duration-300"
      />
    </span>

    {/* Başlık */}
    <span className="block w-full py-3 px-4 text-center bg-light1 text-dark1 font-semibold text-sm uppercase tracking-wide group-hover:underline">
      {alt}
    </span>
  </button>
);

CategoryItem.propTypes = {
  image: PropTypes.string.isRequired,
  alt: PropTypes.string,
  onClick: PropTypes.func,
};

CategoryItem.defaultProps = {
  alt: "",
  onClick: () => {},
};

export default CategoryItem;