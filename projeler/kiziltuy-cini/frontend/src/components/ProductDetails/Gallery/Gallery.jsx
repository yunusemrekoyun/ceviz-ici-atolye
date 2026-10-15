import { useState } from "react";
import PropTypes from "prop-types";
import "./Gallery.css";

const Gallery = ({ singleProduct }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const renderImageUrl = (index) =>
    `${apiUrl}/api/products/${singleProduct._id}/image/${index}`;

  const total = singleProduct.img.length;

  // max 3 göster, seçili olan en sola geçsin
  const displayIndices = [
    activeIndex,
    ...[...Array(total).keys()].filter((i) => i !== activeIndex).slice(0, 2),
  ];

  return (
    <div className="horizontal-gallery">
      {displayIndices.map((index, i) => (
        <div
          key={index}
          className={`gallery-image-wrapper ${
            i === 0 ? "main" : i === 1 ? "medium" : "small"
          }`}
          onClick={() => setActiveIndex(index)}
        >
          <img
            src={renderImageUrl(index)}
            alt={`Product Image ${index}`}
            className="gallery-image"
          />
        </div>
      ))}
    </div>
  );
};

Gallery.propTypes = {
  singleProduct: PropTypes.shape({
    name: PropTypes.string,
    _id: PropTypes.string.isRequired,
    img: PropTypes.array.isRequired,
  }).isRequired,
};

export default Gallery;
