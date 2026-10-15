import PropTypes from "prop-types";
import "./Info.css";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CartContext from "../../../context/CartContext";
import useBrandLabel from "../../../hooks/useBrandLabel";
import { discountedPrice, formatPrice } from "../../../utils/cart";

// Renkler "#ff0000" gibi CSS rengi ya da "Kumral" gibi isim olabilir
const isCssColor = (value) =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("color", value);

const Stars = ({ rating }) => (
  <span className="stars" aria-hidden="true">
    {[1, 2, 3, 4, 5].map((n) => (
      <i
        key={n}
        className={`bi ${
          rating >= n
            ? "bi-star-fill"
            : rating >= n - 0.5
            ? "bi-star-half"
            : "bi-star"
        }`}
      />
    ))}
  </span>
);

Stars.propTypes = { rating: PropTypes.number.isRequired };

const Info = ({ singleProduct, compact = false }) => {
  const { addToCart } = useContext(CartContext);
  const brandLabel = useBrandLabel();

  const originalPrice = singleProduct.price?.current ?? 0;
  const discountPercentage = singleProduct.price?.discount ?? 0;
  const finalPrice = discountedPrice(singleProduct.price);

  const colors = Array.isArray(singleProduct.colors)
    ? singleProduct.colors
    : [];
  const sizes = Array.isArray(singleProduct.sizes) ? singleProduct.sizes : [];

  // Tek seçenek varsa otomatik seçilir
  const [selectedColor, setSelectedColor] = useState(
    colors.length === 1 ? colors[0] : ""
  );
  const [selectedSize, setSelectedSize] = useState(
    sizes.length === 1 ? sizes[0] : ""
  );
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [colorError, setColorError] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!addedToCart) return;
    const timer = setTimeout(() => setAddedToCart(false), 2500);
    return () => clearTimeout(timer);
  }, [addedToCart]);

  const averageRating = singleProduct.averageRating ?? 0;
  const reviewsCount =
    singleProduct.reviewCount ?? singleProduct.reviews?.length ?? 0;

  const changeQuantity = (value) =>
    setQuantity(Math.max(1, Math.min(99, parseInt(value, 10) || 1)));

  const handleAddToCart = () => {
    const colorMissing = colors.length > 0 && !selectedColor;
    const sizeMissing = sizes.length > 0 && !selectedSize;
    setColorError(colorMissing);
    setSizeError(sizeMissing);
    if (colorMissing || sizeMissing) return;

    addToCart({
      _id: singleProduct._id,
      name: singleProduct.name,
      brand: singleProduct.brand,
      image: singleProduct.img?.[0]?.url,
      price: finalPrice,
      quantity,
      ...(selectedColor && { selectedColor }),
      ...(selectedSize && { selectedSize }),
    });

    setAddedToCart(true);
  };

  return (
    <div className="product-summary">
      {singleProduct.brand && (
        <Link
          to={`/shop?brand=${encodeURIComponent(singleProduct.brand)}`}
          className="eyebrow summary-brand"
        >
          {brandLabel(singleProduct.brand)}
        </Link>
      )}

      <h1 className="summary-title">{singleProduct.name}</h1>

      {reviewsCount > 0 && (
        <a href="#reviews" className="summary-rating">
          <Stars rating={averageRating} />
          <span>
            {averageRating.toFixed(1)} · {reviewsCount} değerlendirme
          </span>
        </a>
      )}

      <div className="summary-price price">
        <strong className={discountPercentage > 0 ? "is-sale" : ""}>
          {formatPrice(finalPrice)}
        </strong>
        {discountPercentage > 0 && (
          <>
            <s>{formatPrice(originalPrice)}</s>
            <span className="badge-sale">-%{discountPercentage}</span>
          </>
        )}
      </div>
      {discountPercentage > 0 && (
        <p className="summary-saving">
          {formatPrice(originalPrice - finalPrice)} tasarruf ediyorsunuz
        </p>
      )}

      {colors.length > 0 && (
        <div className="summary-option colors">
          <p className="option-label">
            Renk{selectedColor && <span>: {selectedColor}</span>}
          </p>
          <div className="option-values">
            {colors.map((color) => {
              const swatch = isCssColor(color);
              return (
                <button
                  key={color}
                  type="button"
                  title={color}
                  aria-pressed={selectedColor === color}
                  className={`color-button ${
                    swatch ? "is-swatch" : "color-button--text"
                  } ${selectedColor === color ? "active" : ""}`}
                  style={swatch ? { backgroundColor: color } : undefined}
                  onClick={() => {
                    setSelectedColor(color);
                    setColorError(false);
                  }}
                >
                  {!swatch && color}
                </button>
              );
            })}
          </div>
          {colorError && (
            <p className="error-message" role="alert">
              Lütfen bir renk seçin.
            </p>
          )}
        </div>
      )}

      {sizes.length > 0 && (
        <div className="summary-option sizes">
          <p className="option-label">
            Boyut{selectedSize && <span>: {selectedSize}</span>}
          </p>
          <div className="option-values">
            {sizes.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={selectedSize === size}
                className={`size-button ${
                  selectedSize === size ? "active" : ""
                }`}
                onClick={() => {
                  setSelectedSize(size);
                  setSizeError(false);
                }}
              >
                {size}
              </button>
            ))}
          </div>
          {sizeError && (
            <p className="error-message" role="alert">
              Lütfen bir boyut seçin.
            </p>
          )}
        </div>
      )}

      <div className="cart-button">
        <div className="qty-stepper">
          <button
            type="button"
            aria-label="Adedi azalt"
            onClick={() => changeQuantity(quantity - 1)}
            disabled={quantity <= 1}
          >
            <i className="bi bi-dash" />
          </button>
          <input
            type="number"
            min="1"
            max="99"
            value={quantity}
            aria-label="Adet"
            onChange={(e) => changeQuantity(e.target.value)}
          />
          <button
            type="button"
            aria-label="Adedi arttır"
            onClick={() => changeQuantity(quantity + 1)}
            disabled={quantity >= 99}
          >
            <i className="bi bi-plus" />
          </button>
        </div>
        <button
          type="button"
          className={`btn btn-primary btn-lg add-to-cart ${
            addedToCart ? "added" : ""
          }`}
          onClick={handleAddToCart}
        >
          {addedToCart ? (
            <>
              <i className="bi bi-check2" /> Sepete eklendi
            </>
          ) : (
            "Sepete ekle"
          )}
        </button>
      </div>
      {addedToCart && (
        <Link to="/cart" className="summary-cart-link link-arrow">
          Sepete git <i className="bi bi-arrow-right" />
        </Link>
      )}

      <ul className="summary-perks">
        <li>
          <i className="bi bi-truck" aria-hidden="true" />
          1750 ₺ ve üzeri siparişlerde ücretsiz kargo
        </li>
        <li>
          <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
          Açılmamış ürünlerde 14 gün içinde iade
        </li>
      </ul>

      {singleProduct.description && (
        <div className="summary-description">
          <h2>Ürün hakkında</h2>
          <p>{singleProduct.description}</p>
        </div>
      )}

      {compact && (
        <Link
          to={`/product/${singleProduct._id}`}
          className="link-arrow summary-more"
        >
          Ürün sayfasına git <i className="bi bi-arrow-right" />
        </Link>
      )}
    </div>
  );
};

Info.propTypes = {
  singleProduct: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
    brand: PropTypes.string,
    img: PropTypes.arrayOf(PropTypes.shape({ url: PropTypes.string })),
    price: PropTypes.shape({
      current: PropTypes.number,
      discount: PropTypes.number,
    }),
    colors: PropTypes.arrayOf(PropTypes.string),
    sizes: PropTypes.arrayOf(PropTypes.string),
    reviews: PropTypes.array,
    reviewCount: PropTypes.number,
    averageRating: PropTypes.number,
    description: PropTypes.string,
  }).isRequired,
  compact: PropTypes.bool,
};

export default Info;
