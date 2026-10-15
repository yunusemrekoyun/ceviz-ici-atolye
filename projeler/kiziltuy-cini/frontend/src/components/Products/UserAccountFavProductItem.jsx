// /Applications/Works/Mustafa Çini MERN site/frontend/src/components/Products/UserAccountFavProductItem.jsx

import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import "./UserAccountFavProductItem.css";

const UserAccountFavProductItem = ({ product, onRemove }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleRemove = async (e) => {
    e.preventDefault(); // Link'e tıklanmasını engelle
    if (!onRemove) return;
    await onRemove(product._id);
  };

  return (
    <div className="fav-product-item">
      <Link to={`/product/${product._id}`} className="fav-product-link">
        <div className="fav-product-image">
          <img
            src={`${apiUrl}/api/products/${product._id}/image/mainImages/0`}
            alt={product.name}
            loading="lazy"
          />
        </div>
        <div className="fav-product-name">{product.name}</div>
      </Link>
      <button className="remove-fav-btn" onClick={handleRemove}>
        Favoriden Kaldır
      </button>
    </div>
  );
};

UserAccountFavProductItem.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  onRemove: PropTypes.func,
};

export default UserAccountFavProductItem;
