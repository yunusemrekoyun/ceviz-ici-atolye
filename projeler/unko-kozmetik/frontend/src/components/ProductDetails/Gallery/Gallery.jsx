import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { imageUrl } from "../../../config/api";
import "./Gallery.css";

const Gallery = ({ singleProduct }) => {
  const images = singleProduct.img || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  // Ürün değişince ilk görsele dön
  useEffect(() => {
    setActiveIndex(0);
    setZoomed(false);
  }, [singleProduct._id]);

  if (images.length === 0) return null;

  const show = (index) => {
    setActiveIndex((index + images.length) % images.length);
    setZoomed(false);
  };

  const handleZoom = (e) => {
    if (!zoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setOrigin(`${x}% ${y}%`);
    }
    setZoomed((z) => !z);
  };

  return (
    <div className="product-gallery">
      <div className="gallery-main">
        <img
          src={imageUrl(images[activeIndex] || images[0])}
          id="single-image"
          alt={singleProduct.name || "Ürün görseli"}
          onClick={handleZoom}
          className={zoomed ? "is-zoomed" : ""}
          style={{ transformOrigin: origin }}
        />
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-arrow is-prev"
              aria-label="Önceki görsel"
              onClick={() => show(activeIndex - 1)}
            >
              <i className="bi bi-chevron-left" />
            </button>
            <button
              type="button"
              className="gallery-arrow is-next"
              aria-label="Sonraki görsel"
              onClick={() => show(activeIndex + 1)}
            >
              <i className="bi bi-chevron-right" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="gallery-thumbs">
          {images.map((imageObj, index) => (
            <button
              type="button"
              key={imageObj._id || index}
              className={`gallery-thumb ${
                activeIndex === index ? "active" : ""
              }`}
              aria-label={`${index + 1}. görsel`}
              aria-current={activeIndex === index}
              onClick={() => show(index)}
            >
              <img src={imageUrl(imageObj)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

Gallery.propTypes = {
  singleProduct: PropTypes.object.isRequired,
};

export default Gallery;
