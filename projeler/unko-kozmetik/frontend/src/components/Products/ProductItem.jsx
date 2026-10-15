// frontend/src/components/Products/ProductItem.jsx
import PropTypes from "prop-types";
import { useState } from "react";
import { Link } from "react-router-dom";
import "./ProductItem.css";
import ProductDetailsModal from "../ProductDetails/ProductDetailsModal";
import { imageUrl } from "../../config/api";
import useBrandLabel from "../../hooks/useBrandLabel";
import { discountedPrice, formatPrice } from "../../utils/cart";

const ProductItem = ({ productItem }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const brandLabel = useBrandLabel();

  const originalPrice = productItem.price?.current ?? 0;
  const discountPercentage = productItem.price?.discount ?? 0;
  const finalPrice = discountedPrice(productItem.price);
  const reviewCount = productItem.reviewCount ?? 0;
  const [primary, secondary] = productItem.img || [];
  const href = `/product/${productItem._id}`;

  return (
    <article className="product-item">
      <div className="product-media">
        <Link
          to={href}
          className="product-image"
          tabIndex={-1}
          aria-hidden="true"
        >
          <img src={imageUrl(primary)} alt="" loading="lazy" />
          {secondary && (
            <img
              src={imageUrl(secondary)}
              alt=""
              loading="lazy"
              className="product-image-alt"
            />
          )}
        </Link>
        {discountPercentage > 0 && (
          <span className="badge-sale product-badge">
            -%{discountPercentage}
          </span>
        )}
        <button
          type="button"
          className="product-quick"
          onClick={() => setIsModalVisible(true)}
        >
          <i className="bi bi-eye" aria-hidden="true" /> Hızlı bakış
        </button>
      </div>

      <div className="product-info">
        {productItem.brand && (
          <span className="product-brand">{brandLabel(productItem.brand)}</span>
        )}
        <Link to={href} className="product-title">
          {productItem.name}
        </Link>
        {reviewCount > 0 && (
          <div
            className="product-rating"
            aria-label={`5 üzerinden ${productItem.averageRating.toFixed(
              1
            )} puan`}
          >
            <i className="bi bi-star-fill" aria-hidden="true" />
            {productItem.averageRating.toFixed(1)}
            <span>({reviewCount})</span>
          </div>
        )}
        <div className="product-prices price">
          <strong className={discountPercentage > 0 ? "is-sale" : ""}>
            {formatPrice(finalPrice)}
          </strong>
          {discountPercentage > 0 && <s>{formatPrice(originalPrice)}</s>}
        </div>
      </div>

      <ProductDetailsModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        productId={productItem._id}
      />
    </article>
  );
};

ProductItem.propTypes = {
  productItem: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    brand: PropTypes.string,
    img: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })),
    price: PropTypes.shape({
      current: PropTypes.number,
      discount: PropTypes.number,
    }),
    averageRating: PropTypes.number,
    reviewCount: PropTypes.number,
  }).isRequired,
};

export default ProductItem;
