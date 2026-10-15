import PropTypes from "prop-types";
import { useContext } from "react";
import { Link } from "react-router-dom";
import CartContext from "../../context/CartContext";
import { imageUrl } from "../../config/api";
import useBrandLabel from "../../hooks/useBrandLabel";
import { cartItemKey, formatPrice } from "../../utils/cart";
import "./CartItem.css";

const CartItem = ({ cartItem }) => {
  const { removeFromCart, updateCartItemQuantity } = useContext(CartContext);
  const brandLabel = useBrandLabel();
  const key = cartItemKey(cartItem);
  const href = `/product/${cartItem._id}`;

  const handleIncrease = () =>
    updateCartItemQuantity(key, cartItem.quantity + 1);
  const handleDecrease = () =>
    cartItem.quantity > 1
      ? updateCartItemQuantity(key, cartItem.quantity - 1)
      : removeFromCart(key);

  return (
    <li className="cart-item">
      <Link to={href} className="cart-image" tabIndex={-1} aria-hidden="true">
        {cartItem.image && <img src={imageUrl(cartItem.image)} alt="" />}
      </Link>

      <div className="cart-item-info">
        {cartItem.brand && (
          <span className="cart-item-brand">{brandLabel(cartItem.brand)}</span>
        )}
        <Link to={href} className="cart-item-name">
          {cartItem.name}
        </Link>
        <p className="product-options">
          {[
            cartItem.selectedColor && `Renk: ${cartItem.selectedColor}`,
            cartItem.selectedSize && `Boyut: ${cartItem.selectedSize}`,
            `Birim fiyat: ${formatPrice(cartItem.price)}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <button
          type="button"
          className="cart-remove"
          onClick={() => removeFromCart(key)}
        >
          <i className="bi bi-trash3" aria-hidden="true" /> Kaldır
        </button>
      </div>

      <div className="qty-stepper cart-qty">
        <button type="button" onClick={handleDecrease} aria-label="Adedi azalt">
          <i
            className={`bi ${cartItem.quantity > 1 ? "bi-dash" : "bi-trash3"}`}
          />
        </button>
        <span className="quantity-text" aria-live="polite">
          {cartItem.quantity}
        </span>
        <button
          type="button"
          onClick={handleIncrease}
          disabled={cartItem.quantity >= 99}
          aria-label="Adedi arttır"
        >
          <i className="bi bi-plus" />
        </button>
      </div>

      <p className="product-subtotal price">
        {formatPrice(cartItem.price * cartItem.quantity)}
      </p>
    </li>
  );
};

CartItem.propTypes = {
  cartItem: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    brand: PropTypes.string,
    image: PropTypes.string,
    price: PropTypes.number,
    quantity: PropTypes.number,
    selectedColor: PropTypes.string,
    selectedSize: PropTypes.string,
  }).isRequired,
};

export default CartItem;
