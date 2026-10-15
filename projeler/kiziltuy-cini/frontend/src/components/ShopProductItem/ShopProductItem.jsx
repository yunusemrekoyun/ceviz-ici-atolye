import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { message } from "antd";
import ShareModal from "../Modals/Share/ShareModal";
import "./ShopProductItem.css";

const ShopProductItem = ({ product }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId = storedUser?._id || storedUser?.id;

  const [showShare, setShowShare] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    if (!userId || !storedUser?.favorites) return;
    setIsFavorite(storedUser.favorites.includes(product._id));
  }, [storedUser, product._id, userId]);

  const toggleFavorite = async () => {
    if (!userId) {
      message.warning("Favorilere eklemek için giriş yapmalısınız.");
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/favorites/${product._id}`,
        { method: "POST" }
      );
      const data = await res.json();
      setIsFavorite(data.favorites.includes(product._id));
      setAnimateHeart(true);
      setTimeout(() => setAnimateHeart(false), 300);

      const updatedUser = { ...storedUser, favorites: data.favorites };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Favori işlemi hatası:", err);
    }
  };

  return (
    <div className="shop-product-item">
      <div className="shop-product-image">
        <Link to={`/product/${product._id}`}>
          <img
            src={`${apiUrl}/api/products/${product._id}/image/mainImages/0`}
            alt={product.name}
            loading="lazy"
          />
        </Link>
      </div>
      <div className="shop-product-info">
        <Link to={`/product/${product._id}`} className="shop-product-title">
          {product.name}
        </Link>

        <div className="shop-product-links">
          <button
            onClick={toggleFavorite}
            className={`heart-button ${animateHeart ? "animate" : ""}`}
          >
            <i
              className="bi bi-heart-fill heart-icon"
              style={{ color: isFavorite ? "#d8363a" : "#ccc" }}
            ></i>
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowShare(true);
            }}
          >
            <i className="bi bi-share-fill"></i>
          </a>
          <ShareModal
            isOpen={showShare}
            onClose={() => setShowShare(false)}
            shareUrl={`${window.location.origin}/product/${product._id}`}
          />
        </div>
      </div>
    </div>
  );
};

ShopProductItem.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default ShopProductItem;
